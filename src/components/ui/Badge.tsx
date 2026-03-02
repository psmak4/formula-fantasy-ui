import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-slate-900 text-slate-50',
        secondary: 'border-transparent bg-slate-100 text-slate-900',
        destructive: 'border-transparent bg-red-600 text-white',
        outline: 'text-slate-950',
        success: 'border-transparent bg-emerald-100 text-emerald-700',
        warning: 'border-transparent bg-amber-100 text-amber-800',
        info: 'border-transparent bg-rose-100 text-rose-700',
        neutral: 'border-transparent bg-slate-100 text-slate-700'
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
