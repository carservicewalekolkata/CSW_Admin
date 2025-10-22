import { Schema, Document, Connection } from "mongoose";

import { getMongooseModelForConnection } from "@/utils/getMongooseModelForConnection";

export interface IVehicleSitemap extends Document {
  brand_id: number;
  brand_name: string;
  brand_slug: string;
  model_id: number;
  model_name: string;
  model_slug: string;
  fuel_type: string;
  fuel_key: string;
  path: string;
  active: boolean;
  last_modified: Date;
  created_at: Date;
  updated_at: Date;
}

const schemaFactory = () => {
  const schema = new Schema<IVehicleSitemap>(
    {
      brand_id: { type: Number, required: true },
      brand_name: { type: String, required: true },
      brand_slug: { type: String, required: true },
      model_id: { type: Number, required: true },
      model_name: { type: String, required: true },
      model_slug: { type: String, required: true },
      fuel_type: { type: String, required: true },
      fuel_key: { type: String, required: true },
      path: { type: String, required: true },
      active: { type: Boolean, default: true },
      last_modified: { type: Date, required: true },
      created_at: { type: Date, required: true, default: Date.now },
      updated_at: { type: Date, required: true, default: Date.now },
    },
    { collection: "vehicle_sitemaps", versionKey: false },
  );

  schema.index({ model_id: 1, fuel_key: 1 }, { unique: true });
  schema.index({ path: 1 }, { unique: true });

  return schema;
};

export default function getVehicleSitemapModel(connection: Connection) {
  return getMongooseModelForConnection<IVehicleSitemap>(
    connection,
    "VehicleSitemap",
    schemaFactory,
    "vehicle_sitemaps",
  );
}

