"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

// ── No @radix-ui/react-tooltip: lightweight hover tooltip (same API for sidebar) ──

const TooltipDelayContext = React.createContext<number>(700)

type TooltipProviderProps = {
  children: React.ReactNode
  delayDuration?: number
}

function TooltipProvider({ children, delayDuration = 700 }: TooltipProviderProps) {
  return (
    <TooltipDelayContext.Provider value={delayDuration}>
      {children}
    </TooltipDelayContext.Provider>
  )
}

type TooltipOpenContextValue = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const TooltipOpenContext = React.createContext<TooltipOpenContextValue | null>(null)

const Tooltip = ({ children }: { children: React.ReactNode }) => {
  const delay = React.useContext(TooltipDelayContext)
  const [open, setOpen] = React.useState(false)
  const showTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(
    () => () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current)
    },
    []
  )

  const value = React.useMemo(() => ({ open, setOpen }), [open])

  const show = React.useCallback(() => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current)
    showTimerRef.current = setTimeout(() => {
      showTimerRef.current = null
      setOpen(true)
    }, Math.max(0, delay))
  }, [delay])

  const hide = React.useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
    setOpen(false)
  }, [])

  return (
    <TooltipOpenContext.Provider value={value}>
      <div
        className="relative inline-flex w-full min-w-0"
        onPointerEnter={show}
        onPointerLeave={hide}
      >
        {children}
      </div>
    </TooltipOpenContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<typeof Slot> & { asChild?: boolean }
>(({ asChild, children, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp ref={ref as never} {...props}>
      {children}
    </Comp>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

export type TooltipContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  sideOffset?: number
  hidden?: boolean
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  (
    {
      className,
      side = "top",
      align,
      sideOffset = 4,
      hidden: hiddenProp,
      children,
      style,
      ...props
    },
    ref
  ) => {
    void align
    const ctx = React.useContext(TooltipOpenContext)
    if (hiddenProp) return null
    if (!ctx) return null

    const { open } = ctx

    const sideClass =
      side === "right"
        ? "left-full top-1/2 -translate-y-1/2"
        : side === "left"
          ? "right-full top-1/2 -translate-y-1/2"
          : side === "bottom"
            ? "left-1/2 top-full -translate-x-1/2"
            : "bottom-full left-1/2 -translate-x-1/2"

    const offsetStyle: React.CSSProperties =
      side === "right"
        ? { marginLeft: sideOffset }
        : side === "left"
          ? { marginRight: sideOffset }
          : side === "bottom"
            ? { marginTop: sideOffset }
            : { marginBottom: sideOffset }

    return (
      <div
        ref={ref}
        role="tooltip"
        data-state={open ? "open" : "closed"}
        className={cn(
          "pointer-events-none absolute z-50 max-w-[min(240px,100vw)] overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
          "transition-opacity duration-100",
          open ? "visible opacity-100" : "invisible opacity-0",
          sideClass,
          className
        )}
        style={{ ...offsetStyle, ...style }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
