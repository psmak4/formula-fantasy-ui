import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "ff-display inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border border-transparent text-xs tracking-[0.16em] transition-[color,background-color,border-color,box-shadow,transform] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111217] active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(180deg,#f20b0b_0%,#b80000_100%)] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_12px_28px_rgba(204,0,0,0.26)] hover:brightness-110 hover:shadow-[0_0_24px_rgba(204,0,0,0.38)]",
        destructive:
          "bg-[linear-gradient(180deg,#f20b0b_0%,#b80000_100%)] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_12px_28px_rgba(204,0,0,0.26)] hover:brightness-110 hover:shadow-[0_0_24px_rgba(204,0,0,0.38)]",
        outline:
          "border-white/12 bg-white/4 text-[#f5f7fa] hover:border-white/20 hover:bg-white/8",
        secondary:
          "border-white/6 bg-[#23242b] text-[#f5f7fa] hover:bg-[#2b2c34]",
        ghost:
          "border-transparent bg-transparent text-[#b8bac2] hover:bg-white/5 hover:text-white",
        link:
          "border-transparent bg-transparent px-0 text-[#f20b0b] hover:text-white"
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-8",
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
