import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'ff-kicker inline-flex items-center rounded-none border px-2.5 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#111217]',
  {
    variants: {
      variant: {
        default: 'border-white/10 bg-white/6 text-white',
        secondary: 'border-white/10 bg-[#23242b] text-[#d5d7dd]',
        destructive: 'border-[#7a0d0d] bg-[#350909] text-[#ff8e8e]',
        outline: 'border-white/12 bg-transparent text-[#d5d7dd]',
        success: 'border-[#205038] bg-[#102317] text-[#6ee7a8]',
        warning: 'border-[#594b11] bg-[#2b2508] text-[#f3db53]',
        info: 'border-[#5a1010] bg-[#2a0c0c] text-[#ff7373]',
        neutral: 'border-white/10 bg-white/5 text-[#b8bac2]'
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
