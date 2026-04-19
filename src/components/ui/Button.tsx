import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "font-headline inline-flex items-center justify-center gap-2 whitespace-nowrap font-extrabold uppercase tracking-[0.12em] transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-on-primary hover:bg-primary-dim",
        destructive:
          "bg-error text-on-error hover:bg-error-dim",
        outline:
          "bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
        secondary:
          "bg-surface-container-highest text-on-surface hover:bg-surface-container-high",
        ghost:
          "bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
        link:
          "bg-transparent px-0 text-primary underline-offset-4 hover:underline",
        tertiary:
          "bg-tertiary text-on-tertiary hover:bg-tertiary-dim",
      },
      size: {
        default: "h-11 px-6 text-sm",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-8 text-base",
        xl: "h-16 px-10 text-lg",
        icon: "h-10 w-10 px-0"
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
