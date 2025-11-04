import AccessGuide from './AccessGuide'
import RolesManager from './RolesManager'
import SuperAdminPanel from './SuperAdminPanel'

const SeedUsersModule = () => {
  return (
    <div className="space-y-10 pb-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-brand-800">Seed Users &amp; Roles</h1>
        <p className="text-sm text-brand-600/80">
          Review the seeded super admin credentials, rotate the login password, and set up role-based permissions for
          your teammates.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SuperAdminPanel />
        <AccessGuide />
      </section>

      <RolesManager />
    </div>
  )
}

export default SeedUsersModule
