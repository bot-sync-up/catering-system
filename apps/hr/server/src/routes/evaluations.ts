// הערכות, KPI, פידבק 360
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const evaluationsRouter = Router();
evaluationsRouter.use(requireAuth);

// =========== הערכה (רבעון/שנה) ===========
evaluationsRouter.post("/", requireRole("ADMIN", "HR", "MANAGER"), async (req, res) => {
  const body = z.object({
    employeeId: z.string(),
    period: z.enum(["QUARTERLY", "ANNUAL", "PROBATION", "ADHOC"]),
    periodLabel: z.string(),
    scores: z.record(z.string(), z.number()),
    overallScore: z.number(),
    goals: z.any().optional(),
    comments: z.string().optional(),
    signedSvg: z.string().optional(),
  }).parse(req.body);

  const ev = await prisma.evaluation.create({
    data: { ...body, evaluatorId: req.auth!.employeeId! },
  });
  res.json(ev);
});

evaluationsRouter.get("/employee/:id", async (req, res) => {
  const list = await prisma.evaluation.findMany({
    where: { employeeId: req.params.id },
    include: { evaluator: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(list);
});

// =========== KPI ===========
evaluationsRouter.post("/kpi", requireRole("ADMIN", "HR", "MANAGER"), async (req, res) => {
  const body = z.object({
    employeeId: z.string(),
    name: z.string(),
    target: z.number(),
    actual: z.number(),
    unit: z.string().optional(),
    period: z.string(),
    weight: z.number().default(1),
  }).parse(req.body);
  const kpi = await prisma.kPI.create({ data: body });
  res.json(kpi);
});

evaluationsRouter.get("/kpi/employee/:id", async (req, res) => {
  const { period } = req.query as { period?: string };
  const list = await prisma.kPI.findMany({
    where: { employeeId: req.params.id, ...(period ? { period } : {}) },
    orderBy: { createdAt: "desc" },
  });
  res.json(list);
});

// =========== פידבק 360 ===========
evaluationsRouter.post("/feedback360", async (req, res) => {
  const body = z.object({
    receiverId: z.string(),
    period: z.string(),
    relation: z.string(),
    scores: z.record(z.string(), z.number()),
    strengths: z.string().optional(),
    improvements: z.string().optional(),
    anonymous: z.boolean().default(true),
  }).parse(req.body);

  const fb = await prisma.feedback360.create({
    data: { ...body, giverId: req.auth!.employeeId! },
  });
  res.json(fb);
});

evaluationsRouter.get("/feedback360/employee/:id", async (req, res) => {
  const list = await prisma.feedback360.findMany({
    where: { receiverId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  // אם anonymous – מסתיר את המעריך
  res.json(list.map(f => f.anonymous ? { ...f, giverId: null } : f));
});
