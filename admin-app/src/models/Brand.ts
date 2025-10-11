/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, Document, Connection } from "mongoose";
import { getMongooseModelForConnection } from "@/utils/getMongooseModelForConnection";

export interface IBrand extends Document {
  id: number | string;
  name: string;
  slug: string;
  icon?: any;
  status?: boolean;
  created_date?: Date;
  updated_date?: Date;
}

const schemaFactory = () =>
  new Schema<IBrand>(
    {
      id: { type: Schema.Types.Mixed, required: true },
      name: String,
      slug: String,
      icon: Schema.Types.ObjectId,
      status: Boolean,
      created_date: Schema.Types.Mixed,
      updated_date: Schema.Types.Mixed,
    },
    { strict: false, versionKey: false }
  );

export default function getBrandModel(connection: Connection) {
  return getMongooseModelForConnection<IBrand>(connection, "Brand", schemaFactory, "brands");
}
