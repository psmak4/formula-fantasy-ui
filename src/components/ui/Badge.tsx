import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'ff-kicker inline-flex items-center rounded-none border px-2.5 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#f3f4f6]',
  {
    variants: {
      variant: {
        default: 'border-[#d9dee5] bg-white text-[#111318]',
        secondary: 'border-[#cfd6df] bg-[#f4f6f8] text-[#2b313a]',
        destructive: 'border-[rgba(180,35,24,0.22)] bg-[#fdeceb] text-[#9f291c]',
        outline: 'border-[#cfd6df] bg-transparent text-[#4b5563]',
        success: 'border-[rgba(20,128,74,0.2)] bg-[#e9f7ef] text-[#106c3f]',
        warning: 'border-[rgba(183,121,31,0.22)] bg-[#fff4db] text-[#9b6518]',
        info: 'border-[rgba(225,6,0,0.2)] bg-[#fff0ee] text-[#c80500]',
        neutral: 'border-[#d7dde5] bg-[#eef1f4] text-[#45515f]'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}

function mapToneToVariant(tone?: BadgeProps['tone']): NonNullable<BadgeProps['variant']> {
  if (tone === 'danger') return 'destructive'
  if (tone === 'success') return 'success'
  if (tone === 'warning') return 'warning'
  if (tone === 'info') return 'info'
  return 'neutral'
}

function Badge({ className, variant, tone, ...props }: BadgeProps) {
  const resolvedVariant = variant ?? mapToneToVariant(tone)
  return <div className={cn(badgeVariants({ variant: resolvedVariant }), className)} {...props} />
}

export { Badge, badgeVariants }
