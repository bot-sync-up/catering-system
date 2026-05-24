import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

export interface ClientHints {
  ipAddress: string | null;
  userAgent: string | null;
}

export function readClientHints(req: Request): ClientHints {
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0]?.trim() ?? null : req.headers.get("x-real-ip") ?? null;
  return {
    ipAddress: ip,
    userAgent: req.headers.get("user-agent"),
  };
}

export async function parseJson<T>(req: Request, schema: ZodSchema<T>): Promise<
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }
> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "BAD_JSON", message: "גוף הבקשה אינו JSON תקין" }, { status: 400 }),
    };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "VALIDATION_FAILED", issues: result.error.issues },
        { status: 422 },
      ),
    };
  }
  return { ok: true, data: result.data };
}

export function errorResponse(code: string, message: string, status = 400) {
  return NextResponse.json({ error: code, message }, { status });
}
