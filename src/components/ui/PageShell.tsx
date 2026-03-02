import { PropsWithChildren } from 'react'

type PageShellProps = PropsWithChildren<{
  title?: string
  subtitle?: string
}>

export function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <section className="mx-auto w-full max-w-7xl space-y-3 px-6 py-6">
      {title ? <h2 className="ui-page-title">{title}</h2> : null}
      {subtitle ? <p className="ui-page-subtitle">{subtitle}</p> : null}
      {children}
    </section>
  )
}
