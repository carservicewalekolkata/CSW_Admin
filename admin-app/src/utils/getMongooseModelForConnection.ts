import { Connection, Model, Schema, Document } from "mongoose";

/**
 * Dynamically registers or reuses a model on a given connection.
 * Handles hot-reload and prevents model caching conflicts.
 */
export function getMongooseModelForConnection<T extends Document>(
  connection: Connection,
  name: string,
  schemaFactory: () => Schema<T>,
  collection?: string
): Model<T> {
  // Cast away readonly for hot-reload safe deletion
  const models = connection.models as Record<string, Model<T>>;

  if (models[name]) {
    return models[name];
  }

  return connection.model<T>(name, schemaFactory(), collection);
}
