import mongoose, { type ConnectOptions } from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const globalCache = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache = (globalCache.mongooseCache ??= { conn: null, promise: null });

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    const mongoUri = getRequiredEnv("MONGODB_URI");
    const dbName = process.env.MONGODB_DB ?? process.env.DB_CSW_NAME;
    const options = {
      bufferCommands: false,
      ...(dbName ? { dbName } : {}),
    } satisfies ConnectOptions;

    cache.promise = mongoose.connect(mongoUri, options);
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (!cache.conn) {
    return;
  }

  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}

function getRequiredEnv(key: keyof NodeJS.ProcessEnv): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${key} environment variable`);
  }

  return value;
}

export type { mongoose };
