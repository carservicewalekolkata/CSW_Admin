import { useState } from 'react'

import type { Model } from '@/types/models'
import type { ModelServicesPreviewState } from '@/types/modelsPage'

export const useModelServicesPreview = (): ModelServicesPreviewState => {
  const [model, setModel] = useState<Model | null>(null)

  return {
    model,
    open: setModel,
    close: () => setModel(null),
  }
}

export default useModelServicesPreview
