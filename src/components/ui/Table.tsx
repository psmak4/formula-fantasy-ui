import * as React from 'react'
import { cn } from '@/lib/utils'

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  ariaLabel?: string
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(({ className, ariaLabel, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table ref={ref} aria-label={ariaLabel} className={cn('w-full caption-bottom text-sm text-[#e5e7eb]', className)} {...props} />
  </div>
))
Table.displayName = 'Table'

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn('[&_tr]:border-b [&_tr]:border-white/6', className)} {...props} />
)
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  )
)
TableBody.displayName = 'TableBody'

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn('border-b border-white/6 transition-colors hover:bg-white/4 data-[state=selected]:bg-white/5', className)} {...props} />
  )
)
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn('ff-kicker h-12 px-4 text-left align-middle text-[#7b7e87]', className)} {...props} />
  )
)
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => <td ref={ref} className={cn('p-4 align-middle', className)} {...props} />
)
TableCell.displayName = 'TableCell'

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }
