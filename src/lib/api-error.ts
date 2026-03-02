import { toast } from 'sonner'
import { ApiError } from '@/api/apiClient'

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) {
    if (error.code) return `${error.message} (${error.code})`
    return error.message
  }
  if (error instanceof Error) return error.message
  return fallback
}

export function toastApiError(error: unknown, title = 'Request failed', fallback?: string): string {
  const message = getApiErrorMessage(error, fallback)
  toast.error(title, { description: message })
  return message
}
