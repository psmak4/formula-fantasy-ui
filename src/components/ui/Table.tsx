import * as React from 'react'
import { cn } from '@/lib/utils'

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  ariaLabel?: string
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(({ className, ariaLabel, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      aria-label={ariaLabel}
      className={cn('w-full caption-bottom text-sm text-on-surface', className)}
      {...props}
    />
  </div>
))
Table.displayName = 'Table'

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn('bg-surface-container-low', className)} {...props} />
  )
)
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('bg-surface-container-lowest', className)} {...props} />
  )
)
TableBody.displayName = 'TableBody'

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'transition-colors hover:bg-surface-container-low data-[state=selected]:bg-surface-container-high',
        className,
      )}
      {...props}
    />
  )
)
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'font-headline h-12 px-4 text-left align-middle text-[0.7rem] font-bold uppercase tracking-[0.2em] text-outline',
        className,
      )}
      {...props}
    />
  )
)
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => <td ref={ref} className={cn('p-4 align-middle', className)} {...props} />
)
TableCell.displayName = 'TableCell'

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }
