import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-t from-primary to-[color-mix(in_srgb,var(--primary)_80%,white)] text-primary-foreground border border-primary shadow-lg shadow-primary/30 hover:-translate-y-px hover:shadow-primary/40",
        outline:
          "border bg-card text-foreground shadow-sm hover:border-muted-foreground/50",
        dark:
          "bg-gradient-to-t from-neutral-900 to-neutral-700 text-white border border-neutral-700 shadow-lg shadow-neutral-900/30 hover:-translate-y-px",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        white:
          "bg-gradient-to-b from-white via-white/95 to-white/70 text-black shadow-lg shadow-white/10 hover:scale-[1.03] active:scale-95",
        "ghost-dark": "border border-white/15 bg-white/5 text-white hover:bg-white/10",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4",
        lg: "h-14 px-7 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
