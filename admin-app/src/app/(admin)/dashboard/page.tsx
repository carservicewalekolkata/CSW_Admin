import Link from 'next/link'

import {
  FiUsers,
  FiActivity,
  FiTool,
  FiShoppingBag,
  FiAlertTriangle,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi'

const metricCards = [
  {
    label: 'Active customers',
    value: '12,480',
    change: '+8.2% vs last week',
    icon: FiUsers,
  },
  {
    label: 'Active vehicle models',
    value: '226',
    change: '+12 new this month',
    icon: FiTool,
  },
  {
    label: 'Open service tickets',
    value: '37',
    change: '5 waiting on advisor',
    icon: FiActivity,
  },
  {
    label: "Today's bookings",
    value: '142',
    change: '+18% vs avg.',
    icon: FiShoppingBag,
  },
]

const activityFeed = [
  {
    title: 'New model request',
    description: 'Creta 2024 Diesel submitted by Vinay',
    time: '9:32 AM',
    status: 'Awaiting QA',
  },
  {
    title: 'Customer session',
    description: 'Mahesh browsed Detailing • Petrol i20',
    time: '9:05 AM',
    status: 'Converted',
  },
  {
    title: 'Service update',
    description: 'Battery replacement booking escalated',
    time: '8:47 AM',
    status: 'Pending pickup',
  },
  {
    title: 'Admin login',
    description: 'Swati (Ops) exported activity CSV',
    time: '8:18 AM',
    status: 'Completed',
  },
]

const alerts = [
  {
    title: 'Sitemap sync queued',
    detail: 'Brand “Maruti” awaiting background refresh.',
    severity: 'medium',
  },
  {
    title: 'Webhook retry scheduled',
    detail: 'GoMechanic integration failed twice.',
    severity: 'high',
  },
  {
    title: 'Inventory update',
    detail: 'Two parts catalogues older than 24h.',
    severity: 'low',
  },
]

const topModels = [
  { name: 'Swift Dzire Petrol', share: 32 },
  { name: 'Alto K10 CNG', share: 21 },
  { name: 'Tiago EV', share: 17 },
  { name: 'City Diesel', share: 11 },
]

const trendingServices = [
  { name: 'Detailing Service', delta: '+24%' },
  { name: 'SOS Pickup', delta: '+18%' },
  { name: 'AC Service', delta: '+11%' },
  { name: 'Batteries', delta: '+7%' },
]

const interactionAnalytics = {
  pages: [
    { label: 'Services > Detailing', value: 41 },
    { label: 'Services > Batteries', value: 28 },
    { label: 'Cars > Models', value: 19 },
    { label: 'Dashboard > Activity', value: 12 },
  ],
  actions: [
    { label: 'Book this service', value: 126 },
    { label: 'Compare packages', value: 74 },
    { label: 'Request callback', value: 52 },
    { label: 'Download checklist', value: 33 },
  ],
}

const DashboardPage = () => {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/90 p-5 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Dashboard overview</p>
          <h1 className="text-2xl font-semibold text-brand-800">Operations control centre</h1>
          <p className="text-sm text-brand-500">Monitor platform health, demand, and behaviour.</p>
        </div>
        <Link
          href="/dashboard/analytics"
          className="inline-flex items-center justify-center rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50"
        >
          View detailed analytics
        </Link>
      </header>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon
          return (
            <article
              key={card.label}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-50/80 to-white/80 p-4 shadow-sm backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">{card.label}</p>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-brand-800">{card.value}</p>
              <p className="text-xs font-medium text-emerald-600">{card.change}</p>
            </article>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm xl:col-span-2">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Recent activity</p>
              <h2 className="text-xl font-semibold text-brand-800">Cross-team timeline</h2>
            </div>
            <button
              type="button"
              className="text-sm font-semibold text-brand-600 underline-offset-4 hover:text-brand-700"
            >
              View log
            </button>
          </header>
          <ol className="mt-6 space-y-4">
            {activityFeed.map((item) => (
              <li key={item.title} className="flex gap-4">
                <div className="relative flex flex-col items-center">
                  <span className="mt-1 h-2 w-2 rounded-full bg-brand-500" />
                  <span className="h-full w-px bg-brand-100" />
                </div>
                <div className="flex-1 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-brand-800">{item.title}</p>
                    <span className="text-xs text-brand-400">{item.time}</span>
                  </div>
                  <p className="text-sm text-brand-600">{item.description}</p>
                  <p className="mt-2 text-xs font-semibold text-brand-500">{item.status}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Operational alerts</p>
            <h2 className="text-xl font-semibold text-brand-800">Attention needed</h2>
          </header>
          <ul className="mt-6 space-y-4">
            {alerts.map((alert) => (
              <li
                key={alert.title}
                className="rounded-2xl border border-brand-100/60 bg-brand-50/40 p-4 text-sm text-brand-700"
              >
                <div className="flex items-center gap-2">
                  <FiAlertTriangle className="text-amber-500" />
                  <p className="font-semibold">{alert.title}</p>
                </div>
                <p className="mt-1 text-xs text-brand-500">{alert.detail}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Demand snapshot</p>
              <h2 className="text-lg font-semibold text-brand-800">Top searched models & fuels</h2>
            </div>
            <FiTrendingUp className="h-5 w-5 text-brand-500" />
          </div>
          <ul className="mt-4 space-y-3">
            {topModels.map((model) => (
              <li key={model.name} className="flex items-center justify-between text-sm text-brand-700">
                <span className="truncate">{model.name}</span>
                <span className="text-brand-500">{model.share}% traffic</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Category momentum</p>
              <h2 className="text-lg font-semibold text-brand-800">Trending services</h2>
            </div>
            <FiZap className="h-5 w-5 text-amber-500" />
          </div>
          <ul className="mt-4 space-y-3 text-sm text-brand-700">
            {trendingServices.map((service) => (
              <li key={service.name} className="flex items-center justify-between">
                <span>{service.name}</span>
                <span className="text-emerald-600">{service.delta}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Interaction analytics</p>
            <h2 className="text-lg font-semibold text-brand-800">Top pages today</h2>
          </header>
          <ul className="mt-4 space-y-3">
            {interactionAnalytics.pages.map((page) => (
              <li key={page.label}>
                <div className="flex items-center justify-between text-sm text-brand-700">
                  <span>{page.label}</span>
                  <span className="text-brand-500">{page.value}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-brand-50">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
                    style={{ width: `${page.value}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              Interaction analytics
            </p>
            <h2 className="text-xl font-semibold text-brand-800">Top actions by users</h2>
          </div>
          <Link
            href="/dashboard/analytics"
            className="text-sm font-semibold text-brand-600 underline-offset-4 hover:text-brand-700"
          >
            Open insights
          </Link>
        </header>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Top page actions</p>
            <ul className="mt-4 space-y-3 text-sm text-brand-700">
              {interactionAnalytics.actions.map((action) => (
                <li key={action.label} className="flex items-center justify-between">
                  <span>{action.label}</span>
                  <span className="font-semibold text-brand-600">{action.value}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              Engagement summary
            </p>
            <ul className="mt-4 space-y-3 text-sm text-brand-700">
              <li className="flex items-center justify-between">
                <span>Avg. session time</span>
                <span className="font-semibold text-brand-600">05m 18s</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Conversions per visit</span>
                <span className="font-semibold text-brand-600">0.82</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Most engaged journey</span>
                <span className="font-semibold text-brand-600">Service → Booking</span>
              </li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  )
}

export default DashboardPage
