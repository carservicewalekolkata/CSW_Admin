export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-400">Dashboard</p>
        <h1 className="text-3xl font-semibold text-brand-700">Good to see you again</h1>
        <p className="text-sm text-muted-500">
          Pick a module from the navigation to jump into catalogue management, operations,
          or settings. This dashboard will soon surface quick stats and recent activity.
        </p>
      </header>

      <section className="grid gap-5 rounded-3xl border border-brand-100/60 bg-surface p-6 shadow-sm lg:grid-cols-3">
        {[
          { label: 'Brands in catalogue', value: '—', hint: 'Sync data to populate metrics.' },
          { label: 'Active workshops', value: '—', hint: 'Connect operational data sources.' },
          { label: 'Pending approvals', value: '—', hint: 'Assign roles to teammates.' },
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-2xl bg-brand-50/60 p-5 text-brand-700 shadow-inner"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-brand-500/80">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            <p className="mt-2 text-xs text-brand-400">{card.hint}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/40 p-6 text-sm text-muted-500">
        Shortcuts, announcements, and saved searches will live here. For now, use the new
        Canva-style navigation to explore each workspace.
      </section>
    </div>
  )
}
