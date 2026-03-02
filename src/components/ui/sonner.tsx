import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      toastOptions={{
        classNames: {
          toast: 'border border-slate-200 bg-white text-slate-900',
          title: 'font-semibold',
          description: 'text-slate-600'
        }
      }}
      {...props}
    />
  )
}

export { Toaster }
