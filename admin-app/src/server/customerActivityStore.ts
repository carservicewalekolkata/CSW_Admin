import { randomUUID } from 'crypto'

import { connectToDatabase } from '@/lib/db'
import getCustomerActivitySessionModel, {
  type CustomerActivitySessionDocument,
} from '@/models/CustomerActivitySession'
import { consumeLoginOtpVerification, OtpError } from '@/server/otp/service'
import type {
  CustomerActivityEntry,
  CustomerActivityVehicle,
  CustomerSessionRecord,
  CustomerCartItem,
  CustomerCartHistory,
  CustomerCartStatus,
} from '@/types/customerActivity'

type SessionEntryDocument = CustomerActivitySessionDocument['entries'][number]

const formatVehicleSummary = (vehicle: CustomerActivityVehicle) =>
  `${vehicle.fuelType} ${vehicle.brandName} ${vehicle.modelName}`.replace(/\s+/g, ' ').trim()

const serviceCatalogBlueprint = [
  { name: 'Periodic maintenance', category: 'Core Service', price: 3299 },
  { name: 'Detailing overhaul', category: 'Detailing', price: 1899 },
  { name: 'Battery health check', category: 'Electrical', price: 1299 },
  { name: 'Wheel alignment', category: 'Tyres', price: 899 },
  { name: 'AC deep clean', category: 'Comfort', price: 1599 },
]

const createCartHistoryEntry = (note: string, status: CustomerCartStatus): CustomerCartHistory => ({
  id: randomUUID(),
  note,
  status,
  timestamp: new Date().toISOString(),
})

const seedFromString = (value: string) => {
  return value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

const createDefaultCartMetadata = (vehicle: CustomerActivityVehicle) => {
  const seed = seedFromString(`${vehicle.brandName}-${vehicle.modelName}-${vehicle.fuelType}`)
  const items: CustomerCartItem[] = serviceCatalogBlueprint
    .slice(0, 2 + (seed % 3))
    .map((item, index) => ({
      id: randomUUID(),
      name: `${item.name} (${vehicle.modelName})`,
      category: item.category,
      price: item.price + (index * 120 + (seed % 50)),
      quantity: index === 0 ? 1 : 2,
    }))

  const previousQueries = [
    `${vehicle.brandName} ${vehicle.modelName} service cost`,
    `${vehicle.modelName} ${vehicle.fuelType} nearby workshops`,
  ]

  const cartHistory = [createCartHistoryEntry('Cart created from vehicle search', 'hold')]

  return {
    cartStatus: 'hold' as CustomerCartStatus,
    cartItems: items,
    previousQueries,
    cartHistory,
  }
}

const ensureEntryMetadata = (entry: CustomerActivityEntry): CustomerActivityEntry => {
  let defaults: ReturnType<typeof createDefaultCartMetadata> | null = null
  const getDefaults = () => {
    if (!defaults) {
      defaults = createDefaultCartMetadata(entry.vehicle)
    }
    return defaults
  }

  if (!entry.cartStatus) {
    entry.cartStatus = 'hold'
  }
  if (!Array.isArray(entry.cartItems) || entry.cartItems.length === 0) {
    entry.cartItems = getDefaults().cartItems
  }
  if (!Array.isArray(entry.previousQueries) || entry.previousQueries.length === 0) {
    entry.previousQueries = getDefaults().previousQueries
  }
  if (!Array.isArray(entry.cartHistory) || entry.cartHistory.length === 0) {
    entry.cartHistory = getDefaults().cartHistory
  }
  return entry
}

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
): CustomerActivityEntry => {
  const defaults = createDefaultCartMetadata(vehicle)
  return {
    id: randomUUID(),
    sessionToken,
    phone,
    vehicle,
    vehicleSummary: formatVehicleSummary(vehicle),
    createdAt: new Date().toISOString(),
    cartStatus: defaults.cartStatus,
    cartItems: defaults.cartItems,
    previousQueries: defaults.previousQueries,
    cartHistory: defaults.cartHistory,
  }
}

const toPlain = <T extends { toObject?: () => Record<string, unknown> } | Record<string, unknown>>(
  value: T,
): Record<string, unknown> => {
  if (value && typeof (value as { toObject?: () => Record<string, unknown> }).toObject === 'function') {
    return (value as { toObject: () => Record<string, unknown> }).toObject()
  }
  return value as Record<string, unknown>
}

const mapEntry = (
  entry: CustomerActivityEntry | SessionEntryDocument | Record<string, unknown>,
): CustomerActivityEntry => {
  const plain = toPlain(entry) as CustomerActivityEntry
  const source = ensureEntryMetadata({
    id: String(plain.id),
    sessionToken: String(plain.sessionToken),
    phone: String(plain.phone),
    vehicle: {
      brandSlug: plain.vehicle.brandSlug,
      brandName: plain.vehicle.brandName,
      modelSlug: plain.vehicle.modelSlug,
      modelName: plain.vehicle.modelName,
      fuelType: plain.vehicle.fuelType,
    },
    vehicleSummary: plain.vehicleSummary,
    createdAt: plain.createdAt,
    cartStatus: plain.cartStatus,
    cartItems: (plain.cartItems ?? []).map((item: CustomerCartItem) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      quantity: item.quantity,
    })),
    previousQueries: [...(plain.previousQueries ?? [])],
    cartHistory: (plain.cartHistory ?? []).map((history: CustomerCartHistory) => ({
      id: history.id,
      note: history.note,
      status: history.status,
      timestamp: history.timestamp,
    })),
  })
  return source
}

const mapSessionRecord = (session: CustomerActivitySessionDocument | CustomerSessionRecord): CustomerSessionRecord => {
  if ('token' in session && !('toObject' in session)) {
    return {
      ...session,
      entries: [...session.entries].map((entry) => mapEntry(entry)),
    }
  }

  const plain = toPlain(session) as CustomerSessionRecord
  const entries = [...(plain.entries ?? [])]
    .map((entry) => mapEntry(toPlain(entry) as CustomerActivityEntry))
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
  return {
    token: plain.token,
    phone: plain.phone,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    entries,
  }
}

const getSessionModel = async () => {
  const mongooseInstance = await connectToDatabase()
  return getCustomerActivitySessionModel(mongooseInstance.connection)
}

export type RecordCustomerActivityInput = {
  sessionToken?: string | null
  phone?: string | null
  otpRequestId?: string | null
  vehicle: CustomerActivityVehicle
  cartStatus?: CustomerCartStatus
  cartItems?: CustomerCartItem[]
  previousQueries?: string[]
  cartHistory?: CustomerCartHistory[]
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
  otpRequestId,
  vehicle,
  cartStatus,
  cartItems,
  previousQueries,
  cartHistory,
}: RecordCustomerActivityInput): Promise<RecordCustomerActivityResult> => {
  if (!vehicle || !vehicle.brandSlug || !vehicle.modelSlug || !vehicle.fuelType) {
    throw new CustomerActivityError('Invalid vehicle details', 400)
  }

  const SessionModel = await getSessionModel()

  let sessionDoc: CustomerActivitySessionDocument | null = null

  if (sessionToken) {
    sessionDoc = await SessionModel.findOne({ token: sessionToken })
    if (!sessionDoc) {
      throw new CustomerActivityError('Session not found', 401)
    }
  } else {
    const trimmedPhone = phone?.trim()
    if (!trimmedPhone) {
      throw new CustomerActivityError('Phone number is required to create a session', 400)
    }

    if (otpRequestId) {
      try {
        await consumeLoginOtpVerification({ requestId: otpRequestId, phone: trimmedPhone })
      } catch (error) {
        if (error instanceof OtpError) {
          throw new CustomerActivityError(error.message, error.status)
        }
        throw new CustomerActivityError('Unable to confirm OTP verification.', 500)
      }
    }

    sessionDoc = new SessionModel(createSessionRecord(trimmedPhone))
  }

  const entry = createActivityEntry(sessionDoc.token, sessionDoc.phone, vehicle)
  if (cartStatus) {
    entry.cartStatus = cartStatus
  }
  if (Array.isArray(cartItems) && cartItems.length > 0) {
    entry.cartItems = cartItems
  }
  if (Array.isArray(previousQueries) && previousQueries.length > 0) {
    entry.previousQueries = previousQueries
  }
  if (Array.isArray(cartHistory) && cartHistory.length > 0) {
    entry.cartHistory = cartHistory
  }
  sessionDoc.entries.unshift(entry as unknown as SessionEntryDocument)
  sessionDoc.updatedAt = entry.createdAt

  await sessionDoc.save()

  return {
    session: mapSessionRecord(sessionDoc),
    entry: mapEntry(entry),
  }
}

export const listCustomerSessions = async (): Promise<CustomerSessionRecord[]> => {
  const SessionModel = await getSessionModel()
  const sessions = await SessionModel.find().sort({ updatedAt: -1 })
  return sessions.map((session) => mapSessionRecord(session))
}

export const updateCustomerCartStatus = async (entryId: string, status: CustomerCartStatus) => {
  const SessionModel = await getSessionModel()
  const historyEntry = createCartHistoryEntry(`Status changed to ${status}`, status)
  const session = await SessionModel.findOneAndUpdate(
    { 'entries.id': entryId },
    {
      $set: {
        'entries.$.cartStatus': status,
        updatedAt: new Date().toISOString(),
      },
      $push: {
        'entries.$.cartHistory': historyEntry,
      },
    },
    { new: true },
  )

  if (!session) {
    throw new CustomerActivityError('Entry not found', 404)
  }

  const entry = session.entries.find((item) => item.id === entryId)
  if (!entry) {
    throw new CustomerActivityError('Entry not found', 404)
  }

  return mapEntry(toPlain(entry) as CustomerActivityEntry)
}
