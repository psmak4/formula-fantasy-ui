import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      toastOptions={{
        classNames: {
          toast: 'bg-surface-container-lowest text-on-surface ambient-shadow',
          title: 'font-headline font-extrabold uppercase tracking-[0.12em]',
          description: 'text-on-surface-variant'
        }
      }}
      {...props}
    />
  )
}

export { Toaster }
