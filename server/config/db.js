import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

export const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      // An unset MONGO_URI falls back to an in-memory database, which lives
      // only in RAM and is wiped on every restart — orders, accounts, and
      // designs all vanish. That is fine for tests/quick local demos but is a
      // silent data-loss trap for anything real, so:
      //   • in production we refuse to boot rather than run on volatile storage;
      //   • in development we warn loudly so it can't be mistaken for a real DB.
      if (process.env.NODE_ENV === "production") {
        console.error(
          "[DB] FATAL: MONGO_URI is not set in production. Refusing to start on an " +
            "in-memory database — every restart would wipe all data. Set MONGO_URI to a " +
            "persistent MongoDB connection string.",
        );
        process.exit(1);
      }

      const memoryServer = await MongoMemoryServer.create();
      mongoUri = memoryServer.getUri("elite-empressions");
      console.warn(
        "\n============================================================\n" +
          "[DB] MONGO_URI is not set — using a TEMPORARY in-memory MongoDB.\n" +
          "  DATA IS NOT PERSISTED: every restart wipes all orders,\n" +
          "  accounts, and designs. For local dev/testing only.\n" +
          "  To keep data, set MONGO_URI in .env, e.g.\n" +
          "  MONGO_URI=mongodb://127.0.0.1:27017/elite-empressions\n" +
          "============================================================\n",
      );
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};
