import mongoose from 'mongoose';

const CONNECTION_STRING = process.env.MONGODB_CONNECTION_STRING;
const DB_NAME = "test-db";

if (!CONNECTION_STRING) {
  throw new Error('Please define the MONGODB_CONNECTION_STRING environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
      retryWrites: false,
    };

    cached.promise = mongoose.connect(CONNECTION_STRING!, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
