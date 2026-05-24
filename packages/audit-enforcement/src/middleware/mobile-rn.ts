/**
 * עזר לאפליקציית React Native / Expo — בונה כותרות HTTP שיגיעו ל-API
 * עם זיהוי המשתמש וה-request id; השרת מצידו ישתמש ב-expressAuditMiddleware
 * עם getUserId שמסתמך על JWT בכותרות הללו.
 */
export interface MobileRnAuditHeadersOptions {
  userId?: string;
  tenantId?: string;
  role?: string;
  appVersion?: string;
  deviceId?: string;
}

/**
 * מחזיר אובייקט headers שמתאים ל-fetch / axios.
 * שולח רק את מה שנדרש לשרת לזיהוי הקשר. JWT עצמו צריך לבוא בנוסף ב-Authorization.
 */
export function mobileRnAuditHeaders(
  options: MobileRnAuditHeadersOptions,
): Record<string, string> {
  const requestId = generateRequestId();
  const headers: Record<string, string> = {
    'x-request-id': requestId,
    'x-channel': 'mobile',
  };
  if (options.userId) headers['x-user-id'] = options.userId;
  if (options.tenantId) headers['x-tenant-id'] = options.tenantId;
  if (options.role) headers['x-role'] = options.role;
  if (options.appVersion) headers['x-app-version'] = options.appVersion;
  if (options.deviceId) headers['x-device-id'] = options.deviceId;
  return headers;
}

function generateRequestId(): string {
  // לא ניתן להניח שקיים crypto.randomUUID בכל סביבות RN
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${time}-${rand}`;
}
