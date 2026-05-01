import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://aneh:aneh_dev_password@localhost:5432/aneh_hashoel";

const client = postgres(connectionString, { max: 10 });

export const db = drizzle(client);
export * from "./schema";
