import "dotenv/config";

import dns from "node:dns";
import mongoose, { Mongoose } from "mongoose";

const FALLBACK_DNS_SERVERS = ["1.1.1.1", "8.8.8.8"];

// Prevent multiple connections during development/hot reloads.
declare global {
  var mongooseCache: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  };
  var mongoSrvDnsConfigured: boolean | undefined;
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

const getConfiguredMongoSrvDnsServers = () => {
  return process.env.MONGODB_DNS_SERVERS?.split(",")
    .map((server) => server.trim())
    .filter(Boolean);
};

const configureDnsForMongoSrv = (uri: string, useFallback = false) => {
  if (!uri.startsWith("mongodb+srv://") || global.mongoSrvDnsConfigured) {
    return false;
  }

  const configuredServers = getConfiguredMongoSrvDnsServers();
  const servers = configuredServers?.length
    ? configuredServers
    : useFallback
      ? FALLBACK_DNS_SERVERS
      : undefined;

  if (!servers?.length) {
    return false;
  }

  dns.setServers(servers);
  global.mongoSrvDnsConfigured = true;

  console.info("MongoDB SRV DNS servers configured", {
    count: servers.length,
  });

  return true;
};

const isSrvDnsError = (error: unknown) => {
  const maybeDnsError = error as {
    code?: unknown;
    syscall?: unknown;
    message?: unknown;
  };

  return (
    maybeDnsError.syscall === "querySrv" ||
    (typeof maybeDnsError.message === "string" &&
      maybeDnsError.message.includes("querySrv"))
  );
};

const connectWithDnsFallback = async (
  dbUri: string,
  opts: mongoose.ConnectOptions,
) => {
  try {
    return await mongoose.connect(dbUri, opts);
  } catch (error) {
    if (isSrvDnsError(error) && configureDnsForMongoSrv(dbUri, true)) {
      console.warn(
        "MongoDB SRV DNS lookup failed; retrying with fallback DNS servers",
      );

      return mongoose.connect(dbUri, opts);
    }

    throw error;
  }
};

export const connectDB = async () => {
  if (cached.conn) {
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

    cached.promise = connectWithDnsFallback(dbUri, opts)
      .then((mongoose) => {
        console.info("MongoDB connected successfully");
        return mongoose;
      })
      .catch((err: unknown) => {
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
