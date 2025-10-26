import { FiBarChart2, FiMousePointer, FiClock, FiTrendingUp } from 'react-icons/fi'

const sessionBreakdown = [
  { channel: 'Organic search', value: 42, change: '+5.2%' },
  { channel: 'Paid campaigns', value: 28, change: '+2.1%' },
  { channel: 'Direct visits', value: 18, change: '-1.4%' },
  { channel: 'Partnership links', value: 12, change: '+0.8%' },
]

const funnelSteps = [
  { label: 'Landing views', value: 100, drop: 0 },
  { label: 'Service exploration', value: 72, drop: 28 },
  { label: 'Add to compare', value: 46, drop: 26 },
  { label: 'Bookings confirmed', value: 21, drop: 25 },
]

const interactionHeatmap = [
  { section: 'Hero CTA', clicks: 312, intent: 'Book now' },
  { section: 'Service cards', clicks: 254, intent: 'View details' },
  { section: 'Comparison panel', clicks: 176, intent: 'Add to compare' },
  { section: 'WhatsApp widget', clicks: 142, intent: 'Chat with advisor' },
  { section: 'FAQ accordion', clicks: 88, intent: 'Read articles' },
]

const deviceSplit = [
  { label: 'Mobile', value: 61 },
  { label: 'Desktop', value: 32 },
  { label: 'Tablet', value: 7 },
]

const AnalyticsPage = () => {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border border-white/10 bg-white/90 p-6 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Interaction analytics</p>
          <h1 className="text-2xl font-semibold text-brand-800">User journey insights</h1>
          <p className="text-sm text-brand-500">Based on the last 7 days of aggregated telemetry events.</p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50">
            Export report
          </button>
          <button className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
            Configure events
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Sessions recorded', value: '8,420', meta: '+12% vs last week', icon: FiBarChart2 },
          { label: 'Interaction events', value: '26,380', meta: '9.8 per session', icon: FiMousePointer },
          { label: 'Avg. session time', value: '05m 42s', meta: '+24s vs previous', icon: FiClock },
          { label: 'Conversion uplift', value: '+18%', meta: 'after UX changes', icon: FiTrendingUp },
        ].map((card) => {
          const Icon = card.icon
          return (
            <article key={card.label} className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-50/80 to-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">{card.label}</p>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-brand-800">{card.value}</p>
              <p className="text-xs font-medium text-emerald-600">{card.meta}</p>
            </article>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm xl:col-span-2">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Engagement funnel</p>
              <h2 className="text-xl font-semibold text-brand-800">Journey drop-off analysis</h2>
            </div>
            <button className="text-sm font-semibold text-brand-600 underline-offset-2 hover:text-brand-700">
              Manage checkpoints
            </button>
          </header>
          <div className="mt-6 space-y-5">
            {funnelSteps.map((step, index) => (
              <div key={step.label}>
                <div className="flex items-center justify-between text-sm text-brand-700">
                  <span className="font-medium">
                    {index + 1}. {step.label}
                  </span>
                  <span className="text-brand-500">{step.value}%</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-brand-50">
                  <div
                    className="relative h-3 rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
                    style={{ width: `${step.value}%` }}
                  >
                    <span className="absolute -right-10 top-1/2 -translate-y-1/2 text-xs text-brand-400">
                      {step.drop ? `-${step.drop}%` : 'Entry'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Session sources</p>
            <h2 className="text-lg font-semibold text-brand-800">Channel performance</h2>
          </header>
          <ul className="mt-6 space-y-4 text-sm text-brand-700">
            {sessionBreakdown.map((row) => (
              <li key={row.channel} className="flex flex-col gap-1 rounded-2xl border border-brand-100/80 bg-brand-50/40 p-3">
                <div className="flex items-center justify-between">
                  <span>{row.channel}</span>
                  <span className="font-semibold text-brand-600">{row.value}%</span>
                </div>
                <span className="text-xs text-emerald-600">{row.change}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm xl:col-span-2">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Heatmap</p>
            <h2 className="text-xl font-semibold text-brand-800">Top interaction clusters</h2>
          </header>
          <table className="mt-4 w-full text-sm text-brand-700">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-brand-400">
                <th className="py-2">Section</th>
                <th className="py-2">Primary intent</th>
                <th className="py-2 text-right">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {interactionHeatmap.map((row) => (
                <tr key={row.section} className="border-t border-brand-50/80">
                  <td className="py-2 font-semibold">{row.section}</td>
                  <td className="py-2 text-brand-500">{row.intent}</td>
                  <td className="py-2 text-right font-semibold text-brand-600">{row.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Device mix</p>
            <h2 className="text-lg font-semibold text-brand-800">Experience footprint</h2>
          </header>
          <div className="mt-6 space-y-4">
            {deviceSplit.map((device) => (
              <div key={device.label}>
                <div className="flex items-center justify-between text-sm text-brand-700">
                  <span>{device.label}</span>
                  <span className="font-semibold text-brand-600">{device.value}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-brand-50">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
                    style={{ width: `${device.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

export default AnalyticsPage
