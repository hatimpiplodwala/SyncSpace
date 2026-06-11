"use client";

import { createContext, useContext, useRef } from "react";
import {
  MousePointer2,
  Pencil,
  StickyNote,
  Square,
  Circle,
  BringToFront,
  SendToBack,
  Trash2,
  Undo2,
  Redo2,
  Keyboard,
  type LucideIcon,
} from "lucide-react";
import {
  SHAPE_COLORS,
  NOTE_COLORS,
  type ShapeColorName,
  type NoteColorName,
} from "@/lib/colors";
import { TOOLS, STROKE_WIDTHS, type Tool } from "@/lib/canvas/tools";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  tool: Tool;
  onToolChange: (t: Tool) => void;
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
  /** Hover-scrub: preview a color on the current selection without committing. */
  onPreviewColor?: (hex: string | null) => void;
  /** Touch long-press on a tool button surfaces its label (since tooltips don't fire on touch). */
  onLongPressLabel?: (label: string) => void;
};

// Lets nested ChromeButtons fire the long-press hint without prop-drilling.
const LongPressContext = createContext<((label: string) => void) | undefined>(
  undefined,
);

const TOOL_ICONS: Record<Tool, LucideIcon> = {
  select: MousePointer2,
  pen: Pencil,
  note: StickyNote,
  rect: Square,
  ellipse: Circle,
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
  onPreviewColor,
  onLongPressLabel,
}: Props) {
  // Compact names for the rail's mode strip so it doesn't widen the whole rail
  // (the full labels like "Sticky note" forced it ~3x the button column).
  const activeLabel =
    ({
      select: "Select",
      pen: "Pen",
      note: "Note",
      rect: "Rect",
      ellipse: "Ellipse",
    } as Record<Tool, string>)[tool] ?? tool;
  return (
    <LongPressContext.Provider value={onLongPressLabel}>
    <div
      className={cn(
        // Shared
        "glass no-scrollbar pointer-events-auto absolute z-20 flex items-center gap-1 rounded-[4px] p-1 [&>*]:shrink-0",
        // Mobile: bottom-anchored, horizontal, safe-area aware
        "bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-1/2 max-w-[calc(100vw-1rem)] -translate-x-1/2 overflow-x-auto",
        // Laptop: vertical left rail
        "md:bottom-auto md:left-4 md:top-1/2 md:max-h-[calc(100vh-3rem)] md:max-w-none md:translate-x-0 md:-translate-y-1/2 md:flex-col md:overflow-x-visible md:overflow-y-auto",
      )}
    >
      {/* Mode strip — anchors the rail so swapping tools doesn't shift the layout below. */}
      <div className="label-mono hidden w-full truncate border-b border-border px-1 pb-1.5 pt-1 text-center tracking-[0.08em] md:block">
        {activeLabel}
      </div>

      {/* Tools */}
      <div className="flex items-center gap-1 md:flex-col">
        {TOOLS.map((t) => {
          const Icon = TOOL_ICONS[t.tool];
          return (
            <ChromeButton
              key={t.tool}
              label={`${t.label} (${t.shortcut})`}
              active={tool === t.tool}
              aria-keyshortcuts={t.shortcut}
              onClick={() => onToolChange(t.tool)}
            >
              <Icon className="size-[18px]" />
            </ChromeButton>
          );
        })}
      </div>

      <Divider />

      {/* Color swatches — shape palette or the soft note palette. */}
      <div className="flex items-center gap-1 md:grid md:grid-cols-2 md:gap-1.5">
        {colorMode === "note"
          ? noteColorNames.map((name) => (
              <Swatch
                key={name}
                label={`${name} note`}
                active={noteColor === name}
                shape="square"
                color={NOTE_COLORS[name]}
                onClick={() => onNoteColorChange(name)}
                onPreview={onPreviewColor}
              />
            ))
          : shapeColorNames.map((name) => (
              <Swatch
                key={name}
                label={name}
                active={color === name}
                shape="round"
                color={SHAPE_COLORS[name]}
                onClick={() => onColorChange(name)}
                onPreview={onPreviewColor}
              />
            ))}
      </div>

      {/* Stroke width (pen only) */}
      {tool === "pen" && (
        <>
          <Divider />
          <div className="flex items-center gap-1 px-1 md:flex-col md:px-0">
            {STROKE_WIDTHS.map((w) => (
              <ChromeButton
                key={w}
                label={`${w}px`}
                active={strokeWidth === w}
                onClick={() => onStrokeWidthChange(w)}
              >
                <span
                  className="rounded-full bg-foreground"
                  style={{ width: w, height: w }}
                />
              </ChromeButton>
            ))}
          </div>
        </>
      )}

      {/* Selection actions */}
      {hasSelection && (
        <>
          <Divider />
          <div className="flex items-center gap-1 md:flex-col">
            <ChromeButton label="Bring to front" onClick={onBringToFront}>
              <BringToFront className="size-[18px]" />
            </ChromeButton>
            <ChromeButton label="Send to back" onClick={onSendToBack}>
              <SendToBack className="size-[18px]" />
            </ChromeButton>
            <ChromeButton label="Delete (Del)" onClick={onDelete}>
              <Trash2 className="size-[18px]" />
            </ChromeButton>
          </div>
        </>
      )}

      <Divider />

      {/* Undo / redo / help */}
      <div className="flex items-center gap-1 md:flex-col">
        <ChromeButton
          label="Undo (Ctrl/Cmd+Z)"
          onClick={onUndo}
          disabled={!canUndo}
        >
          <Undo2 className="size-[18px]" />
        </ChromeButton>
        <ChromeButton
          label="Redo (Ctrl/Cmd+Shift+Z)"
          onClick={onRedo}
          disabled={!canRedo}
        >
          <Redo2 className="size-[18px]" />
        </ChromeButton>
        <ChromeButton label="Keyboard shortcuts (?)" onClick={onShowShortcuts}>
          <Keyboard className="size-[18px]" />
        </ChromeButton>
      </div>
    </div>
    </LongPressContext.Provider>
  );
}

// Hairline divider that flips orientation with the toolbar layout.
function Divider() {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="mx-0.5 h-6 w-px bg-border md:mx-0 md:my-0.5 md:h-px md:w-full"
    />
  );
}

function ChromeButton({
  children,
  label,
  active,
  onClick,
  disabled,
  ...rest
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
} & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "disabled" | "children"
>) {
  const onLongPress = useContext(LongPressContext);
  // Touch long-press → fire the label hint and suppress the click so the tool doesn't flip.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);
  const startTouch = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" || !onLongPress) return;
    longPressedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      longPressedRef.current = true;
      onLongPress(label);
    }, 400);
  };
  const cancelTouch = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const handleClick = () => {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    onClick();
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          onPointerDown={startTouch}
          onPointerUp={cancelTouch}
          onPointerCancel={cancelTouch}
          onPointerLeave={cancelTouch}
          disabled={disabled}
          suppressHydrationWarning
          aria-pressed={active}
          className={cn(
            "flex size-9 items-center justify-center rounded-[3px] outline-none transition pointer-coarse:size-11 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-30",
            active
              ? "gloss-primary"
              : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
          )}
          {...rest}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Swatch({
  label,
  color,
  active,
  shape,
  onClick,
  onPreview,
}: {
  label: string;
  color: string;
  active: boolean;
  shape: "round" | "square";
  onClick: () => void;
  onPreview?: (hex: string | null) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={() => onPreview?.(color)}
          onMouseLeave={() => onPreview?.(null)}
          onFocus={() => onPreview?.(color)}
          onBlur={() => onPreview?.(null)}
          suppressHydrationWarning
          aria-pressed={active}
          className={cn(
            "size-6 outline-none transition-shadow pointer-coarse:size-8",
            shape === "square" ? "rounded-md" : "rounded-full",
            active
              ? "ring-2 ring-ring ring-offset-2 ring-offset-card"
              : "border border-foreground/15 hover:ring-1 hover:ring-foreground/40 hover:ring-offset-2 hover:ring-offset-card",
          )}
          style={{ backgroundColor: color }}
        />
      </TooltipTrigger>
      <TooltipContent className="capitalize">{label}</TooltipContent>
    </Tooltip>
  );
}
