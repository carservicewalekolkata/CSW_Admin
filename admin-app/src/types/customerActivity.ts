export type CustomerActivityVehicle = {
  brandSlug: string
  brandName: string
  modelSlug: string
  modelName: string
  fuelType: string
}

// Cart lifecycle: user-driven (on-cart, booked) then admin-driven (solved, cancelled)
export type CustomerCartStatus = 'on-cart' | 'booked' | 'solved' | 'cancelled'

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

export type CustomerSearchEvent = {
  id: string
  source: string
  timestamp: string
}

export type CustomerActivityEntry = {
  id: string
  sessionToken: string
  phone: string
  vehicle: CustomerActivityVehicle
  vehicleSummary: string
  createdAt: string
  // When the user lands on the services page for this vehicle
  servicePageVisitedAt?: string | null
  cartStatus: CustomerCartStatus
  cartItems: CustomerCartItem[]
  previousQueries: string[]
  cartHistory: CustomerCartHistory[]
  searches: CustomerSearchEvent[]
}

export type CustomerSessionRecord = {
  token: string
  phone: string
  createdAt: string
  updatedAt: string
  entries: CustomerActivityEntry[]
}
