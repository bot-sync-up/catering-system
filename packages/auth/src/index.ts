import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev_secret_replace_me",
);

export const sessionSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["asker", "rabbi", "editor", "admin"]),
  email: z.string().email(),
});

export type Session = z.infer<typeof sessionSchema>;

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? "7d")
    .sign(secret);
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return sessionSchema.parse(payload);
  } catch {
    return null;
  }
}
