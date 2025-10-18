import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  BlockBlobClient,
} from '@azure/storage-blob'

type AzureStorageConfig = {
  account: string
  key: string
  container: string
}

const loadConfig = (): AzureStorageConfig | null => {
  const account = process.env.AZURE_STORAGE_ACCOUNT
  const key = process.env.AZURE_STORAGE_ACCOUNT_KEY
  const container = process.env.AZURE_STORAGE_CONTAINER

  if (!account || !key || !container) {
    return null
  }

  return { account, key, container }
}

const getConfig = (): AzureStorageConfig => {
  const config = loadConfig()
  if (!config) {
    throw new Error('Azure storage configuration is missing')
  }
  return config
}

let containerClientPromise: Promise<ContainerClient> | null = null

const getContainerClient = (): Promise<ContainerClient> => {
  if (!containerClientPromise) {
    containerClientPromise = (async () => {
      const { account, key, container } = getConfig()
      const credential = new StorageSharedKeyCredential(account, key)
      const blobServiceClient = new BlobServiceClient(
        `https://${account}.blob.core.windows.net`,
        credential,
      )
      const client = blobServiceClient.getContainerClient(container)
      await client.createIfNotExists().catch((error) => {
        if (error?.statusCode !== 409) {
          throw error
        }
      })
      return client
    })()
  }

  return containerClientPromise
}

const sanitizeBlobName = (blobName: string) => blobName.replace(/^\/+/, '')

const getBlockBlobClient = async (blobName: string): Promise<BlockBlobClient> => {
  const client = await getContainerClient()
  const sanitizedName = sanitizeBlobName(blobName)
  return client.getBlockBlobClient(sanitizedName)
}

export const AZURE_MODEL_IMAGE_SCHEME = 'azure:'

export const buildModelImageProxyUrl = (blobName: string) => {
  const sanitized = sanitizeBlobName(blobName)
  const encoded = sanitized.split('/').map(encodeURIComponent).join('/')
  return `/api/v1/cars/models/image/blob/${encoded}`
}

export const uploadModelImage = async (blobName: string, data: Buffer, contentType?: string) => {
  const blobClient = await getBlockBlobClient(blobName)

  await blobClient.uploadData(data, {
    blobHTTPHeaders: contentType
      ? {
          blobContentType: contentType,
        }
      : undefined,
  })
}

export const deleteModelImageIfExists = async (blobName: string) => {
  const blobClient = await getBlockBlobClient(blobName)
  await blobClient.deleteIfExists()
}

export const downloadModelImage = async (blobName: string) => {
  const blobClient = await getBlockBlobClient(blobName)
  return blobClient.download()
}

export const extractModelImageBlobName = (value: string | null | undefined) => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith(AZURE_MODEL_IMAGE_SCHEME)) {
    return trimmed.slice(AZURE_MODEL_IMAGE_SCHEME.length)
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return null
  }

  try {
    const config = loadConfig()
    if (!config) {
      return null
    }
    const { account, container } = config
    const parsed = new URL(trimmed)
    const expectedHost = `${account}.blob.core.windows.net`
    if (parsed.hostname !== expectedHost) {
      return null
    }
    const path = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''))
    if (!path.toLowerCase().startsWith(`${container.toLowerCase()}/`)) {
      return null
    }
    return path.slice(container.length + 1)
  } catch {
    return null
  }
}

export const isAzureManagedModelImage = (value: string | null | undefined) =>
  Boolean(extractModelImageBlobName(value))
