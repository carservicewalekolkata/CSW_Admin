export type CustomerActivityVehicle = {
  brandSlug: string
  brandName: string
  modelSlug: string
  modelName: string
  fuelType: string
}

export type CustomerCartStatus = 'hold' | 'solved' | 'cancelled'

export type CustomerCartItem = {
  id: string
  name: string
  category: string
  price: number
  quantity: number
}

export type CustomerCartHistory = {
  id: string
  note: string
  status: CustomerCartStatus
  timestamp: string
}

export type CustomerActivityEntry = {
  id: string
  sessionToken: string
  phone: string
  vehicle: CustomerActivityVehicle
  vehicleSummary: string
  createdAt: string
  cartStatus: CustomerCartStatus
  cartItems: CustomerCartItem[]
  previousQueries: string[]
  cartHistory: CustomerCartHistory[]
}

export type CustomerSessionRecord = {
  token: string
  phone: string
  createdAt: string
  updatedAt: string
  entries: CustomerActivityEntry[]
}
