"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// ── No @radix-ui/react-dialog: controlled overlay + panel (same shadcn API surface) ──

type SheetContextValue = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue | null>(null)

function useSheet() {
  const ctx = React.useContext(SheetContext)
  if (!ctx) {
    throw new Error("Sheet components must be used within a Sheet")
  }
  return ctx
}

type SheetProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">

const Sheet: React.FC<SheetProps> = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  className,
  ...rest
}) => {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : uncontrolled

  const onOpenChangeInternal = React.useCallback(
    (next: boolean) => {
      onOpenChange?.(next)
      if (!isControlled) {
        setUncontrolled(next)
      }
    },
    [isControlled, onOpenChange]
  )

  const value = React.useMemo<SheetContextValue>(
    () => ({ open, onOpenChange: onOpenChangeInternal }),
    [open, onOpenChangeInternal]
  )

  return (
    <SheetContext.Provider value={value}>
      <div className={cn("contents", className)} {...rest}>
        {children}
      </div>
    </SheetContext.Provider>
  )
}

const SheetTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, children, onClick, ...props }, ref) => {
  const { onOpenChange } = useSheet()
  if (asChild) {
    return <>{children}</>
  }
  return (
    <button
      type="button"
      ref={ref}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) onOpenChange(true)
      }}
      {...props}
    >
      {children}
    </button>
  )
})
SheetTrigger.displayName = "SheetTrigger"

const SheetClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, children, onClick, ...props }, ref) => {
  const { onOpenChange } = useSheet()
  if (asChild) {
    return <>{children}</>
  }
  return (
    <button
      type="button"
      ref={ref}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) onOpenChange(false)
      }}
      {...props}
    >
      {children}
    </button>
  )
})
SheetClose.displayName = "SheetClose"

const SheetPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>

const SheetOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = "SheetOverlay"

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentProps<"div">, VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = "right", className, children, style, ...props }, ref) => {
    const { open, onOpenChange } = useSheet()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
      setMounted(true)
    }, [])

    React.useEffect(() => {
      if (!open) return
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onOpenChange(false)
      }
      document.addEventListener("keydown", onKey)
      return () => document.removeEventListener("keydown", onKey)
    }, [open, onOpenChange])

    React.useEffect(() => {
      if (!open) return
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prev
      }
    }, [open])

    if (!open || !mounted) {
      return null
    }

    return createPortal(
      <div
        className="fixed inset-0 z-50"
        data-state="open"
        role="dialog"
        aria-modal="true"
      >
        <div
          className="pointer-events-auto fixed inset-0 z-50 bg-black/80 animate-in fade-in-0"
          data-state="open"
          aria-hidden="true"
          onClick={() => onOpenChange(false)}
        />
        <div
          ref={ref}
          data-state="open"
          className={cn(sheetVariants({ side }), "z-[100]", className)}
          style={style}
          {...props}
        >
          {children}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
      </div>,
      document.body
    )
  }
)
SheetContent.displayName = "SheetContent"

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = "SheetDescription"

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
