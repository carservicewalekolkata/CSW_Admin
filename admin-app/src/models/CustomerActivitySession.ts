import { Schema, type Connection, type Document } from 'mongoose'

import { getMongooseModelForConnection } from '@/utils/getMongooseModelForConnection'

export interface CustomerCartItemDocument extends Document {
  id: string
  name: string
  category: string
  price: number
  quantity: number
}

export interface CustomerCartHistoryDocument extends Document {
  id: string
  note: string
  status: 'hold' | 'solved' | 'cancelled'
  timestamp: string
}

export interface CustomerActivityEntryDocument extends Document {
  id: string
  sessionToken: string
  phone: string
  vehicle: {
    brandSlug: string
    brandName: string
    modelSlug: string
    modelName: string
    fuelType: string
  }
  vehicleSummary: string
  createdAt: string
  cartStatus: 'hold' | 'solved' | 'cancelled'
  cartItems: CustomerCartItemDocument[]
  previousQueries: string[]
  cartHistory: CustomerCartHistoryDocument[]
}

export interface CustomerActivitySessionDocument extends Document {
  token: string
  phone: string
  createdAt: string
  updatedAt: string
  entries: CustomerActivityEntryDocument[]
}

const cartItemSchema = new Schema<CustomerCartItemDocument>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false },
)

const cartHistorySchema = new Schema<CustomerCartHistoryDocument>(
  {
    id: { type: String, required: true },
    note: { type: String, required: true },
    status: { type: String, enum: ['hold', 'solved', 'cancelled'], required: true },
    timestamp: { type: String, required: true },
  },
  { _id: false },
)

const vehicleSchema = new Schema(
  {
    brandSlug: { type: String, required: true },
    brandName: { type: String, required: true },
    modelSlug: { type: String, required: true },
    modelName: { type: String, required: true },
    fuelType: { type: String, required: true },
  },
  { _id: false },
)

const entrySchema = new Schema<CustomerActivityEntryDocument>(
  {
    id: { type: String, required: true },
    sessionToken: { type: String, required: true },
    phone: { type: String, required: true },
    vehicle: { type: vehicleSchema, required: true },
    vehicleSummary: { type: String, required: true },
    createdAt: { type: String, required: true },
    cartStatus: { type: String, enum: ['hold', 'solved', 'cancelled'], default: 'hold' },
    cartItems: { type: [cartItemSchema], default: [] },
    previousQueries: { type: [String], default: [] },
    cartHistory: { type: [cartHistorySchema], default: [] },
  },
  { _id: false },
)

const sessionSchemaFactory = () =>
  new Schema<CustomerActivitySessionDocument>(
    {
      token: { type: String, required: true, unique: true },
      phone: { type: String, required: true },
      createdAt: { type: String, required: true },
      updatedAt: { type: String, required: true },
      entries: { type: [entrySchema], default: [] },
    },
    {
      collection: 'customer_activity_sessions',
    },
  )

export default function getCustomerActivitySessionModel(connection: Connection) {
  return getMongooseModelForConnection<CustomerActivitySessionDocument>(
    connection,
    'CustomerActivitySession',
    sessionSchemaFactory,
  )
}
