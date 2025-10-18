import { useState } from 'react'
import { toast } from '@/lib/sonner'

import { useDeleteServiceMutation } from '@/store/slices/services/servicesSlice'
import type { Service } from '@/types/services'
import type { ServiceDeleteModalState } from '@/types/serviceDetailsPage'
import { resolveServiceErrorMessage } from '@/utils/serviceDetails'

type UseServiceDetailsDeleteParams = {
  items: Service[]
  safePage: number
  setPage: (value: number) => void
  refreshServices: (nextPage: number) => Promise<void>
}

export const useServiceDetailsDelete = ({
  items,
  safePage,
  setPage,
  refreshServices,
}: UseServiceDetailsDeleteParams): ServiceDeleteModalState => {
  const [deleteService] = useDeleteServiceMutation()
  const [target, setTarget] = useState<Service | null>(null)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  const confirm = async () => {
    if (!target) return
    const shouldMovePrev = items.length === 1 && safePage > 1
    const nextPage = shouldMovePrev ? Math.max(1, safePage - 1) : safePage

    setIsDeletingId(target.id)
    try {
      await deleteService(target.id).unwrap()
      toast.success(`Deleted service: ${target.name}`)
      setTarget(null)
      if (shouldMovePrev) {
        setPage(nextPage)
      }
      await refreshServices(nextPage)
    } catch (err) {
      toast.error(resolveServiceErrorMessage(err, 'Failed to delete service'))
    } finally {
      setIsDeletingId(null)
    }
  }

  return {
    target,
    isDeleting: Boolean(isDeletingId),
    request: (service: Service) => setTarget(service),
    cancel: () => setTarget(null),
    confirm,
  }
}

export default useServiceDetailsDelete
