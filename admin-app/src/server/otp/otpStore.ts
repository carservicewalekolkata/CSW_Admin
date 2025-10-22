import { createHash, randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

type OtpRequestRecord = {
  id: string
  phone: string
  codeHash: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  attempts: number
  maxAttempts: number
  verifiedAt?: string
  consumedAt?: string
}

type OtpStoreData = {
  requests: OtpRequestRecord[]
}

const DATA_DIRECTORY = path.join(process.cwd(), 'data')
const DATA_FILE_PATH = path.join(DATA_DIRECTORY, 'otp-requests.json')

const defaultStoreData: OtpStoreData = {
  requests: [],
}

const ensureOtpStore = async () => {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true })
  try {
    await fs.access(DATA_FILE_PATH)
  } catch {
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(defaultStoreData, null, 2), 'utf8')
  }
}

const readStore = async (): Promise<OtpStoreData> => {
  await ensureOtpStore()
  try {
    const contents = await fs.readFile(DATA_FILE_PATH, 'utf8')
    const parsed = JSON.parse(contents)
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.requests)) {
      return parsed as OtpStoreData
    }
  } catch (error) {
    console.error('Failed to read OTP store; reinitialising.', error)
  }
  return { ...defaultStoreData }
}

const writeStore = async (data: OtpStoreData) => {
  await ensureOtpStore()
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf8')
}

const sanitizePhone = (phone: string) => phone.replace(/\D/g, '')

const hashCode = (phone: string, code: string) =>
  createHash('sha256').update(`${phone}:${code}`).digest('hex')

const pruneExpired = (records: OtpRequestRecord[], reference: Date) =>
  records.filter((record) => {
    const expiresAt = new Date(record.expiresAt).getTime()
    const consumedAt = record.consumedAt ? new Date(record.consumedAt).getTime() : null
    if (consumedAt && consumedAt <= reference.getTime()) {
      return false
    }
    return expiresAt >= reference.getTime()
  })

export type CreateOtpRecordInput = {
  phone: string
  code: string
  validityMinutes: number
  maxAttempts: number
}

export type OtpRecordHandle = {
  id: string
  phone: string
  expiresAt: string
}

export const createOtpRecord = async ({
  phone,
  code,
  validityMinutes,
  maxAttempts,
}: CreateOtpRecordInput): Promise<OtpRecordHandle> => {
  const sanitizedPhone = sanitizePhone(phone)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + validityMinutes * 60 * 1000)

  const store = await readStore()
  store.requests = pruneExpired(store.requests, now).filter(
    (record) => record.phone !== sanitizedPhone || record.consumedAt,
  )

  const record: OtpRequestRecord = {
    id: randomUUID(),
    phone: sanitizedPhone,
    codeHash: hashCode(sanitizedPhone, code),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    attempts: 0,
    maxAttempts: Math.max(1, maxAttempts),
  }

  store.requests.push(record)
  await writeStore(store)

  return {
    id: record.id,
    phone: record.phone,
    expiresAt: record.expiresAt,
  }
}

export type VerifyOtpInput = {
  requestId: string
  phone: string
  code: string
}

export type VerifyOtpResult = {
  id: string
  phone: string
  expiresAt: string
  verifiedAt: string
  attemptsRemaining: number
}

export class OtpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const findOtpRecord = (store: OtpStoreData, requestId: string, phone: string) =>
  store.requests.find((record) => record.id === requestId && record.phone === phone)

export const verifyOtpRecord = async ({
  requestId,
  phone,
  code,
}: VerifyOtpInput): Promise<VerifyOtpResult> => {
  const sanitizedPhone = sanitizePhone(phone)
  const trimmedCode = code.replace(/\D/g, '')
  const now = new Date()

  const store = await readStore()
  store.requests = pruneExpired(store.requests, now)

  const record = findOtpRecord(store, requestId, sanitizedPhone)
  if (!record) {
    await writeStore(store)
    throw new OtpError('OTP request not found or expired. Please request a new OTP.', 404)
  }

  if (record.consumedAt) {
    await writeStore(store)
    throw new OtpError('This OTP has already been used. Please request a new OTP.', 410)
  }

  const expiresAt = new Date(record.expiresAt)
  if (expiresAt.getTime() < now.getTime()) {
    await writeStore(store)
    throw new OtpError('OTP has expired. Please request a new OTP.', 410)
  }

  if (record.attempts >= record.maxAttempts && record.verifiedAt === undefined) {
    await writeStore(store)
    throw new OtpError('Maximum OTP attempts exceeded. Please request a new OTP.', 429)
  }

  const expectedHash = hashCode(record.phone, trimmedCode)
  const isMatch = expectedHash === record.codeHash

  record.attempts += 1
  record.updatedAt = now.toISOString()

  if (!isMatch) {
    await writeStore(store)
    const attemptsLeft = Math.max(0, record.maxAttempts - record.attempts)
    throw new OtpError(
      attemptsLeft > 0
        ? `Incorrect OTP. You have ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`
        : 'Incorrect OTP entered too many times. Please request a new OTP.',
      attemptsLeft > 0 ? 401 : 429,
    )
  }

  if (!record.verifiedAt) {
    record.verifiedAt = now.toISOString()
  }

  await writeStore(store)

  return {
    id: record.id,
    phone: record.phone,
    expiresAt: record.expiresAt,
    verifiedAt: record.verifiedAt,
    attemptsRemaining: Math.max(0, record.maxAttempts - record.attempts),
  }
}

export type ConsumeOtpInput = {
  requestId: string
  phone: string
}

export const consumeOtpRecord = async ({ requestId, phone }: ConsumeOtpInput): Promise<void> => {
  const sanitizedPhone = sanitizePhone(phone)
  const now = new Date()
  const store = await readStore()
  store.requests = pruneExpired(store.requests, now)

  const record = findOtpRecord(store, requestId, sanitizedPhone)
  if (!record) {
    await writeStore(store)
    throw new OtpError('OTP verification not found. Please request a new OTP.', 404)
  }

  if (record.consumedAt) {
    await writeStore(store)
    throw new OtpError('OTP verification already used. Please request a new OTP.', 409)
  }

  if (!record.verifiedAt) {
    await writeStore(store)
    throw new OtpError('OTP has not been verified yet.', 412)
  }

  const expiresAt = new Date(record.expiresAt)
  if (expiresAt.getTime() < now.getTime()) {
    await writeStore(store)
    throw new OtpError('OTP verification expired. Please request a new OTP.', 410)
  }

  record.consumedAt = now.toISOString()
  record.updatedAt = now.toISOString()

  await writeStore(store)
}

export const deleteOtpRecord = async (requestId: string) => {
  const store = await readStore()
  const initialLength = store.requests.length
  store.requests = store.requests.filter((record) => record.id !== requestId)
  if (store.requests.length !== initialLength) {
    await writeStore(store)
  }
}
