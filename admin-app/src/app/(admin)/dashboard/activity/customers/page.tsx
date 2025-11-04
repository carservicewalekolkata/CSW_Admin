import CustomersActivityTable, { type CustomerActivityRow } from '@/modules/Activity/Customers/CustomersActivityTable'
export const dynamic = 'force-dynamic'
import { listCustomerSessions } from '@/server/customerActivityStore'

const buildRows = async (): Promise<CustomerActivityRow[]> => {
  const sessions = await listCustomerSessions()

  const byPhone = new Map<string, CustomerActivityRow>()

  for (const session of sessions) {
    const sorted = [...session.entries].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    if (sorted.length === 0) continue
    const latest = sorted[0]
    const searchEvents = sorted.map((e) => ({
      label: `${e.vehicle.fuelType} ${e.vehicle.brandName} ${e.vehicle.modelName}`.replace(/\s+/g, ' ').trim(),
      timestamp: e.createdAt,
    }))
    const searchChips = searchEvents.map((e) => e.label)

    const existing = byPhone.get(session.phone)
    if (!existing || existing.searchedAt < latest.createdAt) {
      byPhone.set(session.phone, {
        id: latest.id,
        phone: session.phone,
        vehicleSummary: latest.vehicleSummary,
        brandName: latest.vehicle.brandName,
        modelName: latest.vehicle.modelName,
        searchedAt: latest.createdAt,
        sessionToken: session.token,
        searchNumber: 0,
        searches: Array.from(new Set([...(existing?.searches ?? []), ...searchChips])),
        searchEvents: [...(existing?.searchEvents ?? []), ...searchEvents],
        cartStatus: latest.cartStatus,
        cartItems: latest.cartItems,
        previousQueries: latest.previousQueries,
        cartHistory: latest.cartHistory,
      })
    } else {
      existing.searches = Array.from(new Set([...(existing.searches ?? []), ...searchChips]))
      existing.searchEvents = [...(existing.searchEvents ?? []), ...searchEvents]
    }
  }

  const rows = Array.from(byPhone.values())

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
