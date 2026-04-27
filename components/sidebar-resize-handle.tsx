"use client";

import * as React from "react";

import { useSidebar } from "@/components/ui/sidebar";
import {
  useSettingsStore,
  SIDEBAR_WIDTH_MIN,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_DEFAULT,
} from "@/store/use-settings-store";
import { cn } from "@/lib/utils";

interface SidebarResizeHandleProps {
  /** Which side the sidebar is on (matches the Sidebar `side` prop). */
  side?: "left" | "right";
}

/**
 * A thin drag-handle that lets the user resize the sidebar by dragging.
 * Position yourself inside `<SidebarInset>` – because CSS custom properties
 * cascade to children, `var(--sidebar-width)` from `<SidebarProvider>`
 * resolves correctly even for `position: fixed` descendants.
 *
 * Double-click resets width to the default.
 */
export function SidebarResizeHandle({ side = "left" }: SidebarResizeHandleProps) {
  const { state, isMobile } = useSidebar();
  const setSidebarWidth = useSettingsStore((s) => s.setSidebarWidth);
  const [dragging, setDragging] = React.useState(false);

  // ── Pointer-capture drag (works for mouse, touch, stylus) ──────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const raw = side === "left" ? e.clientX : window.innerWidth - e.clientX;
    setSidebarWidth(raw);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  };

  const onDoubleClick = () => {
    setSidebarWidth(SIDEBAR_WIDTH_DEFAULT);
  };

  // Hidden on mobile (sidebar renders as a Sheet) and when collapsed to icon
  if (isMobile || state === "collapsed") return null;

  return (
    <div
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onLostPointerCapture={() => setDragging(false)}
      onDoubleClick={onDoubleClick}
      // The handle straddles the sidebar edge:
      // left sidebar → position at left: calc(var(--sidebar-width) - 3px)
      // right sidebar → position at right: calc(var(--sidebar-width) - 3px)
      style={
        side === "left"
          ? { left: "calc(var(--sidebar-width) - 3px)" }
          : { right: "calc(var(--sidebar-width) - 3px)" }
      }
      className={cn(
        "fixed inset-y-0 z-50 w-[6px] cursor-col-resize touch-none select-none",
        "group/resize"
      )}
    >
      {/* Thin visual indicator line */}
      <span
        className={cn(
          "absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full",
          "bg-primary/0 transition-colors duration-150",
          "group-hover/resize:bg-primary/30",
          dragging && "bg-primary/60"
        )}
      />

      {/* Width tooltip while dragging */}
      {dragging && <SidebarWidthTooltip side={side} />}
    </div>
  );
}

// ── Internal: live width readout shown while dragging ──────────────────────

function SidebarWidthTooltip({ side }: { side: "left" | "right" }) {
  const width = useSettingsStore((s) => s.sidebarWidth);
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-md",
        "bg-popover px-2 py-0.5 text-xs font-medium text-popover-foreground shadow-md ring-1 ring-border",
        "whitespace-nowrap",
        side === "left" ? "left-4" : "right-4"
      )}
    >
      {width} px
    </span>
  );
}
