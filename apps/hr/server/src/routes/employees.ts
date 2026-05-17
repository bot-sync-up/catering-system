// תיק עובד מלא: פרטים, תעודות, בנק (מוצפן), פנסיה, תאונות
import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { encryptField, encryptJson, decryptField, decryptJson } from "../utils/crypto.js";

export const employeesRouter = Router();
employeesRouter.use(requireAuth);

const UPLOAD_DIR = path.resolve("uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: 15 * 1024 * 1024 } });

// רשימת עובדים (HR/ADMIN/MANAGER)
employeesRouter.get("/", requireRole("ADMIN", "HR", "MANAGER"), async (_req, res) => {
  const list = await prisma.employee.findMany({
    include: { user: { select: { email: true, role: true } } },
    orderBy: { lastName: "asc" },
  });
  // מחזיר רק שדות לא-רגישים ברשימה
  res.json(list.map(e => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    hebrewName: e.hebrewName,
    photoUrl: e.photoUrl,
    phone: e.phone,
    email: e.user.email,
    role: e.user.role,
    startDate: e.startDate,
  })));
});

// תיק עובד מלא (מפענח שדות מוצפנים רק ל-HR/ADMIN או לעובד עצמו)
employeesRouter.get("/:id", async (req, res) => {
  const emp = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: { user: true, documents: true, accidents: true },
  });
  if (!emp) return res.status(404).json({ error: "עובד לא נמצא" });

  const canSeeSensitive =
    req.auth!.role === "ADMIN" ||
    req.auth!.role === "HR" ||
    req.auth!.employeeId === emp.id;

  res.json({
    ...emp,
    taxId:       canSeeSensitive ? decryptField(emp.taxId) : null,
    salary:      canSeeSensitive ? decryptField(emp.salary) : null,
    pensionFund: canSeeSensitive ? decryptField(emp.pensionFund) : null,
    bank:        canSeeSensitive ? decryptJson(emp.bank) : null,
  });
});

// יצירת/עדכון פרטי עובד (כולל הצפנת השדות הרגישים)
const upsertSchema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  hebrewName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  birthDate: z.string().datetime().optional(),
  // שדות שיוצפנו בצד השרת:
  taxId: z.string().optional(),
  salary: z.union([z.string(), z.number()]).optional(),
  pensionFund: z.string().optional(),
  bank: z.object({
    bankName: z.string(),
    branch: z.string(),
    account: z.string(),
  }).optional(),
});

employeesRouter.put("/:id", requireRole("ADMIN", "HR"), async (req, res) => {
  const body = upsertSchema.parse(req.body);
  const updated = await prisma.employee.update({
    where: { id: req.params.id },
    data: {
      firstName: body.firstName,
      lastName:  body.lastName,
      hebrewName: body.hebrewName,
      phone: body.phone,
      address: body.address,
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      taxId:       body.taxId       != null ? encryptField(body.taxId) : undefined,
      salary:      body.salary      != null ? encryptField(String(body.salary)) : undefined,
      pensionFund: body.pensionFund != null ? encryptField(body.pensionFund) : undefined,
      bank:        body.bank        != null ? encryptJson(body.bank) : undefined,
    },
  });
  res.json({ id: updated.id, ok: true });
});

// העלאת תמונת פרופיל
employeesRouter.post("/:id/photo", upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "חסר קובץ" });
  const url = `/uploads/${req.file.filename}`;
  await prisma.employee.update({ where: { id: req.params.id }, data: { photoUrl: url } });
  res.json({ photoUrl: url });
});

// =========== תעודות ===========
employeesRouter.post(
  "/:id/documents",
  upload.single("file"),
  async (req, res) => {
    const { type, signatureSvg, expiresAt, notes } = req.body;
    if (!req.file) return res.status(400).json({ error: "חסר קובץ" });
    const doc = await prisma.employeeDocument.create({
      data: {
        employeeId: req.params.id,
        type,
        fileUrl: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        signatureSvg: signatureSvg || null,
        signedAt: signatureSvg ? new Date() : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes,
      },
    });
    res.json(doc);
  }
);

employeesRouter.get("/:id/documents", async (req, res) => {
  const docs = await prisma.employeeDocument.findMany({
    where: { employeeId: req.params.id },
    orderBy: { uploadedAt: "desc" },
  });
  res.json(docs);
});

employeesRouter.delete("/:id/documents/:docId", requireRole("ADMIN", "HR"), async (req, res) => {
  await prisma.employeeDocument.delete({ where: { id: req.params.docId } });
  res.json({ ok: true });
});

// =========== תאונות עבודה ===========
employeesRouter.post("/:id/accidents", async (req, res) => {
  const body = z.object({
    occurredAt: z.string().datetime(),
    location: z.string(),
    description: z.string(),
    severity: z.enum(["MINOR", "MODERATE", "SEVERE", "FATAL"]),
    daysOff: z.number().int().min(0).default(0),
    signedSvg: z.string().optional(),
  }).parse(req.body);
  const acc = await prisma.accidentReport.create({
    data: { ...body, occurredAt: new Date(body.occurredAt), employeeId: req.params.id },
  });
  res.json(acc);
});

employeesRouter.get("/:id/accidents", async (req, res) => {
  const list = await prisma.accidentReport.findMany({
    where: { employeeId: req.params.id },
    orderBy: { occurredAt: "desc" },
  });
  res.json(list);
});
