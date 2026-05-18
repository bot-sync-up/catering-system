import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import { authRouter } from "./routes/auth.js";
import { employeesRouter } from "./routes/employees.js";
import { shiftsRouter } from "./routes/shifts.js";
import { evaluationsRouter } from "./routes/evaluations.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));   // 10mb לחתימות base64
app.use(morgan("dev"));

// קבצים סטטיים (תמונות פרופיל / תעודות)
app.use("/uploads", express.static(path.resolve("uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/api/auth", authRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/shifts", shiftsRouter);
app.use("/api/evaluations", evaluationsRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err.name === "ZodError") {
    return res.status(400).json({ error: "validation", details: err.errors });
  }
  res.status(err.status || 500).json({ error: err.message || "שגיאה פנימית" });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`HR Server listening on http://localhost:${PORT}`);
});
