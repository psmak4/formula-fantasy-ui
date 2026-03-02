import { PropsWithChildren } from 'react'

type PageShellProps = PropsWithChildren<{
  title?: string
  subtitle?: string
}>

export function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <section className="ui-page-shell">
      {title ? <h2 className="ui-page-title">{title}</h2> : null}
      {subtitle ? <p className="ui-page-subtitle">{subtitle}</p> : null}
      {children}
    </section>
  )
}
