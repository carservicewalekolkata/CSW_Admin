import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

export const MOCK_OTP_CODE = '1234'

export type CustomerActivityVehicle = {
  brandSlug: string
  brandName: string
  modelSlug: string
  modelName: string
  fuelType: string
}

export type CustomerActivityEntry = {
  id: string
  sessionToken: string
  phone: string
  vehicle: CustomerActivityVehicle
  vehicleSummary: string
  createdAt: string
}

export type CustomerSessionRecord = {
  token: string
  phone: string
  createdAt: string
  updatedAt: string
  entries: CustomerActivityEntry[]
}

type CustomerActivityStoreData = {
  sessions: CustomerSessionRecord[]
}

const DATA_DIRECTORY = path.join(process.cwd(), 'data')
const DATA_FILE_PATH = path.join(DATA_DIRECTORY, 'customer-activity.json')

const defaultStoreData: CustomerActivityStoreData = {
  sessions: [],
}

const ensureDataFile = async () => {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true })
  try {
    await fs.access(DATA_FILE_PATH)
  } catch {
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(defaultStoreData, null, 2), 'utf8')
  }
}

const readStore = async (): Promise<CustomerActivityStoreData> => {
  await ensureDataFile()
  try {
    const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8')
    const parsed = JSON.parse(fileContents)
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sessions)) {
      return parsed as CustomerActivityStoreData
    }
  } catch (error) {
    console.error('Failed to read customer activity store. Re-initialising.', error)
  }
  return { ...defaultStoreData }
}

const writeStore = async (data: CustomerActivityStoreData) => {
  await ensureDataFile()
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf8')
}

const formatVehicleSummary = (vehicle: CustomerActivityVehicle) =>
  `${vehicle.fuelType} ${vehicle.brandName} ${vehicle.modelName}`.replace(/\s+/g, ' ').trim()

const createSessionRecord = (phone: string): CustomerSessionRecord => {
  const timestamp = new Date().toISOString()
  return {
    token: randomUUID(),
    phone,
    createdAt: timestamp,
    updatedAt: timestamp,
    entries: [],
  }
}

const createActivityEntry = (
  sessionToken: string,
  phone: string,
  vehicle: CustomerActivityVehicle,
): CustomerActivityEntry => ({
  id: randomUUID(),
  sessionToken,
  phone,
  vehicle,
  vehicleSummary: formatVehicleSummary(vehicle),
  createdAt: new Date().toISOString(),
})

export type RecordCustomerActivityInput = {
  sessionToken?: string | null
  phone?: string | null
  vehicle: CustomerActivityVehicle
}

export type RecordCustomerActivityResult = {
  session: CustomerSessionRecord
  entry: CustomerActivityEntry
}

export class CustomerActivityError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export const recordCustomerActivity = async ({
  sessionToken,
  phone,
  vehicle,
}: RecordCustomerActivityInput): Promise<RecordCustomerActivityResult> => {
  if (!vehicle || !vehicle.brandSlug || !vehicle.modelSlug || !vehicle.fuelType) {
    throw new CustomerActivityError('Invalid vehicle details', 400)
  }

  const store = await readStore()

  let session: CustomerSessionRecord | undefined

  if (sessionToken) {
    session = store.sessions.find((existingSession) => existingSession.token === sessionToken)
    if (!session) {
      throw new CustomerActivityError('Session not found', 401)
    }
  } else {
    const trimmedPhone = phone?.trim()
    if (!trimmedPhone) {
      throw new CustomerActivityError('Phone number is required to create a session', 400)
    }
    session = createSessionRecord(trimmedPhone)
    store.sessions.push(session)
  }

  const entry = createActivityEntry(session.token, session.phone, vehicle)
  session.entries.unshift(entry)
  session.updatedAt = entry.createdAt

  store.sessions.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))

  await writeStore(store)

  return {
    session,
    entry,
  }
}

export const listCustomerSessions = async (): Promise<CustomerSessionRecord[]> => {
  const store = await readStore()
  return store.sessions.map((session) => ({
    ...session,
    entries: [...session.entries].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)),
  }))
}
