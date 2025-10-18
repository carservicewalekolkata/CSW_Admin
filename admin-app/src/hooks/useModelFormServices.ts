import { useCallback } from 'react'
import type { ModelFormService, ModelServicePickerState } from '@/types/modelsPage'
import type { Service } from '@/types/services'

type UseModelFormServicesParams = {
  services: ModelFormService[]
  setServices: (next: ModelFormService[]) => void
  picker: ModelServicePickerState
  setPicker: React.Dispatch<React.SetStateAction<ModelServicePickerState>>
  setPickerError: (message: string | null) => void
  serviceOptions: Service[]
  loadServices: (categoryId: string) => Promise<void>
}

export const useModelFormServices = ({
  services,
  setServices,
  picker,
  setPicker,
  setPickerError,
  serviceOptions,
  loadServices,
}: UseModelFormServicesParams) => {
  const selectCategory = useCallback(
    async (value: string) => {
      setPickerError(null)
      await loadServices(value)
    },
    [loadServices, setPickerError],
  )

  const selectService = useCallback(
    (serviceId: string) => {
      setPickerError(null)
      setPicker((prev) => ({ ...prev, serviceId }))
    },
    [setPicker, setPickerError],
  )

  const updatePickerField = useCallback(
    (field: keyof Omit<ModelServicePickerState, 'categoryId' | 'serviceId'>, value: string) => {
      setPicker((prev) => ({ ...prev, [field]: value }))
    },
    [setPicker],
  )

  const addService = useCallback(() => {
    if (!picker.categoryId) {
      setPickerError('Select a service category')
      return
    }
    if (!picker.serviceId) {
      setPickerError('Select a service')
      return
    }

    if (services.some((service) => service.serviceId === picker.serviceId)) {
      setPickerError('Service already added')
      return
    }

    const selected = serviceOptions.find((service) => service.id === picker.serviceId)
    const serviceName = selected?.name ?? 'Unnamed service'

    setServices([
      ...services,
      {
        serviceId: picker.serviceId,
        serviceName,
        discount: picker.discount || '0',
        originalPrice: picker.originalPrice || '0',
        discountPrice: picker.discountPrice || '0',
      },
    ])

    setPicker({
      categoryId: picker.categoryId,
      serviceId: '',
      discount: '',
      originalPrice: '',
      discountPrice: '',
    })
    setPickerError(null)
  }, [picker, serviceOptions, services, setPicker, setPickerError, setServices])

  const removeService = useCallback(
    (serviceId: string) => {
      setServices(services.filter((service) => service.serviceId !== serviceId))
    },
    [services, setServices],
  )

  const updateServiceValue = useCallback(
    (serviceId: string, field: keyof Omit<ModelFormService, 'serviceId' | 'serviceName'>, value: string) => {
      setServices(
        services.map((service) =>
          service.serviceId === serviceId ? { ...service, [field]: value } : service,
        ),
      )
    },
    [services, setServices],
  )

  return {
    selectCategory,
    selectService,
    updatePickerField,
    addService,
    removeService,
    updateServiceValue,
  }
}

export default useModelFormServices
