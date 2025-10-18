import { toast } from '@/lib/sonner'

import { resolveModelErrorMessage } from '@/utils/models'

const MAX_ICON_SIZE_BYTES = 1.5 * 1024 * 1024
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024

type IconHandlers = {
  setIconId: (value: string) => void
  setIconPreviewUrl: (url: string | null) => void
  setIconUploadError: (error: string | null) => void
  setIsUploadingIcon: (value: boolean) => void
}

type ImageHandlers = {
  setImagePath: (value: string) => void
  setImagePreviewUrl: (url: string | null) => void
  setImageUploadError: (error: string | null) => void
  setIsUploadingImage: (value: boolean) => void
}

export const useModelFormUploads = (
  iconHandlers: IconHandlers,
  imageHandlers: ImageHandlers,
) => {
  const handleIconFileSelected = async (file: File) => {
    const { setIconId, setIconPreviewUrl, setIconUploadError, setIsUploadingIcon } = iconHandlers
    setIconUploadError(null)

    if (!file.type.startsWith('image/')) {
      const message = 'Icon must be an image file'
      setIconUploadError(message)
      toast.error(message)
      return
    }

    if (file.size > MAX_ICON_SIZE_BYTES) {
      const message = 'Icon must be 1.5 MB or smaller'
      setIconUploadError(message)
      toast.error(message)
      return
    }

    setIsUploadingIcon(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/v1/cars/models/icon', {
        method: 'POST',
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as
        | { success: boolean; iconId: string; url: string; message?: string }
        | { message?: string }
        | null

      if (!response.ok || !payload || typeof payload !== 'object' || !('success' in payload) || !payload.success) {
        const message =
          payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
            ? payload.message
            : 'Failed to upload icon'
        throw new Error(message)
      }

      setIconId(payload.iconId)
      setIconPreviewUrl(payload.url ?? `/api/v1/cars/models/icon/${payload.iconId}`)
      toast.success('Icon uploaded')
    } catch (err) {
      const message = err instanceof Error ? err.message : resolveModelErrorMessage(err, 'Failed to upload icon')
      setIconUploadError(message)
      toast.error(message)
    } finally {
      setIsUploadingIcon(false)
    }
  }

  const handleImageFileSelected = async (file: File) => {
    const { setImagePath, setImagePreviewUrl, setImageUploadError, setIsUploadingImage } = imageHandlers
    setImageUploadError(null)

    if (!file.type.startsWith('image/')) {
      const message = 'Image must be an image file'
      setImageUploadError(message)
      toast.error(message)
      return
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const message = 'Image must be 4 MB or smaller'
      setImageUploadError(message)
      toast.error(message)
      return
    }

    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/v1/cars/models/image', {
        method: 'POST',
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as
        | { success: boolean; path: string; url: string; message?: string }
        | { message?: string }
        | null

      if (!response.ok || !payload || typeof payload !== 'object' || !('success' in payload) || !payload.success) {
        const message =
          payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
            ? payload.message
            : 'Failed to upload image'
        throw new Error(message)
      }

      setImagePath(payload.path)
      setImagePreviewUrl(payload.url ?? `/${payload.path}`)
      toast.success('Image uploaded')
    } catch (err) {
      const message = err instanceof Error ? err.message : resolveModelErrorMessage(err, 'Failed to upload image')
      setImageUploadError(message)
      toast.error(message)
    } finally {
      setIsUploadingImage(false)
    }
  }

  return {
    handleIconFileSelected,
    handleImageFileSelected,
  }
}

export default useModelFormUploads
