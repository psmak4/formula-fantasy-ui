import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'font-headline inline-flex items-center rounded-full px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.18em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  {
    variants: {
      variant: {
        default: 'bg-primary text-on-primary',
        secondary: 'bg-surface-container-highest text-on-surface',
        destructive: 'bg-error text-on-error',
        outline: 'bg-surface-container-lowest text-on-surface-variant',
        success: 'bg-[color-mix(in_srgb,var(--color-success)_14%,var(--color-surface-container-lowest))] text-success',
        warning: 'bg-[color-mix(in_srgb,var(--color-warning)_14%,var(--color-surface-container-lowest))] text-warning',
        info: 'bg-tertiary text-on-tertiary',
        neutral: 'bg-surface-container-high text-on-surface-variant'
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
