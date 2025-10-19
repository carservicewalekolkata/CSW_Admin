export type SeedVendorId = 'gomechanic' | 'spinny' | 'cars24'

export type SeedVendorStatus = 'ready' | 'coming-soon'

export interface SeedVendorMeta {
  id: SeedVendorId
  name: string
  status: SeedVendorStatus
  description: string
  accentColor: string
  logo?: string
  helperText?: string
  comingSoonEta?: string
}

export interface SeedVendorHighlight {
  id: string
  label: string
  helper?: string
}

export interface SeedVendorDefinition extends SeedVendorMeta {
  highlights: SeedVendorHighlight[]
}
