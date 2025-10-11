import { Schema, Document, Connection } from "mongoose";

import { getMongooseModelForConnection } from "@/utils/getMongooseModelForConnection";

export interface IServiceCategory extends Document {
  id: number;
  name: string;
  created_date: Date;
  updated_date: Date;
}

const schemaFactory = () =>
  new Schema<IServiceCategory>(
    {
      id: { type: Number, required: true, unique: true },
      name: { type: String, required: true },
      created_date: { type: Date, required: true, default: Date.now },
      updated_date: { type: Date, required: true, default: Date.now },
    },
    { collection: 'service_categories', versionKey: false },
  )

export default function getServiceCategoryModel(connection: Connection) {
  return getMongooseModelForConnection<IServiceCategory>(
    connection,
    'ServiceCategory',
    schemaFactory,
    'service_categories',
  )
}
