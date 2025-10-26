import CustomersActivityTable, { type CustomerActivityRow } from '@/modules/Activity/Customers/CustomersActivityTable'
import { listCustomerSessions } from '@/server/customerActivityStore'

const buildRows = async (): Promise<CustomerActivityRow[]> => {
  const sessions = await listCustomerSessions()

  const rows = sessions.flatMap((session) =>
    session.entries.map((entry) => ({
      id: entry.id,
      phone: session.phone,
      vehicleSummary: entry.vehicleSummary,
      brandName: entry.vehicle.brandName,
      modelName: entry.vehicle.modelName,
      fuelType: entry.vehicle.fuelType,
      searchedAt: entry.createdAt,
      sessionToken: session.token,
      searchNumber: 0,
      cartStatus: entry.cartStatus,
      cartItems: entry.cartItems,
      previousQueries: entry.previousQueries,
      cartHistory: entry.cartHistory,
    })),
  )

  rows.sort((a, b) => (a.searchedAt > b.searchedAt ? -1 : 1))
  rows.forEach((row, index) => {
    row.searchNumber = rows.length - index
  })

  return rows
}

const CustomersActivityPage = async () => {
  const rows = await buildRows()

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">Dashboard • Customers</p>
        <h1 className="text-2xl font-bold text-brand-900">Verified Customer Activity</h1>
        <p className="max-w-2xl text-sm text-brand-600">
          Track which vehicles customers were interested in right after they verify their number. Subsequent searches
          from an active session appear here automatically.
        </p>
      </header>
      <CustomersActivityTable rows={rows} />
    </div>
  )
}

export default CustomersActivityPage
