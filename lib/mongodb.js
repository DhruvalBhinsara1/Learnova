import { MongoClient } from "mongodb";

const options = {
  maxPoolSize: 100,
};

let client;
let mongoClientPromise = null;

const createClientPromise = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  client = new MongoClient(uri, options);
  const connectedClient = await client.connect();

  return connectedClient;
};

const getClientPromise = () => {
  if (!mongoClientPromise) {
    if (process.env.NODE_ENV === "development" && global._mongoClientPromise) {
      mongoClientPromise = global._mongoClientPromise;
    } else {
      mongoClientPromise = createClientPromise();
      if (process.env.NODE_ENV === "development") {
        global._mongoClientPromise = mongoClientPromise;
      }
    }
  }
  return mongoClientPromise;
};

const clientPromise = {
  then(onFulfilled, onRejected) {
    return getClientPromise().then(onFulfilled, onRejected);
  },
  catch(onRejected) {
    return getClientPromise().catch(onRejected);
  },
  finally(onFinally) {
    return getClientPromise().finally(onFinally);
  },
};

let sseClient;
let sseClientPromise;
const sseOptions = {
  maxPoolSize: 30,
};

/**
 * Connects to MongoDB and returns the database instance.
 * Reuses an existing connection pool to minimize handshake overhead.
 * @returns {Promise<import('mongodb').Db>} A MongoDB Db instance for the configured database.
 * @throws {Error} If MONGODB_URI/MONGODB_DB is missing or the connection fails.
 * @example
 * const db = await connectDb();
 * const activities = await db.collection('activities').find().toArray();
 */
export async function connectDb() {
  const dbName = process.env.MONGODB_DB;

  try {
    const connectedClient = await getClientPromise();
    return connectedClient.db(dbName);
  } catch (error) {
    throw new Error(`Failed to establish database connection: ${error.message}`);
  }
}

function resetSseClient() {
  const clientToClose = sseClient;
  sseClientPromise = null;
  sseClient = null;
  if (process.env.NODE_ENV === "development") {
    global._mongoSseClientPromise = null;
  }
  if (clientToClose) {
    clientToClose.removeAllListeners();
    clientToClose.close().catch(() => {});
  }
}

/**
 * Dedicated connection pool for SSE streams - isolated from the main API pool.
 * Prevents long-lived Change Stream connections from starving other routes.
 */
export async function connectDbForSSE() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  if (!sseClientPromise) {
    sseClient = new MongoClient(uri, sseOptions);

    // Register event listeners to reset client caching on connection drops
    sseClient.on("close", resetSseClient);
    sseClient.on("timeout", resetSseClient);
    sseClient.on("error", resetSseClient);

    if (process.env.NODE_ENV === "development") {
      if (!global._mongoSseClientPromise) {
        global._mongoSseClientPromise = sseClient.connect();
      }
      sseClientPromise = global._mongoSseClientPromise;
    } else {
      sseClientPromise = sseClient.connect();
    }
  }

  try {
    const connectedClient = await sseClientPromise;
    return connectedClient.db(dbName);
  } catch (error) {
    resetSseClient();
    throw new Error(`Failed to establish database connection: ${error.message}`);
  }
}

/**
 * Ensures a TTL index on the rate_limits collection.
 * Old rate-limit documents are automatically cleaned up by MongoDB.
 */
export async function ensureRateLimitTTLIndex() {
  try {
    const db = await connectDb();
    const collection = db.collection("rate_limits");
    await collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, background: true },
    );
  } catch {
    // Silently ignore — index creation is best-effort
  }
}

export default clientPromise;
