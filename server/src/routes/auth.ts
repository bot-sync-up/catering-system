import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { signToken } from "../middleware/auth.js";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

export const authRouter = Router();

const RP_ID = process.env.RP_ID || "localhost";
const RP_ORIGIN = process.env.RP_ORIGIN || "http://localhost:5173";

// In-memory challenge store (פרודקשן: Redis)
const challenges = new Map<string, string>();

// =========== רישום משתמש ===========
authRouter.post("/register", async (req, res) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  }).parse(req.body);

  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) return res.status(409).json({ error: "אימייל כבר רשום" });

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      role: body.role,
      employee: {
        create: {
          firstName: body.firstName,
          lastName: body.lastName,
        },
      },
    },
    include: { employee: true },
  });
  const token = signToken({ userId: user.id, role: user.role, employeeId: user.employee?.id });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

// =========== כניסה רגילה ===========
authRouter.post("/login", async (req, res) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string(),
  }).parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: { employee: true },
  });
  if (!user) return res.status(401).json({ error: "פרטי כניסה שגויים" });
  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "פרטי כניסה שגויים" });
  const token = signToken({ userId: user.id, role: user.role, employeeId: user.employee?.id });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, employeeId: user.employee?.id } });
});

// =========== WebAuthn – רישום ביומטרי ===========
authRouter.post("/webauthn/register-options", async (req, res) => {
  const { userId } = req.body;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "משתמש לא נמצא" });

  const options = await generateRegistrationOptions({
    rpName: "HR Platform",
    rpID: RP_ID,
    userName: user.email,
    attestationType: "none",
    authenticatorSelection: {
      userVerification: "required",  // דורש Face ID / טביעה
      residentKey: "preferred",
    },
  });
  challenges.set(user.id, options.challenge);
  res.json(options);
});

authRouter.post("/webauthn/register-verify", async (req, res) => {
  const { userId, response } = req.body;
  const expected = challenges.get(userId);
  if (!expected) return res.status(400).json({ error: "challenge לא נמצא" });

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: expected,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ error: "אימות נכשל" });
  }
  const { credentialID, credentialPublicKey } = verification.registrationInfo;
  await prisma.user.update({
    where: { id: userId },
    data: {
      webauthnCredId: Buffer.from(credentialID).toString("base64url"),
      webauthnPubKey: Buffer.from(credentialPublicKey).toString("base64url"),
    },
  });
  challenges.delete(userId);
  res.json({ verified: true });
});

// =========== WebAuthn – כניסה ביומטרית ===========
authRouter.post("/webauthn/login-options", async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.webauthnCredId) {
    return res.status(404).json({ error: "אימות ביומטרי לא הוגדר" });
  }
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "required",
    allowCredentials: [{
      id: Buffer.from(user.webauthnCredId, "base64url"),
      type: "public-key",
    }],
  });
  challenges.set(user.id, options.challenge);
  res.json({ options, userId: user.id });
});

authRouter.post("/webauthn/login-verify", async (req, res) => {
  const { userId, response } = req.body;
  const expected = challenges.get(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true },
  });
  if (!expected || !user || !user.webauthnPubKey || !user.webauthnCredId) {
    return res.status(400).json({ error: "אימות נכשל" });
  }
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: expected,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
    authenticator: {
      credentialID: Buffer.from(user.webauthnCredId, "base64url"),
      credentialPublicKey: Buffer.from(user.webauthnPubKey, "base64url"),
      counter: 0,
    },
  });
  if (!verification.verified) return res.status(401).json({ error: "אימות נכשל" });
  challenges.delete(userId);
  const token = signToken({ userId: user.id, role: user.role, employeeId: user.employee?.id });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, employeeId: user.employee?.id } });
});
