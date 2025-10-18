import { toast } from '@/lib/sonner'

import { resolveBrandErrorMessage } from '@/utils/brands'

const MAX_ICON_SIZE_BYTES = 1.5 * 1024 * 1024

type UseBrandIconUploadParams = {
  setIconId: (value: string) => void
  setIconPreviewUrl: (url: string | null) => void
  setIconUploadError: (error: string | null) => void
  setIsUploadingIcon: (value: boolean) => void
}

export const useBrandIconUpload = ({
  setIconId,
  setIconPreviewUrl,
  setIconUploadError,
  setIsUploadingIcon,
}: UseBrandIconUploadParams) =>
  async (file: File) => {
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

      const response = await fetch('/api/v1/cars/brands/icon', {
        method: 'POST',
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as
        | { success: boolean; iconId: string; url?: string; message?: string }
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
      setIconPreviewUrl(payload.url ?? `/api/v1/cars/brands/icon/${payload.iconId}`)
      toast.success('Icon uploaded')
    } catch (err) {
      const message = err instanceof Error ? err.message : resolveBrandErrorMessage(err, 'Failed to upload icon')
      setIconUploadError(message)
      toast.error(message)
    } finally {
      setIsUploadingIcon(false)
    }
  }

export default useBrandIconUpload
