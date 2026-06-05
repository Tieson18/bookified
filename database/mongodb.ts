import "dotenv/config";

import { setServers } from "node:dns";
import mongoose, { Mongoose } from "mongoose";

const FALLBACK_DNS_SERVERS = ["1.1.1.1", "8.8.8.8"];

// Prevent multiple connections during development/hot reloads.
declare global {
  var mongooseCache: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  };
}

const cached =
  global.mongooseCache ||
  (global.mongooseCache = { conn: null, promise: null });

const getMongoUri = () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  return uri;
};

const configureDnsForMongoSrv = (uri: string) => {
  if (!uri.startsWith("mongodb+srv://")) {
    return;
  }

  const configuredServers = process.env.MONGODB_DNS_SERVERS?.split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  if (configuredServers?.length) {
    setServers(configuredServers);
    return;
  }

  setServers(FALLBACK_DNS_SERVERS);
};

export const connectDB = async () => {
  if (cached.conn) {
    console.info("MongoDB already connected");
    return cached.conn;
  }

  if (!cached.promise) {
    const dbUri = getMongoUri();
    configureDnsForMongoSrv(dbUri);

    console.info("Connecting to MongoDB...");
    const opts: mongoose.ConnectOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose
      .connect(dbUri, opts)
      .then((mongoose) => {
        console.info("MongoDB connected successfully");
        return mongoose;
      })
      .catch((err) => {
        console.error("MongoDB connection failed:", err);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }

  return cached.conn;
};
