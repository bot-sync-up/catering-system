// כלי עזר לאימות משתמשים בבדיקות k6
// משתמש ב-cache ברמת VU כדי לא להעמיס על endpoint ה-login.

import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'https://staging.example.co.il';
const AUTH_PATH = __ENV.AUTH_PATH || '/api/auth/login';

// cache לטוקנים ברמת VU - לא משותף בין VUs כדי לא להפיל את המערכת בלוג-אין
const tokenCache = {};

export const users = new SharedArray('users', function () {
  // אפשר להזריק קובץ users.json דרך __ENV.USERS_FILE
  const file = __ENV.USERS_FILE;
  if (file) {
    return JSON.parse(open(file));
  }
  // ברירת מחדל - יוזרים סינתטיים
  const arr = [];
  for (let i = 0; i < 500; i++) {
    arr.push({
      email: `loadtest+${i}@syncup.co.il`,
      password: __ENV.TEST_PASSWORD || 'LoadTest123!',
      role: i % 50 === 0 ? 'admin' : 'customer',
    });
  }
  return arr;
});

export function getUser(vu) {
  return users[vu % users.length];
}

export function login(user) {
  const key = user.email;
  if (tokenCache[key]) {
    return tokenCache[key];
  }

  const res = http.post(
    `${BASE_URL}${AUTH_PATH}`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'auth_login' },
    }
  );

  const ok = check(res, {
    'login 200': (r) => r.status === 200,
    'login has token': (r) => !!(r.json('token') || r.json('accessToken')),
  });

  if (!ok) {
    return null;
  }

  const token = res.json('token') || res.json('accessToken');
  tokenCache[key] = token;
  return token;
}

export function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'he-IL',
    },
  };
}

export function loginAsRandomUser(vu) {
  const user = getUser(vu);
  const token = login(user);
  return { user, token };
}
