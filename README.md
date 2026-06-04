# SyncSpace

**A real-time collaborative whiteboard where the server never merges anything.**

Open a room, share the link, and draw together — pen strokes, sticky notes, and
shapes appear for everyone instantly, cursors and all. Lose your connection and
keep working; your edits sync back the moment you're online again.

The interesting part isn't the whiteboard. It's that **there is no merge logic on
the backend.** Conflict resolution lives entirely client-side in a CRDT, so the
server is reduced to two boring jobs: relay opaque bytes between clients, and
store opaque bytes durably. No locks, no operational transforms on a server, no
"last save wins" data loss — just math that guarantees everyone converges.

> **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Supabase
> (Postgres + RLS · Realtime · Auth · Edge Functions) · Yjs CRDT · y-indexeddb ·
> HTML5 Canvas · Tailwind v4

---

## Why it's built this way

Most collaborative apps put the hard part on the server: a service that receives
edits, resolves conflicts, and writes the canonical state. That server is the
thing that's hard to scale, hard to make offline-tolerant, and easy to lose data
in.

SyncSpace pushes the hard part to the edge instead. Every client holds a full
copy of the document as a **CRDT** (Conflict-free Replicated Data Type via
[Yjs](https://github.com/yjs/yjs)). CRDTs have a mathematical property: apply the
same set of updates in any order, on any client, and you land on identical state.
That single property cascades into the whole design:

- **No backend merge code** — the server is document-agnostic. It moves bytes.
- **Offline is free** — a disconnected client is just a client whose updates
  haven't propagated *yet*. When it reconnects, the same merge runs.
- **No bespoke API tier** — clients talk straight to Postgres and Realtime, with
  **Row-Level Security** as the only authorization boundary.

The cost of this approach is a different set of trade-offs (trust, fan-out, and
durability timing), covered honestly in [Trade-offs](#trade-offs) below.

---

## How it works

### The document lives in three places

Each room is one Yjs document. Shapes are stored in a top-level `Y.Map` keyed by
id; each shape is itself a nested `Y.Map` (so position and color are
last-writer-wins *per field*), and a sticky note's text is a `Y.Text` — a real
collaborative-text CRDT, so two people can type into the same note and merge
character by character.

That one document is mirrored across three layers:

```
┌──────────────── Browser (Next.js client) ─────────────────┐
│                                                            │
│   HTML5 Canvas  ──renders──►  Yjs Doc  ◄──►  IndexedDB     │
│                                  │         (offline cache) │
│                                  │ binary updates          │
│                                  ▼                          │
│   SupabaseProvider ──broadcast──►   Presence channel       │
│        │                            (cursors, names)       │
└────────┼───────────────────────────────────────────────────┘
         │ opaque Yjs bytes
         ▼
┌────────────────────────── Supabase ───────────────────────┐
│  Realtime (broadcast + presence)   Auth (magic link)       │
│  Postgres + RLS:                   Edge Function:          │
│    rooms · room_members              compact-room          │
│    room_snapshots · room_updates                           │
│    profiles · room_access_requests                         │
└────────────────────────────────────────────────────────────┘
```

1. **IndexedDB — local-first.** The cached doc loads instantly on open and every
   edit is written locally first. This is what makes the canvas feel immediate and
   what makes offline editing work at all.

2. **Realtime — live sync.** A custom `SupabaseProvider` listens for local Yjs
   updates, base64-encodes the binary diff, and broadcasts it on a per-room
   channel. Peers apply it and converge. On every (re)connect it runs a two-way
   sync handshake — exchanging state vectors so a returning client both catches up
   *and* re-pushes anything its peers missed while it was gone.

3. **Postgres — durability.** Rather than rewriting a blob on every edit, the doc
   is persisted as a **snapshot plus an append-only log**: `room_snapshots` holds
   compacted state, `room_updates` collects new diffs. Writes are cheap appends;
   new joiners bootstrap by replaying snapshot-then-log.

### Keeping it fast and lean

- **Echo loops and undo** are both solved by Yjs *origins* — local edits are
  tagged, remote/replayed updates are ignored by the broadcaster, and undo only
  rewinds your own actions.
- **Cursors get their own channel.** Presence (who's here) and cursor positions
  are broadcast separately from the document, throttled to ~30 Hz, so high-
  frequency pointer movement never bloats the persisted edit log.
- **Compaction.** A Deno edge function (`compact-room`) folds the append-log back
  into the snapshot once the log crosses a threshold, keeping bootstrap cheap. It
  writes the new snapshot *before* deleting the folded rows, which makes it
  idempotent — a crash mid-run simply re-folds next time.
- **Graceful degradation.** Everything backend-touching is gated behind a config
  check, so with no environment variables the app still runs as a fully local,
  single-player whiteboard.

---

## Features

- **Multiplayer canvas** — freehand pen, sticky notes with live collaborative
  text, rectangles, ellipses; select, drag, resize, reorder, recolor, delete; and
  per-user undo/redo.
- **Live presence** — everyone's cursor with name and color, eased and kept
  aligned at any pan/zoom level.
- **Conflict-free by construction** — concurrent edits merge deterministically;
  no locks and no lost work.
- **Offline-first** — keep drawing with no connection; edits queue locally and a
  connection badge makes the state (Live / Reconnecting / Offline) explicit.
- **Shareable rooms** — tokenized invite links add visitors as editors; the owner
  can regenerate the token to revoke access, and non-members get a "request
  access" flow the owner can approve.
- **Room admin** — rename, member list with removal, and soft-delete.
- **Passwordless auth** — magic-link sign-in with a per-user profile.
- **Mobile-ready** — pointer-events drawing, pinch-zoom, two-finger pan, and a
  touch-friendly toolbar.

---

## Tech stack & rationale

| Area | Choice | Why |
|---|---|---|
| Sync | **Yjs (CRDT)** + y-indexeddb | Convergence guarantees remove server merge logic and make offline trivial |
| Backend | **Supabase** | Postgres + Realtime + Auth + Edge Functions in one platform, no custom server |
| Authz | **Row-Level Security** | The security boundary lives in the database, so the client can talk to it directly |
| Framework | **Next.js 16 / React 19** | App Router, server actions for room mutations, edge middleware for session refresh |
| Rendering | **HTML5 Canvas** | Direct imperative drawing with an explicit world↔screen transform for pan/zoom |
| Styling | **Tailwind v4** + Radix primitives | Fast, consistent UI with accessible building blocks |

Notable modules: `src/lib/yjs/` (doc, provider, persistence, undo, encoding),
`src/lib/canvas/` (viewport, render, hit-test, tools), `src/lib/presence/`, and
the `compact-room` edge function under `supabase/functions/`.

---

## Trade-offs

Deliberate v1 decisions, stated plainly:

- **Trust model is "any room member is trusted."** Realtime broadcasts aren't
  server-validated, so the system trusts members not to broadcast malicious doc
  mutations. There's no server authority over content.
- **Durability is tied to the originating client's flush.** Peers don't re-persist
  updates they receive (to avoid N redundant writes), so a brand-new edit is fully
  durable in Postgres only after its author's short debounced flush — it lives in
  peers' live docs and the author's IndexedDB in the meantime.
- **Broadcast fan-out doesn't scale to large rooms.** Every client sends to every
  peer; comfortable for small teams (~25 users/room on the free tier), not for
  hundreds of concurrent editors.
- **Per-field last-writer-wins** for geometry, color, and z-order — two
  simultaneous "bring to front" actions may settle the wrong way. Note *text*
  avoids this entirely via `Y.Text`.
- **Scope:** magic-link-only auth, light theme only, and no image paste / export /
  multi-select / grouping in v1.

---

## Setup

Node 20+, pnpm, and a Supabase project.

```bash
pnpm install && pnpm dev   # http://localhost:3000
```

`.env.local` needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
and `NEXT_PUBLIC_SITE_URL`. Apply `supabase/migrations/*.sql`, then add
`<site-url>/auth/callback` under **Supabase → Auth → URL Configuration**.
Without Supabase configured, the app still boots as a local-only whiteboard.

`pnpm test` (Vitest) · `pnpm test:e2e` (Playwright, needs `SUPABASE_SERVICE_ROLE_KEY`) · `pnpm typecheck` · `pnpm lint`.
