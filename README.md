# SyncSpace

A real-time, multi-user collaborative whiteboard. Draw with pen, sticky notes,
rectangles and ellipses on a pannable/zoomable canvas where every operation
merges deterministically across users, survives reloads, and recovers from
disconnects.

Built to demonstrate **distributed state, CRDT conflict resolution, presence,
and offline reconciliation** end to end.

> Stack: Next.js 16 (App Router) · TypeScript · Supabase (Auth · Realtime ·
> Postgres · Edge Functions) · Yjs (CRDT) · y-indexeddb · HTML5 Canvas ·
> Tailwind v4 / shadcn

---

## Features

- **Live multi-user canvas** — pen, sticky notes, rectangles, ellipses; select,
  drag, resize, bring-to-front / send-to-back, delete; per-user undo/redo.
- **Presence cursors** — see who's online with their name and color; cursors are
  broadcast at 30 Hz in world coordinates and eased, so they stay aligned at any
  pan/zoom.
- **CRDT conflict resolution** — concurrent edits merge via Yjs with no
  server-side merge logic. Same-shape drags resolve last-writer-wins; same-note
  typing merges character-by-character via `Y.Text`.
- **Offline-first** — local writes hit an in-browser Yjs doc + IndexedDB
  immediately and queue while offline; on reconnect Yjs's diff sync reconciles
  automatically. A connection badge makes the state (Live / Reconnecting /
  Offline) explicit.
- **Shareable rooms** — tokenized invite links (`/r/{roomId}?t={token}`) add the
  visitor as an editor; the owner can regenerate the token to revoke access.
  Non-members get a "Request access" page that the owner can approve.
- **Room admin** — rename, member list with kick, soft-delete.
- **Mobile** — pointer-events drawing, pinch-zoom, two-finger pan, a
  scrollable/touch-friendly toolbar.

---

## Architecture

```
┌─────────── Browser (Next.js client) ───────────┐
│  Canvas (HTML5 Canvas, world ↔ screen tx)      │
│  Yjs Doc  ◄─►  y-indexeddb (offline cache)     │
│      ▲                                         │
│      │ updates (Uint8Array, batched)           │
│      ▼                                         │
│  SupabaseProvider ──── broadcast ────►──┐      │
│  Presence channel (cursor x,y, name)    │      │
│  performance marks (hot-path timing)    │      │
└─────────────────────────────────────────┼──────┘
                                          │
                       ┌──────────────────▼───────────────────┐
                       │  Supabase                            │
                       │  - Realtime (broadcast + presence)   │
                       │  - Auth (magic link)                 │
                       │  - Postgres: profiles, rooms,        │
                       │    room_members, room_snapshots,     │
                       │    room_updates, room_access_requests│
                       │  - Edge Function: compact-room       │
                       └──────────────────────────────────────┘
```

- **Yjs is the source of truth** for shape state; the canvas is a pure renderer
  over `ydoc.getMap('shapes')`. Each shape is a nested `Y.Map`, so position is
  LWW per field and a note's `Y.Text` stays live for character-wise merging.
- **The Realtime channel is a dumb pipe** carrying opaque Yjs binary updates —
  the server stays document-agnostic and clients converge purely through CRDT
  semantics. A separate presence channel carries cursors so cursor spam never
  pollutes the doc log.
- **Persistence**: local updates are appended (debounced, merged) to
  `room_updates`; new joiners bootstrap from a `room_snapshots` snapshot plus the
  tail of `room_updates`. The `compact-room` edge function folds the log back
  into the snapshot when it grows past a threshold (see below).

Key modules: `src/lib/yjs/` (doc, provider, persistence, undo, encoding),
`src/lib/canvas/` (viewport, render, hit-test, tools), `src/lib/presence/`,
`src/components/` (Whiteboard, CanvasLayer, Toolbar, PresenceLayer, …).

---

## Local setup

Prerequisites: Node 20+, pnpm, and a Supabase project.

```bash
pnpm install
# create .env.local with the variables in the table below
pnpm dev                           # http://localhost:3000
```

### Environment (`.env.local`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | yes | Used for magic-link redirects + share links |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Only used by the e2e test; never sent to the browser |

The app degrades gracefully without Supabase configured (it shows the marketing
landing).

### Database

Apply the migrations in `supabase/migrations/` (SQL editor or `supabase db push`):

1. `0001_init.sql` — schema, RLS, and helper/trigger functions.
2. `0002_compaction.sql` — the compaction trigger (a no-op until you set the
   GUCs documented at the top of that file).

In Supabase **Auth → URL Configuration**, add `http://localhost:3000/auth/callback`
(and your deployed URL) to the allowed redirect URLs.

---

## Compaction edge function

`supabase/functions/compact-room/` folds a room's append log into its snapshot so
bootstrap stays cheap. It's invoked by the `room_updates` after-insert trigger
once the log crosses the threshold (500 rows), and is idempotent.

```bash
supabase functions deploy compact-room --no-verify-jwt
supabase secrets set COMPACTION_SECRET=<a-long-random-string>
```

Then point the trigger at it (run once, with your own values):

```sql
alter database postgres
  set app.compaction_url = 'https://<project-ref>.supabase.co/functions/v1/compact-room';
alter database postgres
  set app.compaction_secret = '<the COMPACTION_SECRET you just set>';
```

---

## Observability

- **Performance marks** (`src/lib/observability/perf.ts`) wrap the two hot paths —
  CRDT apply (`crdt-apply`) and canvas render (`canvas-render`) — using the
  standard User Timing API, so they show up in the DevTools Performance panel.

---

## Testing

```bash
pnpm test         # Vitest unit suite (viewport, hit-test, tools, render, shapes)
pnpm test:e2e     # Playwright two-browser realtime sync test
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
```

The Vitest suite covers the pure canvas/geometry layer and runs with no external
services.

The Playwright test (`e2e/sync.spec.ts`) opens the same room in two separately
authenticated browser contexts, draws a rectangle in one, and asserts it appears
in the other. Because auth is magic-link only, `e2e/global-setup.ts` injects
sessions using the **service-role key**: it provisions two throwaway users + a
fresh room, signs them in through `@supabase/ssr` (so the cookies are formatted
exactly as the app expects), and saves them as Playwright storage states. To run
it for real:

```bash
pnpm exec playwright install chromium     # one-time
# set SUPABASE_SERVICE_ROLE_KEY in .env.local
pnpm test:e2e
```

Without the service-role key the test **skips cleanly** instead of failing.

---

## Known limitations

These are deliberate v1 trade-offs:

- **Z-order on concurrent reorder is LWW**, not collision-free. Two simultaneous
  "bring to front" actions may settle the wrong way.
- **The drawing surface is not screen-reader accessible.** The app chrome
  (toolbar, dialogs, shortcuts) is keyboard- and a11y-friendly; the canvas itself
  is acknowledged as a visual tool.
- **Scale target is ~25 users/room.** Beyond that, expect Supabase free-tier
  message-rate throttling.
- **No image paste / PNG export / multi-select / grouping** in v1.

---

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright sync e2e |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
