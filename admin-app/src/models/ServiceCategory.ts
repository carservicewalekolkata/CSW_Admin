import mongoose, { Schema, Document, models } from "mongoose";

export interface IServiceCategory extends Document {
  id: number;
  name: string;
  created_date: Date;
  updated_date: Date;
}

const ServiceCategorySchema = new Schema<IServiceCategory>({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  created_date: { type: Date, required: true, default: Date.now },
  updated_date: { type: Date, required: true, default: Date.now },
});

export default models.ServiceCategory || mongoose.model<IServiceCategory>("ServiceCategory", ServiceCategorySchema);
