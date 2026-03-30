import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "ff-display inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border border-transparent text-xs tracking-[0.16em] transition-[color,background-color,border-color,box-shadow,transform] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3f4f6] active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(180deg,#e10600_0%,#c80500_100%)] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset,0_12px_24px_rgba(225,6,0,0.2)] hover:brightness-105 hover:shadow-[0_10px_22px_rgba(225,6,0,0.24)]",
        destructive:
          "bg-[linear-gradient(180deg,#e10600_0%,#c80500_100%)] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset,0_12px_24px_rgba(225,6,0,0.2)] hover:brightness-105 hover:shadow-[0_10px_22px_rgba(225,6,0,0.24)]",
        outline:
          "border-[#d9dee5] bg-white text-[#111318] shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] hover:border-[#c8cfd8] hover:bg-[#f8f9fb] hover:shadow-[0_8px_20px_rgba(17,19,24,0.08)]",
        secondary:
          "border-[#d9dee5] bg-[#f8f9fb] text-[#111318] shadow-[0_1px_0_rgba(255,255,255,0.72)_inset] hover:border-[#c8cfd8] hover:bg-[#eef1f4]",
        ghost:
          "border-transparent bg-transparent text-[#66707d] hover:bg-[#eef1f4] hover:text-[#111318]",
        link:
          "border-transparent bg-transparent px-0 text-[#e10600] hover:text-[#111318]"
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
