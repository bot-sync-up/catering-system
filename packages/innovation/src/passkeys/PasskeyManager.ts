/**
 * PasskeyManager
 *
 * עוטף את `@simplewebauthn/server` ל-API נוח לפלטפורמת Sync Up.
 *
 * תהליכים נתמכים:
 *  • Registration — `generateRegistrationOptions` -> `verifyRegistration`.
 *  • Authentication — `generateAuthenticationOptions` -> `verifyAuthentication`.
 *  • Recovery codes — `generateRecoveryCodes` + `consumeRecoveryCode`.
 *
 * אחסון הקרדנשיאלים והקודים הוא חיצוני — מועבר כ-callbacks (`store`).
 */

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type GenerateAuthenticationOptionsOpts,
  type GenerateRegistrationOptionsOpts,
  type RegistrationResponseJSON,
  type VerifiedAuthenticationResponse,
  type VerifiedRegistrationResponse,
} from "@simplewebauthn/server";
import { createHash, randomBytes } from "node:crypto";

export interface StoredCredential {
  credentialId: string;
  publicKey: Uint8Array;
  counter: number;
  transports?: AuthenticatorTransport[];
  /** מתי נוצר. */
  createdAt: Date;
  /** label ידידותי שהמשתמש נתן (לדוגמה: "iPhone של דוד"). */
  label?: string;
}

export interface PasskeyStore {
  /** מחזיר את כל ה-passkeys של משתמש. */
  list(userId: string): Promise<StoredCredential[]>;
  add(userId: string, credential: StoredCredential): Promise<void>;
  updateCounter(userId: string, credentialId: string, counter: number): Promise<void>;
  /** שומר את הקודים אחרי הצפנת hash. */
  saveRecoveryCodeHashes(userId: string, hashes: string[]): Promise<void>;
  /** מחזיר את כל ההאשים הקיימים — לשם השוואה. */
  listRecoveryCodeHashes(userId: string): Promise<string[]>;
  /** מסמן hash כ-consumed (לא ניתן לשימוש חוזר). */
  consumeRecoveryCodeHash(userId: string, hash: string): Promise<boolean>;
}

export interface PasskeyManagerOptions {
  /** Relying Party ID — דומיין (לדוגמה syncup.co.il). */
  rpId: string;
  /** שם להצגה. */
  rpName: string;
  /** רשימת origins מותרים (URL מלאים). */
  expectedOrigins: string[];
  /** מימוש אחסון — אם לא מסופק נשמש במימוש in-memory למצב dev. */
  store?: PasskeyStore;
}

type AuthenticatorTransport = "ble" | "internal" | "nfc" | "usb" | "hybrid";

export class PasskeyManager {
  private rpId: string;
  private rpName: string;
  private expectedOrigins: string[];
  private store: PasskeyStore;

  constructor(opts: PasskeyManagerOptions) {
    this.rpId = opts.rpId;
    this.rpName = opts.rpName;
    this.expectedOrigins = opts.expectedOrigins;
    this.store = opts.store ?? new InMemoryPasskeyStore();
  }

  /** שלב 1 ברישום — מחזיר אופציות שלקוח שולח ל-WebAuthn API. */
  async startRegistration(user: { id: string; name: string; displayName: string }) {
    const existing = await this.store.list(user.id);
    const opts: GenerateRegistrationOptionsOpts = {
      rpName: this.rpName,
      rpID: this.rpId,
      userID: new TextEncoder().encode(user.id),
      userName: user.name,
      userDisplayName: user.displayName,
      attestationType: "none",
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: c.transports,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    };
    return generateRegistrationOptions(opts);
  }

  /** שלב 2 ברישום — מאמת את התגובה ושומר את הקרדנשיאל. */
  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    expectedChallenge: string,
    label?: string,
  ): Promise<VerifiedRegistrationResponse> {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.expectedOrigins,
      expectedRPID: this.rpId,
    });
    if (verification.verified && verification.registrationInfo) {
      const info = verification.registrationInfo;
      await this.store.add(userId, {
        credentialId: info.credential.id,
        publicKey: info.credential.publicKey,
        counter: info.credential.counter,
        transports: info.credential.transports as AuthenticatorTransport[] | undefined,
        createdAt: new Date(),
        label,
      });
    }
    return verification;
  }

  /** שלב 1 בכניסה — מחזיר options ללקוח. */
  async startAuthentication(userId?: string) {
    const allowCredentials = userId
      ? (await this.store.list(userId)).map((c) => ({
          id: c.credentialId,
          transports: c.transports,
        }))
      : undefined;
    const opts: GenerateAuthenticationOptionsOpts = {
      rpID: this.rpId,
      userVerification: "preferred",
      allowCredentials,
    };
    return generateAuthenticationOptions(opts);
  }

  /** שלב 2 בכניסה — אימות התגובה ועדכון counter. */
  async verifyAuthentication(
    userId: string,
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
  ): Promise<VerifiedAuthenticationResponse> {
    const stored = (await this.store.list(userId)).find((c) => c.credentialId === response.id);
    if (!stored) {
      throw new Error("PASSKEY_NOT_FOUND");
    }
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.expectedOrigins,
      expectedRPID: this.rpId,
      credential: {
        id: stored.credentialId,
        publicKey: stored.publicKey,
        counter: stored.counter,
        transports: stored.transports,
      },
    });
    if (verification.verified) {
      await this.store.updateCounter(userId, stored.credentialId, verification.authenticationInfo.newCounter);
    }
    return verification;
  }

  /** מייצר 10 קודי שחזור (4-4-4 תווים) ושומר רק את ההאש. */
  async generateRecoveryCodes(userId: string, count = 10): Promise<string[]> {
    const codes: string[] = [];
    const hashes: string[] = [];
    for (let i = 0; i < count; i++) {
      const raw = randomBytes(6).toString("hex").toUpperCase();
      const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
      codes.push(formatted);
      hashes.push(hashCode(formatted));
    }
    await this.store.saveRecoveryCodeHashes(userId, hashes);
    return codes;
  }

  /** מנסה לצרוך קוד שחזור. מחזיר true אם הצליח. */
  async useRecoveryCode(userId: string, code: string): Promise<boolean> {
    return this.store.consumeRecoveryCodeHash(userId, hashCode(code));
  }
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** מימוש in-memory לצרכי בדיקות / מצב dev. */
export class InMemoryPasskeyStore implements PasskeyStore {
  private creds = new Map<string, StoredCredential[]>();
  private recovery = new Map<string, Set<string>>();

  async list(userId: string): Promise<StoredCredential[]> {
    return this.creds.get(userId) ?? [];
  }
  async add(userId: string, credential: StoredCredential): Promise<void> {
    const list = this.creds.get(userId) ?? [];
    list.push(credential);
    this.creds.set(userId, list);
  }
  async updateCounter(userId: string, credentialId: string, counter: number): Promise<void> {
    const list = this.creds.get(userId);
    if (!list) return;
    const c = list.find((x) => x.credentialId === credentialId);
    if (c) c.counter = counter;
  }
  async saveRecoveryCodeHashes(userId: string, hashes: string[]): Promise<void> {
    this.recovery.set(userId, new Set(hashes));
  }
  async listRecoveryCodeHashes(userId: string): Promise<string[]> {
    return [...(this.recovery.get(userId) ?? [])];
  }
  async consumeRecoveryCodeHash(userId: string, hash: string): Promise<boolean> {
    const set = this.recovery.get(userId);
    if (!set || !set.has(hash)) return false;
    set.delete(hash);
    return true;
  }
}
