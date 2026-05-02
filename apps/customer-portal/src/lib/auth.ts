import { db, uid, type User } from './store';

export function generateOtp(email: string): string {
  // Demo: generate 6-digit code, valid 10 min.
  const code = String(Math.floor(100000 + Math.random() * 900000));
  db().otps.set(email.toLowerCase(), {
    email: email.toLowerCase(),
    code,
    expiresAt: Date.now() + 10 * 60 * 1000
  });
  // In production: send via SMS/email provider.
  // For demo we log the code so that QA can use it.
  // eslint-disable-next-line no-console
  console.log(`[OTP] ${email} -> ${code}`);
  return code;
}

export function verifyOtp(email: string, code: string): User | null {
  const rec = db().otps.get(email.toLowerCase());
  if (!rec) return null;
  if (rec.expiresAt < Date.now()) {
    db().otps.delete(email.toLowerCase());
    return null;
  }
  if (rec.code !== code.trim()) return null;
  db().otps.delete(email.toLowerCase());

  // Find or create user
  const all = Array.from(db().users.values());
  let u = all.find(x => x.email.toLowerCase() === email.toLowerCase());
  if (!u) {
    u = {
      id: uid('u'),
      email: email.toLowerCase(),
      name: email.split('@')[0],
      customMenuPrefs: { hideCategories: [], favoriteIds: [] }
    };
    db().users.set(u.id, u);
  }
  return u;
}
