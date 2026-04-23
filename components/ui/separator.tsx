"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export type SeparatorProps = React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical"
  /** When `true`, treated as purely visual (no separator semantics). Matches Radix/shadcn behavior. */
  decorative?: boolean
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      aria-hidden={decorative ? true : undefined}
      data-orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  ),
)
Separator.displayName = "Separator"

export { Separator }
