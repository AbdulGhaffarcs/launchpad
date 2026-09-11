import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { setOAuthState } from '../../../lib/session';
import { safeNext } from '../../../lib/utils';

export const GET: APIRoute = ({ cookies, url, redirect }) => {
  const clientId = import.meta.env.GITHUB_CLIENT_ID ?? process.env.GITHUB_CLIENT_ID;
  if (!clientId) return new Response('Missing GITHUB_CLIENT_ID', { status: 500 });
  const state = crypto.randomBytes(24).toString('hex');
  const next = safeNext(url.searchParams.get('next'));
  const redirectUri = `${url.origin}/api/auth/github/callback`;
  setOAuthState(cookies, state, next);
  const auth = new URL('https://github.com/login/oauth/authorize');
  auth.searchParams.set('client_id', clientId);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('state', state);
  auth.searchParams.set('allow_signup', 'true');
  return redirect(auth.toString(), 302);
};
