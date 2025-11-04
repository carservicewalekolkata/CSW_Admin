import { useState } from 'react'
import { toast } from '@/lib/sonner'

import { useAppDispatch } from '@/store/hooks'
import { removeModel, useDeleteModelMutation } from '@/store/slices/models/modelsSlice'
import { resolveModelErrorMessage } from '@/utils/models'
import type { Model } from '@/types/models'
import type { ModelDeleteModalState } from '@/types/modelsPage'

type UseModelDeleteParams = {
  items: Model[]
  safePage: number
  setPage: (value: number) => void
}

export const useModelDelete = ({
  items,
  safePage,
  setPage,
}: UseModelDeleteParams): ModelDeleteModalState => {
  const dispatch = useAppDispatch()
  const [deleteModel] = useDeleteModelMutation()
  const [target, setTarget] = useState<Model | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const confirm = async () => {
    if (!target) return
    const shouldMovePrev = items.length === 1 && safePage > 1
    const nextPage = shouldMovePrev ? Math.max(1, safePage - 1) : safePage

    setIsDeleting(true)
    try {
      await deleteModel(target.slug).unwrap()
      dispatch(removeModel(target.slug))
      toast.success(`Deleted model: ${target.name}`)
      setTarget(null)
      if (shouldMovePrev) {
        setPage(nextPage)
      }
    } catch (err) {
      toast.error(resolveModelErrorMessage(err, 'Failed to delete model'))
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    target,
    isDeleting,
    request: setTarget,
    cancel: () => setTarget(null),
    confirm,
  }
}

export default useModelDelete
