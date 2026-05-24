// משמרות: שיבוץ Drag&Drop, זמינות, החלפות, נוכחות
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const shiftsRouter = Router();
shiftsRouter.use(requireAuth);

// =========== לוח שבועי ===========
shiftsRouter.get("/week", async (req, res) => {
  const { from, to } = z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }).parse(req.query);
  const shifts = await prisma.shift.findMany({
    where: { date: { gte: new Date(from), lte: new Date(to) } },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      attendance: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  res.json(shifts);
});

// =========== יצירת משמרת ===========
const shiftSchema = z.object({
  date: z.string().datetime(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  employeeId: z.string().nullable().optional(),
  role: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

shiftsRouter.post("/", requireRole("ADMIN", "HR", "MANAGER"), async (req, res) => {
  const body = shiftSchema.parse(req.body);
  const shift = await prisma.shift.create({
    data: { ...body, date: new Date(body.date), employeeId: body.employeeId || null },
  });
  res.json(shift);
});

// =========== שיבוץ Drag & Drop ===========
shiftsRouter.patch("/:id/assign", requireRole("ADMIN", "HR", "MANAGER"), async (req, res) => {
  const { employeeId } = z.object({ employeeId: z.string().nullable() }).parse(req.body);
  const updated = await prisma.shift.update({
    where: { id: req.params.id },
    data: { employeeId: employeeId || null },
  });
  res.json(updated);
});

shiftsRouter.patch("/:id", requireRole("ADMIN", "HR", "MANAGER"), async (req, res) => {
  const body = shiftSchema.partial().parse(req.body);
  const updated = await prisma.shift.update({
    where: { id: req.params.id },
    data: {
      ...body,
      date: body.date ? new Date(body.date) : undefined,
    },
  });
  res.json(updated);
});

shiftsRouter.delete("/:id", requireRole("ADMIN", "HR", "MANAGER"), async (req, res) => {
  await prisma.shift.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// =========== Clock-in / Clock-out ===========
shiftsRouter.post("/:id/clock-in", async (req, res) => {
  const body = z.object({
    method: z.enum(["PASSWORD", "BIOMETRIC", "PIN", "GPS"]).default("BIOMETRIC"),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).parse(req.body);

  const shift = await prisma.shift.findUnique({ where: { id: req.params.id } });
  if (!shift) return res.status(404).json({ error: "משמרת לא נמצאה" });
  if (shift.employeeId !== req.auth!.employeeId && req.auth!.role === "EMPLOYEE") {
    return res.status(403).json({ error: "המשמרת לא משויכת אליך" });
  }

  const att = await prisma.attendance.upsert({
    where: { shiftId: shift.id },
    create: {
      shiftId: shift.id,
      employeeId: shift.employeeId!,
      clockInAt: new Date(),
      clockInMethod: body.method,
      clockInLat: body.lat,
      clockInLng: body.lng,
    },
    update: {
      clockInAt: new Date(),
      clockInMethod: body.method,
      clockInLat: body.lat,
      clockInLng: body.lng,
    },
  });
  await prisma.shift.update({
    where: { id: shift.id },
    data: { status: "IN_PROGRESS" },
  });
  res.json(att);
});

shiftsRouter.post("/:id/clock-out", async (req, res) => {
  const body = z.object({
    method: z.enum(["PASSWORD", "BIOMETRIC", "PIN", "GPS"]).default("BIOMETRIC"),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).parse(req.body);
  const att = await prisma.attendance.update({
    where: { shiftId: req.params.id },
    data: {
      clockOutAt: new Date(),
      clockOutMethod: body.method,
      clockOutLat: body.lat,
      clockOutLng: body.lng,
    },
  });
  await prisma.shift.update({
    where: { id: req.params.id },
    data: { status: "COMPLETED" },
  });
  res.json(att);
});

// =========== זמינות ===========
shiftsRouter.post("/availability", async (req, res) => {
  const body = z.object({
    date: z.string().datetime(),
    startTime: z.string(),
    endTime: z.string(),
    preference: z.number().int().default(0),
    note: z.string().optional(),
  }).parse(req.body);
  const av = await prisma.availability.upsert({
    where: {
      employeeId_date_startTime: {
        employeeId: req.auth!.employeeId!,
        date: new Date(body.date),
        startTime: body.startTime,
      },
    },
    create: { ...body, date: new Date(body.date), employeeId: req.auth!.employeeId! },
    update: { ...body, date: new Date(body.date) },
  });
  res.json(av);
});

shiftsRouter.get("/availability", async (req, res) => {
  const { from, to, employeeId } = req.query as Record<string, string>;
  const list = await prisma.availability.findMany({
    where: {
      employeeId: employeeId || req.auth!.employeeId,
      date: { gte: new Date(from), lte: new Date(to) },
    },
  });
  res.json(list);
});

// =========== החלפות (Swap Workflow) ===========
shiftsRouter.post("/:id/swap-request", async (req, res) => {
  const body = z.object({
    toEmployeeId: z.string().optional(),
    reason: z.string().optional(),
  }).parse(req.body);
  const swap = await prisma.shiftSwap.create({
    data: {
      shiftId: req.params.id,
      fromEmployeeId: req.auth!.employeeId!,
      toEmployeeId: body.toEmployeeId,
      reason: body.reason,
      status: "PENDING",
    },
  });
  res.json(swap);
});

// העובד היעד מאשר/דוחה
shiftsRouter.post("/swaps/:swapId/peer-respond", async (req, res) => {
  const { accept } = z.object({ accept: z.boolean() }).parse(req.body);
  const swap = await prisma.shiftSwap.findUnique({ where: { id: req.params.swapId } });
  if (!swap) return res.status(404).json({ error: "בקשה לא נמצאה" });
  if (swap.toEmployeeId !== req.auth!.employeeId) {
    return res.status(403).json({ error: "הבקשה לא מופנית אליך" });
  }
  const updated = await prisma.shiftSwap.update({
    where: { id: swap.id },
    data: { status: accept ? "ACCEPTED_BY_PEER" : "REJECTED" },
  });
  res.json(updated);
});

// המנהל מאשר סופית – מבצע את ההחלפה בפועל
shiftsRouter.post(
  "/swaps/:swapId/manager-approve",
  requireRole("ADMIN", "HR", "MANAGER"),
  async (req, res) => {
    const { approve, note } = z.object({
      approve: z.boolean(),
      note: z.string().optional(),
    }).parse(req.body);
    const swap = await prisma.shiftSwap.findUnique({
      where: { id: req.params.swapId },
      include: { shift: true },
    });
    if (!swap) return res.status(404).json({ error: "בקשה לא נמצאה" });
    if (swap.status !== "ACCEPTED_BY_PEER" && approve) {
      return res.status(400).json({ error: "העובד היעד עוד לא אישר" });
    }
    const updated = await prisma.shiftSwap.update({
      where: { id: swap.id },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        managerNote: note,
        approvedById: req.auth!.userId,
        approvedAt: new Date(),
      },
    });
    if (approve && swap.toEmployeeId) {
      await prisma.shift.update({
        where: { id: swap.shiftId },
        data: { employeeId: swap.toEmployeeId },
      });
    }
    res.json(updated);
  }
);

shiftsRouter.get("/swaps", async (req, res) => {
  const where = req.auth!.role === "EMPLOYEE"
    ? { OR: [{ fromEmployeeId: req.auth!.employeeId }, { toEmployeeId: req.auth!.employeeId }] }
    : {};
  const list = await prisma.shiftSwap.findMany({
    where,
    include: {
      shift: true,
      fromEmployee: { select: { id: true, firstName: true, lastName: true } },
      toEmployee:   { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(list);
});
