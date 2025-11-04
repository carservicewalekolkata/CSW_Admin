'use client'

import { useState } from 'react'
import { FiFilter, FiRefreshCcw, FiClock, FiActivity, FiUsers, FiMousePointer } from 'react-icons/fi'

const summaryCards = [
  { label: 'Events captured', value: '18,420', meta: 'Last 24h', icon: FiActivity },
  { label: 'Customer sessions', value: '3,215', meta: '312 active now', icon: FiUsers },
  { label: 'Admin actions', value: '642', meta: 'Ops & Merch teams', icon: FiMousePointer },
  { label: 'Median response time', value: '42s', meta: 'Support SLA', icon: FiClock },
]

const streamEntries = [
  {
    title: 'Service booking created',
    desc: 'Baleno Petrol • Detailing package confirmed',
    actor: 'Customer • Pratik',
    time: '09:42 AM',
    channel: 'Web app',
  },
  {
    title: 'Model fuel update',
    desc: 'Hyryder added HyFlex fuel variant',
    actor: 'Admin • Swati',
    time: '09:11 AM',
    channel: 'Admin console',
  },
  {
    title: 'Callback requested',
    desc: 'SOS category from mobile widget',
    actor: 'Customer • Farhan',
    time: '08:57 AM',
    channel: 'WhatsApp',
  },
  {
    title: 'SEO sitemap sync',
    desc: 'Tata brand sitemap refreshed in background',
    actor: 'System job',
    time: '08:26 AM',
    channel: 'Server task',
  },
]

const sessionTable = [
  {
    id: 'SES-10824',
    user: 'Mahesh Kumar',
    intent: 'Compare periodic services',
    device: 'Android',
    duration: '08m 14s',
    status: 'Converted',
  },
  {
    id: 'SES-10813',
    user: 'Divya Rathore',
    intent: 'Browse tyre offers',
    device: 'iOS',
    duration: '03m 48s',
    status: 'Exploring',
  },
  {
    id: 'SES-10807',
    user: 'Ravi Sharma',
    intent: 'Book SOS pickup',
    device: 'Desktop',
    duration: '05m 21s',
    status: 'Escalated',
  },
  {
    id: 'SES-10802',
    user: 'Shreya Jain',
    intent: 'Update saved vehicles',
    device: 'Android',
    duration: '02m 19s',
    status: 'Completed',
  },
]

const segments = ['All activity', 'Customer events', 'Admin edits', 'System jobs']

const topPages = [
  { path: 'Services / Detailing', percent: 37, avgTime: '06m 18s' },
  { path: 'Services / Batteries', percent: 24, avgTime: '04m 02s' },
  { path: 'Cars / Models', percent: 18, avgTime: '03m 44s' },
  { path: 'Dashboard / Activity', percent: 11, avgTime: '05m 05s' },
]

const interactionElements = [
  { label: 'Book this service CTA', events: 612, conversion: '34%' },
  { label: 'Compare packages toggle', events: 418, conversion: '22%' },
  { label: 'WhatsApp widget', events: 286, conversion: '14%' },
  { label: 'Download checklist', events: 203, conversion: '9%' },
]

const DashboardActivityPage = () => {
  const [activeSegment, setActiveSegment] = useState('All activity')

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-white/10 bg-white/90 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Activity center</p>
            <h1 className="text-2xl font-semibold text-brand-800">Live event stream</h1>
            <p className="text-sm text-brand-500">Audit every customer interaction, admin change, and background job.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50">
              <FiFilter className="h-4 w-4" />
              Filters
            </button>
            <button className="inline-flex items-center gap-2 rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50">
              <FiRefreshCcw className="h-4 w-4" />
              Sync now
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
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
              <p className="text-xs font-medium text-brand-500">{card.meta}</p>
            </article>
          )
        })}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-brand-800">Event segments</h2>
          <div className="flex flex-wrap gap-2">
            {segments.map((segment) => (
              <button
                key={segment}
                type="button"
                onClick={() => setActiveSegment(segment)}
                className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                  activeSegment === segment ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                }`}
              >
                {segment}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm xl:col-span-2">
          <header className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Chronology</p>
            <span className="text-xs text-brand-400">Showing {activeSegment.toLowerCase()}</span>
          </header>
          <ol className="mt-6 space-y-4">
            {streamEntries.map((entry) => (
              <li key={entry.title} className="flex gap-4">
                <div className="relative flex flex-col items-center">
                  <span className="mt-1 h-2 w-2 rounded-full bg-brand-500" />
                  <span className="h-full w-px bg-brand-100" />
                </div>
                <div className="flex-1 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-brand-800">{entry.title}</p>
                    <span className="text-xs text-brand-400">{entry.time}</span>
                  </div>
                  <p className="text-sm text-brand-600">{entry.desc}</p>
                  <p className="mt-2 text-xs font-semibold text-brand-500">{entry.actor} • {entry.channel}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Live session pulse</p>
            <h2 className="text-lg font-semibold text-brand-800">Recent customer journeys</h2>
          </header>
          <table className="mt-4 w-full text-sm text-brand-700">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-brand-400">
                <th className="py-2">Session</th>
                <th className="py-2">Intent</th>
                <th className="py-2">Device</th>
                <th className="py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessionTable.map((session) => (
                <tr key={session.id} className="border-t border-brand-50/80">
                  <td className="py-2">
                    <p className="font-semibold">{session.user}</p>
                    <p className="text-xs text-brand-400">{session.id}</p>
                  </td>
                  <td className="py-2 text-brand-500">{session.intent}</td>
                  <td className="py-2 text-brand-500">{session.device}</td>
                  <td className="py-2 text-right font-semibold text-brand-600">{session.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Interaction analytics</p>
            <h2 className="text-lg font-semibold text-brand-800">Most visited pages</h2>
          </header>
          <ul className="mt-4 space-y-3">
            {topPages.map((page) => (
              <li key={page.path} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
                <div className="flex items-center justify-between text-sm text-brand-700">
                  <span>{page.path}</span>
                  <span className="font-semibold text-brand-600">{page.percent}%</span>
                </div>
                <p className="text-xs text-brand-500">Avg. time on page · {page.avgTime}</p>
                <div className="mt-3 h-2 rounded-full bg-brand-50">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
                    style={{ width: `${page.percent}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-3xl border border-white/10 bg-white p-6 shadow-sm">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Hot elements</p>
            <h2 className="text-lg font-semibold text-brand-800">Most interacted components</h2>
          </header>
          <table className="mt-4 w-full text-sm text-brand-700">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-brand-400">
                <th className="py-2">Element</th>
                <th className="py-2 text-right">Events</th>
                <th className="py-2 text-right">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {interactionElements.map((element) => (
                <tr key={element.label} className="border-t border-brand-50/80">
                  <td className="py-2 font-semibold">{element.label}</td>
                  <td className="py-2 text-right text-brand-600">{element.events}</td>
                  <td className="py-2 text-right text-emerald-600">{element.conversion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
    </div>
  )
}

export default DashboardActivityPage
