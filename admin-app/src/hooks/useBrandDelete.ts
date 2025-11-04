import { useState } from 'react'
import { toast } from '@/lib/sonner'

import { resolveBrandErrorMessage } from '@/utils/brands'
import type { Brand } from '@/types/brands'
import type { BrandDeleteModalState } from '@/types/brandsPage'
import { useAppDispatch } from '@/store/hooks'
import { removeBrand, useDeleteBrandMutation } from '@/store/slices/brands/brandsSlice'

type UseBrandDeleteParams = {
  items: Brand[]
  safePage: number
  setPage: (value: number) => void
  // refreshBrands: (nextPage: number) => Promise<void>
}

export const useBrandDelete = ({ 
  items, 
  safePage, 
  setPage, 
  // refreshBrands 
}: UseBrandDeleteParams): BrandDeleteModalState => {
  const dispatch = useAppDispatch()
  const [deleteBrand, { isLoading: isDeleting }] = useDeleteBrandMutation()
  const [target, setTarget] = useState<Brand | null>(null)

  const confirm = async () => {
    if (!target) return
    const shouldMovePrev = items.length === 1 && safePage > 1
    const nextPage = shouldMovePrev ? Math.max(1, safePage - 1) : safePage

    try {
      await deleteBrand(target.slug).unwrap()
      dispatch(removeBrand(target.slug))
      toast.success(`Deleted brand: ${target.name}`)
      setTarget(null)
      if (shouldMovePrev) {
        setPage(nextPage)
      }
      // await refreshBrands(nextPage)
    } catch (err) {
      toast.error(resolveBrandErrorMessage(err, 'Failed to delete brand'))
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

export default useBrandDelete
