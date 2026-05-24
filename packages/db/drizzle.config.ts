import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://aneh:aneh_dev_password@localhost:5432/aneh_hashoel",
  },
  strict: true,
  verbose: true,
});
