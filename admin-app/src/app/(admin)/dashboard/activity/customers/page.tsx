import CustomersActivityTable, {
  type CustomerActivityRow,
} from '@/modules/Activity/Customers/CustomersActivityTable'
import { listCustomerSessions } from '@/server/customerActivityStore'

const buildRows = async (): Promise<CustomerActivityRow[]> => {
  const sessions = await listCustomerSessions()

  return sessions.flatMap((session) =>
    session.entries.map((entry, index) => ({
      id: entry.id,
      phone: session.phone,
      vehicleSummary: entry.vehicleSummary,
      brandName: entry.vehicle.brandName,
      modelName: entry.vehicle.modelName,
      fuelType: entry.vehicle.fuelType,
      searchedAt: entry.createdAt,
      sessionToken: session.token,
      searchNumber: session.entries.length - index,
    })),
  )
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
