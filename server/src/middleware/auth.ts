import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

export interface AuthPayload {
  userId: string;
  role: Role;
  employeeId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "נדרש token" });
  }
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as AuthPayload;
    req.auth = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "token לא תקף" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: "נדרש token" });
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: "אין הרשאה" });
    }
    next();
  };
}
