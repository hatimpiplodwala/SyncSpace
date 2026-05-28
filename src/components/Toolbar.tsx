"use client";

import {
  SHAPE_COLORS,
  NOTE_COLORS,
  type ShapeColorName,
  type NoteColorName,
} from "@/lib/colors";
import { TOOLS, STROKE_WIDTHS, type Tool } from "@/lib/canvas/tools";

type Props = {
  tool: Tool;
  onToolChange: (t: Tool) => void;
  // Which palette the swatches drive right now.
  colorMode: "shape" | "note";
  color: ShapeColorName;
  onColorChange: (c: ShapeColorName) => void;
  noteColor: NoteColorName;
  onNoteColorChange: (c: NoteColorName) => void;
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
  hasSelection: boolean;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDelete: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onShowShortcuts: () => void;
};

const shapeColorNames = Object.keys(SHAPE_COLORS) as ShapeColorName[];
const noteColorNames = Object.keys(NOTE_COLORS) as NoteColorName[];

export function Toolbar({
  tool,
  onToolChange,
  colorMode,
  color,
  onColorChange,
  noteColor,
  onNoteColorChange,
  strokeWidth,
  onStrokeWidthChange,
  hasSelection,
  onBringToFront,
  onSendToBack,
  onDelete,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onShowShortcuts,
}: Props) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-gray-200 bg-white/95 p-1.5 shadow-lg shadow-gray-900/5 backdrop-blur">
      {/* Tools */}
      <div className="flex items-center gap-1">
        {TOOLS.map((t) => {
          const active = tool === t.tool;
          return (
            <button
              key={t.tool}
              type="button"
              onClick={() => onToolChange(t.tool)}
              aria-pressed={active}
              aria-keyshortcuts={t.shortcut}
              title={`${t.label} (${t.shortcut})`}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-base transition ${
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span aria-hidden>{t.glyph}</span>
            </button>
          );
        })}
      </div>

      <Divider />

      {/* Color swatches — shape palette or the soft note palette. */}
      <div className="flex items-center gap-1">
        {colorMode === "note"
          ? noteColorNames.map((name) => {
              const active = noteColor === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onNoteColorChange(name)}
                  aria-pressed={active}
                  title={`${name} note`}
                  className={`h-6 w-6 rounded-md border transition ${
                    active
                      ? "border-gray-900 ring-2 ring-gray-900/20"
                      : "border-black/10 hover:scale-110"
                  }`}
                  style={{ backgroundColor: NOTE_COLORS[name] }}
                />
              );
            })
          : shapeColorNames.map((name) => {
              const active = color === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onColorChange(name)}
                  aria-pressed={active}
                  title={name}
                  className={`h-6 w-6 rounded-full border transition ${
                    active
                      ? "border-gray-900 ring-2 ring-gray-900/20"
                      : "border-gray-200 hover:scale-110"
                  }`}
                  style={{ backgroundColor: SHAPE_COLORS[name] }}
                />
              );
            })}
      </div>

      {/* Stroke width (pen only) */}
      {tool === "pen" && (
        <>
          <Divider />
          <div className="flex items-center gap-1 px-1">
            {STROKE_WIDTHS.map((w) => {
              const active = strokeWidth === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => onStrokeWidthChange(w)}
                  aria-pressed={active}
                  title={`${w}px`}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                    active ? "bg-gray-100" : "hover:bg-gray-100"
                  }`}
                >
                  <span
                    className="rounded-full bg-gray-800"
                    style={{ width: w, height: w }}
                  />
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Selection actions */}
      {hasSelection && (
        <>
          <Divider />
          <div className="flex items-center gap-1">
            <IconButton title="Bring to front" onClick={onBringToFront}>
              ⤒
            </IconButton>
            <IconButton title="Send to back" onClick={onSendToBack}>
              ⤓
            </IconButton>
            <IconButton title="Delete (Del)" onClick={onDelete}>
              🗑
            </IconButton>
          </div>
        </>
      )}

      <Divider />

      {/* Undo / redo / help */}
      <div className="flex items-center gap-1">
        <IconButton
          title="Undo (Ctrl/Cmd+Z)"
          onClick={onUndo}
          disabled={!canUndo}
        >
          ↶
        </IconButton>
        <IconButton
          title="Redo (Ctrl/Cmd+Shift+Z)"
          onClick={onRedo}
          disabled={!canRedo}
        >
          ↷
        </IconButton>
        <IconButton title="Keyboard shortcuts (?)" onClick={onShowShortcuts}>
          ?
        </IconButton>
      </div>
    </div>
  );
}

function Divider() {
  return <span className="mx-0.5 h-6 w-px bg-gray-200" aria-hidden />;
}

function IconButton({
  children,
  title,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}
