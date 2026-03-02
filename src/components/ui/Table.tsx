import { PropsWithChildren } from 'react'

type TableProps = PropsWithChildren<{
  ariaLabel: string
}>

export function Table({ ariaLabel, children }: TableProps) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table" aria-label={ariaLabel}>
        {children}
      </table>
    </div>
  )
}
