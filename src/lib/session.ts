import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { refreshUserToken, type GithubUser } from './github';

const COOKIE = 'lp_session';
const STATE_COOKIE = 'lp_oauth_state';
const NEXT_COOKIE = 'lp_oauth_next';

function secret() {
  const value = import.meta.env.SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return new TextEncoder().encode(value);
}

type Session = JWTPayload & {
  login: string;
  avatarUrl: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

export async function sealSession(data: Omit<Session, 'iat' | 'exp'>) {
  return new SignJWT(data).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt().setExpirationTime('180d').sign(secret());
}

export async function readSession(cookieValue: string | undefined) {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, secret());
    return payload as Session;
  } catch { return null; }
}

export async function getSession(cookies: any) {
  const raw = cookies.get(COOKIE)?.value;
  const session = await readSession(raw);
  if (!session) return null;
  if (session.expiresAt > Date.now() + 60_000) return session;
  if (!session.refreshToken) return null;
  try {
    const refreshed = await refreshUserToken(session.refreshToken);
    const next = {
      login: session.login,
      avatarUrl: session.avatarUrl,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? session.refreshToken,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
    };
    setSession(cookies, await sealSession(next));
    return { ...session, ...next };
  } catch {
    clearSession(cookies);
    return null;
  }
}

export function setSession(cookies: any, token: string) {
  cookies.set(COOKIE, token, { httpOnly: true, secure: import.meta.env.PROD, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 180 });
}
export function clearSession(cookies: any) { cookies.delete(COOKIE, { path: '/' }); }
export function setOAuthState(cookies: any, state: string, next: string) {
  cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: import.meta.env.PROD, sameSite: 'lax', path: '/', maxAge: 600 });
  cookies.set(NEXT_COOKIE, next, { httpOnly: true, secure: import.meta.env.PROD, sameSite: 'lax', path: '/', maxAge: 600 });
}
export function consumeOAuthState(cookies: any) {
  const state = cookies.get(STATE_COOKIE)?.value;
  const next = cookies.get(NEXT_COOKIE)?.value || '/';
  cookies.delete(STATE_COOKIE, { path: '/' });
  cookies.delete(NEXT_COOKIE, { path: '/' });
  return { state, next };
}
export async function sessionFromGithubUser(cookies: any, user: GithubUser, oauth: { access_token: string; refresh_token?: string; expires_in?: number }) {
  setSession(cookies, await sealSession({
    login: user.login,
    avatarUrl: user.avatar_url,
    accessToken: oauth.access_token,
    refreshToken: oauth.refresh_token,
    expiresAt: Date.now() + (oauth.expires_in ?? 28800) * 1000,
  }));
}
