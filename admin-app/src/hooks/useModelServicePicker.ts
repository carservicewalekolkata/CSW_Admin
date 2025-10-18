import { useState } from 'react'
import { toast } from '@/lib/sonner'

import { useLazyFetchServicesQuery } from '@/store/slices/services/servicesApi'
import { resolveModelErrorMessage } from '@/utils/models'
import type { Service } from '@/types/services'
import type { ModelServicePickerState } from '@/types/modelsPage'

type UseModelServicePickerResult = {
  picker: ModelServicePickerState
  setPicker: React.Dispatch<React.SetStateAction<ModelServicePickerState>>
  serviceOptions: Service[]
  isFetchingServices: boolean
  loadServices: (categoryId: string) => Promise<void>
  reset: () => void
}

const initialPickerState: ModelServicePickerState = {
  categoryId: '',
  serviceId: '',
  discount: '',
  originalPrice: '',
  discountPrice: '',
}

export const useModelServicePicker = (): UseModelServicePickerResult => {
  const [picker, setPicker] = useState<ModelServicePickerState>(initialPickerState)
  const [serviceOptions, setServiceOptions] = useState<Service[]>([])
  const [triggerServices, { isFetching }] = useLazyFetchServicesQuery()

  const loadServices = async (categoryId: string) => {
    setPicker((prev) => ({
      ...prev,
      categoryId,
      serviceId: '',
    }))
    setServiceOptions([])

    if (!categoryId) return

    try {
      const response = await triggerServices({
        category: categoryId,
        limit: 200,
        sortUpdated: 'desc',
      }).unwrap()
      setServiceOptions(response.data ?? [])
    } catch (err) {
      toast.error(resolveModelErrorMessage(err, 'Failed to load services for the selected category'))
    }
  }

  const reset = () => {
    setPicker(initialPickerState)
    setServiceOptions([])
  }

  return {
    picker,
    setPicker,
    serviceOptions,
    isFetchingServices: isFetching,
    loadServices,
    reset,
  }
}

export default useModelServicePicker
