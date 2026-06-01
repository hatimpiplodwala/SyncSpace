"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as Y from "yjs";
import {
  SHAPE_COLORS,
  NOTE_COLORS,
  type ShapeColorName,
  type NoteColorName,
} from "@/lib/colors";
import { type Tool } from "@/lib/canvas/tools";
import {
  type Viewport,
  type Point,
  initialViewport,
} from "@/lib/canvas/viewport";
import { createRoomDoc, getShapesMap } from "@/lib/yjs/doc";
import { type ProviderStatus } from "@/lib/yjs/supabase-provider";
import { usePresence, type Me } from "@/lib/presence/usePresence";
import { createUndoManager } from "@/lib/yjs/undo";
import {
  deleteShape,
  bringToFront,
  sendToBack,
  setColor,
  getShapeType,
} from "@/lib/yjs/shapes";
import { CanvasLayer } from "./CanvasLayer";
import { PresenceLayer } from "./PresenceLayer";
import { Toolbar } from "./Toolbar";
import { ConnectionBadge, type ConnectionStatus } from "./ConnectionBadge";
import { ShortcutsCheatSheet } from "./ShortcutsCheatSheet";

type RoomState = { doc: Y.Doc; undo: Y.UndoManager };

export function Whiteboard({ roomId, me }: { roomId: string; me: Me }) {
  const [room, setRoom] = useState<RoomState | null>(null);
  // Connection state derives from the provider's channel view plus the browser's online/offline state.
  const [providerStatus, setProviderStatus] = useState<
    ProviderStatus | "loading" | "local"
  >("loading");
  const [online, setOnline] = useState(true);

  const status: ConnectionStatus =
    providerStatus === "local"
      ? "local"
      : !online
        ? "offline"
        : providerStatus === "connected"
          ? "live"
          : providerStatus === "connecting" || providerStatus === "loading"
            ? "loading"
            : "reconnecting"; // channel dropped but the network is up

  const [tool, setTool] = useState<Tool>("select");
  const [color, setColorName] = useState<ShapeColorName>("black");
  const [noteColor, setNoteColorName] = useState<NoteColorName>("yellow");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [hintDismissed, setHintDismissed] = useState(false);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Presence cursors render in world coords; the overlay re-projects via this viewport ref.
  const { peers, buffer, sendCursor } = usePresence(roomId, me);
  const viewportRef = useRef<Viewport>(initialViewport());
  const handleViewportChange = useCallback((vp: Viewport) => {
    viewportRef.current = vp;
  }, []);
  const handleCursorMove = useCallback(
    (w: Point | null) => {
      if (w) sendCursor(w.x, w.y);
    },
    [sendCursor],
  );

  // Latest state for the window-level keyboard handler (avoids stale closures).
  const stateRef = useRef({ room, selectedId, showShortcuts });
  useEffect(() => {
    stateRef.current = { room, selectedId, showShortcuts };
  }, [room, selectedId, showShortcuts]);

  // --- create the Yjs doc + persistence (browser only) ----------------------
  useEffect(() => {
    const rd = createRoomDoc(roomId, {
      onStatus: (s) => setProviderStatus(s),
    });
    const undo = createUndoManager(rd.doc);
    // Hand the browser-only doc to React; the one extra render (null -> doc) is intended.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoom({ doc: rd.doc, undo });
    // Local-only mode: "saved on this device" once IndexedDB loads; with a provider, onStatus drives it.
    rd.whenReady.then(() => {
      if (!rd.provider) setProviderStatus("local");
    });

    const shapesMap = getShapesMap(rd.doc);
    const refresh = () => {
      setIsEmpty(shapesMap.size === 0);
      setCanUndo(undo.undoStack.length > 0);
      setCanRedo(undo.redoStack.length > 0);
    };
    shapesMap.observeDeep(refresh);
    undo.on("stack-item-added", refresh);
    undo.on("stack-item-popped", refresh);
    undo.on("stack-cleared", refresh);

    return () => {
      shapesMap.unobserveDeep(refresh);
      undo.destroy();
      rd.destroy();
    };
  }, [roomId]);

  // Track connectivity so the badge flips to Offline the moment the network drops.
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const handleDelete = useCallback(() => {
    const { room: r, selectedId: id } = stateRef.current;
    if (r && id) {
      deleteShape(r.doc, id);
      setSelectedId(null);
    }
  }, []);

  const handleUndo = useCallback(() => stateRef.current.room?.undo.undo(), []);
  const handleRedo = useCallback(() => stateRef.current.room?.undo.redo(), []);

  // Picking a swatch sets the new-shape default and recolors the current selection.
  const handleShapeColor = useCallback((name: ShapeColorName) => {
    setColorName(name);
    const { room: r, selectedId: id } = stateRef.current;
    if (r && id && getShapeType(r.doc, id) !== "note") {
      setColor(r.doc, id, SHAPE_COLORS[name]);
    }
  }, []);

  const handleNoteColor = useCallback((name: NoteColorName) => {
    setNoteColorName(name);
    const { room: r, selectedId: id } = stateRef.current;
    if (r && id && getShapeType(r.doc, id) === "note") {
      setColor(r.doc, id, NOTE_COLORS[name]);
    }
  }, []);

  // --- global keyboard shortcuts -------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTextTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (mod) return; // leave other Ctrl/Cmd combos to the browser

      switch (e.key) {
        case "v":
        case "V":
          setTool("select");
          break;
        case "p":
        case "P":
          setTool("pen");
          break;
        case "n":
        case "N":
          setTool("note");
          break;
        case "r":
        case "R":
          setTool("rect");
          break;
        case "o":
        case "O":
          setTool("ellipse");
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          handleDelete();
          break;
        case "?":
          setShowShortcuts((s) => !s);
          break;
        case "Escape":
          if (stateRef.current.showShortcuts) setShowShortcuts(false);
          else setSelectedId(null);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleDelete, handleUndo, handleRedo]);

  // Swatches drive the note palette when placing/selecting a note, else the shape palette.
  const selectedType =
    room && selectedId ? getShapeType(room.doc, selectedId) : null;
  const colorMode: "shape" | "note" =
    tool === "note" || selectedType === "note" ? "note" : "shape";

  return (
    <div className="relative flex-1 bg-white">
      {room && (
        <CanvasLayer
          doc={room.doc}
          tool={tool}
          colorHex={SHAPE_COLORS[color]}
          noteColorHex={NOTE_COLORS[noteColor]}
          strokeWidth={strokeWidth}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onToolChange={setTool}
          onViewportChange={handleViewportChange}
          onCursorMove={handleCursorMove}
        />
      )}

      {room && (
        <PresenceLayer peers={peers} buffer={buffer} viewportRef={viewportRef} />
      )}

      <Toolbar
        tool={tool}
        onToolChange={setTool}
        colorMode={colorMode}
        color={color}
        onColorChange={handleShapeColor}
        noteColor={noteColor}
        onNoteColorChange={handleNoteColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        hasSelection={selectedId !== null}
        onBringToFront={() =>
          room && selectedId && bringToFront(room.doc, selectedId)
        }
        onSendToBack={() =>
          room && selectedId && sendToBack(room.doc, selectedId)
        }
        onDelete={handleDelete}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onShowShortcuts={() => setShowShortcuts(true)}
      />

      <ConnectionBadge status={status} />

      {isEmpty && !hintDismissed && status !== "loading" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="glass pointer-events-auto max-w-xs rounded-2xl px-5 py-4 text-center">
            <p className="text-sm text-foreground/80">
              Pick a tool above and start drawing. Everything is saved to this
              device automatically.
            </p>
            <button
              type="button"
              onClick={() => setHintDismissed(true)}
              className="mt-3 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <ShortcutsCheatSheet
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
    </div>
  );
}

function isTextTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}
