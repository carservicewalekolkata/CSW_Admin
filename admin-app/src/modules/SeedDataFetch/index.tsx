'use client'

import { useMemo, useState } from 'react'

import type { SeedVendorDefinition, SeedVendorId } from '@/types/seed'

import { seedVendors } from './data/vendors'
import GomechanicPanel from './sections/GomechanicPanel'
import VendorGrid from './sections/VendorGrid'

const SeedDataFetchModule = () => {
  const [activeVendorId, setActiveVendorId] = useState<SeedVendorId>('gomechanic')

  const activeVendor = useMemo<SeedVendorDefinition | undefined>(
    () => seedVendors.find((vendor) => vendor.id === activeVendorId),
    [activeVendorId],
  )

  return (
    <div className="space-y-10 pb-12">
      <header className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-brand-800">Seed data ingestion</h1>
            <p className="max-w-3xl text-sm text-muted-500">
              Choose a marketplace integration, supply the necessary credentials, and schedule ingestion tasks. Start
              with GoMechanic to pull brands, models, and service catalogs into the CSW Admin experience.
            </p>
          </div>
          <span className="inline-flex rounded-pill border border-brand-200 bg-brand-50/70 px-4 py-2 text-xs font-medium uppercase tracking-wide text-brand-700">
            scripts/seed_gomechanic_data.py
          </span>
        </div>

        {activeVendor && (
          <div className="relative overflow-hidden rounded-[32px] border border-brand-100/60 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 p-6 text-white shadow-lg shadow-brand-900/20">
            <div className="absolute right-6 top-6 hidden h-24 w-24 rounded-full bg-brand-400/30 blur-2xl md:block" />
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)] md:items-center">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-3 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
                  <span className="rounded-full bg-white/20 px-2 py-1 text-[11px] tracking-[0.2em] text-white/80">LIVE</span>
                  <span>{activeVendor.name} integration</span>
                </div>
                <h2 className="text-2xl font-semibold text-white">Kickstart your GoMechanic data mirror</h2>
                <p className="max-w-2xl text-sm text-white/80">
                  Use the seeded workflow to ingest brands, vehicle models, and downstream service definitions. The UI
                  below captures runtime identifiers so the Python script stays configurable as GoMechanic evolves.
                </p>
              </div>

              <ul className="grid gap-3 rounded-3xl bg-white/10 p-4 backdrop-blur-sm">
                {activeVendor.highlights.map((highlight) => (
                  <li
                    key={highlight.id}
                    className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
                  >
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-white/80" />
                    <div>
                      <p className="font-semibold text-white">{highlight.label}</p>
                      {highlight.helper && <p className="text-xs text-white/70">{highlight.helper}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </header>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-brand-700">Available data sources</h2>
          <p className="text-xs text-muted-500">
            GoMechanic is enabled today. Additional vendors will surface here as soon as their connectors are ready.
          </p>
        </div>
        <VendorGrid vendors={seedVendors} activeVendorId={activeVendorId} onSelect={setActiveVendorId} />
      </section>

      <section>
        {activeVendor?.id === 'gomechanic' && <GomechanicPanel />}
        {activeVendor && activeVendor.id !== 'gomechanic' && (
          <ComingSoonNotice vendorName={activeVendor.name} eta={activeVendor.comingSoonEta} />
        )}
        {!activeVendor && (
          <ComingSoonNotice vendorName="This integration" eta="Integration details unavailable" />
        )}
      </section>
    </div>
  )
}

interface ComingSoonNoticeProps {
  vendorName: string
  eta?: string
}

const ComingSoonNotice = ({ vendorName, eta }: ComingSoonNoticeProps) => {
  return (
    <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/60 p-10 text-center text-brand-700">
      <h2 className="text-xl font-semibold">{vendorName} connector</h2>
      <p className="mt-3 text-sm text-muted-500">
        We&apos;re finalising the ingestion pipeline. Track roadmap updates in the release notes.
      </p>
      {eta && <p className="mt-2 text-xs text-brand-500">ETA: {eta}</p>}
    </div>
  )
}

export default SeedDataFetchModule
