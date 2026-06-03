"use client";

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
import { Separator } from "@/components/ui/separator";
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
};

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
}: Props) {
  return (
    <div className="glass no-scrollbar pointer-events-auto absolute left-1/2 top-4 z-20 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-[4px] p-1 [&>*]:shrink-0">
      {/* Tools */}
      <div className="flex items-center gap-1">
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
      <div className="flex items-center gap-1">
        {colorMode === "note"
          ? noteColorNames.map((name) => (
              <Swatch
                key={name}
                label={`${name} note`}
                active={noteColor === name}
                shape="square"
                color={NOTE_COLORS[name]}
                onClick={() => onNoteColorChange(name)}
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
              />
            ))}
      </div>

      {/* Stroke width (pen only) */}
      {tool === "pen" && (
        <>
          <Divider />
          <div className="flex items-center gap-1 px-1">
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
          <div className="flex items-center gap-1">
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
      <div className="flex items-center gap-1">
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
  );
}

function Divider() {
  return <Separator orientation="vertical" className="mx-0.5 h-6" />;
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
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={active}
          className={cn(
            "flex size-9 items-center justify-center rounded-[3px] outline-none transition focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-30",
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
}: {
  label: string;
  color: string;
  active: boolean;
  shape: "round" | "square";
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-pressed={active}
          className={cn(
            "size-6 border transition hover:scale-110",
            shape === "square" ? "rounded-md" : "rounded-full",
            active
              ? "border-ring ring-2 ring-ring/30"
              : "border-black/10",
          )}
          style={{ backgroundColor: color }}
        />
      </TooltipTrigger>
      <TooltipContent className="capitalize">{label}</TooltipContent>
    </Tooltip>
  );
}
