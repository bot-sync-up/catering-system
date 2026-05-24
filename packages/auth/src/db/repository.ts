/**
 * UserRepository — ממשק אחסון משתמשים. גרסת in-memory לפיתוח/בדיקות.
 * בפרודקשן יש להחליף ל-Postgres / Mongo בלי לשנות את ה-API.
 */
import { User, Role, Category } from '../types';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByOAuth(provider: string, providerUserId: string): Promise<User | null>;
  insert(u: User): Promise<User>;
  update(id: string, patch: Partial<User>): Promise<User | null>;
  linkOAuth(userId: string, provider: string, providerUserId: string): Promise<void>;
  setBackupCodes(userId: string, hashed: string[]): Promise<void>;
  getBackupCodes(userId: string): Promise<string[]>;
}

interface OAuthLink { userId: string; provider: string; providerUserId: string }

export class InMemoryUserRepo implements UserRepository {
  private users = new Map<string, User>();
  private byEmail = new Map<string, string>();
  private oauth: OAuthLink[] = [];
  private backup = new Map<string, string[]>();

  async findByEmail(email: string): Promise<User | null> {
    const id = this.byEmail.get(email.toLowerCase());
    return id ? this.users.get(id) ?? null : null;
  }
  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }
  async findByOAuth(provider: string, providerUserId: string): Promise<User | null> {
    const link = this.oauth.find(l => l.provider === provider && l.providerUserId === providerUserId);
    return link ? this.findById(link.userId) : null;
  }
  async insert(u: User): Promise<User> {
    if (this.byEmail.has(u.email.toLowerCase())) {
      throw new Error('email already exists');
    }
    this.users.set(u.id, u);
    this.byEmail.set(u.email.toLowerCase(), u.id);
    return u;
  }
  async update(id: string, patch: Partial<User>): Promise<User | null> {
    const u = this.users.get(id);
    if (!u) return null;
    const next = { ...u, ...patch, updatedAt: new Date() };
    this.users.set(id, next);
    return next;
  }
  async linkOAuth(userId: string, provider: string, providerUserId: string): Promise<void> {
    this.oauth.push({ userId, provider, providerUserId });
  }
  async setBackupCodes(userId: string, hashed: string[]): Promise<void> {
    this.backup.set(userId, hashed);
  }
  async getBackupCodes(userId: string): Promise<string[]> {
    return this.backup.get(userId) ?? [];
  }
}

export interface NewUserInput {
  email: string;
  passwordHash: string | null;
  fullName: string;
  phone?: string | null;
  roles: Role[];
  category: Category;
}

export function buildUser(id: string, input: NewUserInput): User {
  const now = new Date();
  return {
    id,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    passwordAlgo: input.passwordHash ? 'argon2id' : null,
    phone: input.phone ?? null,
    fullName: input.fullName,
    roles: input.roles,
    category: input.category,
    totpSecretEnc: null,
    smsOtpEnabled: false,
    twoFaEnabled: false,
    isActive: true,
    emailVerified: false,
    failedLoginCount: 0,
    lockedUntil: null,
    createdAt: now,
    updatedAt: now,
  };
}
