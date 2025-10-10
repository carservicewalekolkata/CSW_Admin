import mongoose, { Schema, Document, models } from "mongoose";

export interface IModelService {
  services_id: mongoose.Types.ObjectId;
  discount: number;
  original_price: number;
  discount_price: number;
}

export interface IModel extends Document {
  id: number;
  name: string;
  thumbnail: mongoose.Types.ObjectId | null;
  image: string;
  body_type?: string | null;
  brand_id: number;
  brand_name: string;
  fuel_type: string[];
  slug: string;
  services: IModelService[];
  status: boolean;
  created_date: Date;
  updated_date: Date;
}

const ModelSchema = new Schema<IModel>({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  thumbnail: { type: Schema.Types.ObjectId, default: null },
  image: { type: String, default: "" },
  body_type: { type: String, default: null },
  brand_id: { type: Number, required: true },
  brand_name: { type: String, required: true },
  fuel_type: { type: [String], default: [] },
  slug: { type: String, required: true },
  services: {
    type: [
      {
        services_id: { type: Schema.Types.ObjectId, required: true },
        discount: { type: Number, default: 0 },
        original_price: { type: Number, default: 0 },
        discount_price: { type: Number, default: 0 },
      },
    ],
    default: [],
  },
  status: { type: Boolean, default: true },
  created_date: { type: Date, required: true, default: Date.now },
  updated_date: { type: Date, required: true, default: Date.now },
});

export default models.Model || mongoose.model<IModel>("Model", ModelSchema);
