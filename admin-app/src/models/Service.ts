import mongoose, { Schema, Document, models } from "mongoose";

export interface IService extends Document {
  name: string;
  category_id: number;
  category_name: string;
  service_images: string[];
  thumbnail: string;
  description?: string | null;
  features: string[];
  time_taken?: string | null;
  warranty?: string | null;
  status: boolean;
  created_date: Date;
  updated_date: Date;
}

const ServiceSchema = new Schema<IService>({
  name: { type: String, required: true },
  category_id: { type: Number, required: true },
  category_name: { type: String, required: true },
  service_images: { type: [String], default: [] },
  thumbnail: { type: String, default: "" },
  description: { type: String, default: null },
  features: { type: [String], default: [] },
  time_taken: { type: String, default: null },
  warranty: { type: String, default: null },
  status: { type: Boolean, default: true },
  created_date: { type: Date, required: true, default: Date.now },
  updated_date: { type: Date, required: true, default: Date.now },
});

export default models.Service || mongoose.model<IService>("Service", ServiceSchema);
