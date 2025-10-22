export interface GomechanicOperation {
  id: 'seed-brands-data' | 'seed-models-data' | 'seed-services-data'
  label: string
  description: string
}

export const gomechanicOperations: GomechanicOperation[] = [
  {
    id: 'seed-brands-data',
    label: 'Seed brands data',
    description: 'Fetch brand catalog, download icons, and upsert brand documents with incremental IDs.',
  },
  {
    id: 'seed-models-data',
    label: 'Seed models data',
    description:
      'Iterate each brand to sync models, hero images, and GridFS thumbnails while linking to brand IDs.',
  },
  {
    id: 'seed-services-data',
    label: 'Seed services data',
    description:
      'For selected categories, ingest service pricing, features, and battery assets mirroring the Python tooling.',
  },
]
