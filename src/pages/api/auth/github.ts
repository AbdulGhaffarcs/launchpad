import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { setOAuthState } from '../../../lib/session';
import { safeNext } from '../../../lib/utils';

function base64url(value: Buffer) {
  return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export const GET: APIRoute = ({ cookies, url, redirect }) => {
  const clientId = import.meta.env.GITHUB_OAUTH_CLIENT_ID ?? process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) return new Response('Missing GITHUB_OAUTH_CLIENT_ID', { status: 500 });

  const state = base64url(crypto.randomBytes(32));
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  const next = safeNext(url.searchParams.get('next'));
  const redirectUri = `${url.origin}/api/auth/github/callback`;

  setOAuthState(cookies, state, verifier, next);

  const auth = new URL('https://github.com/login/oauth/authorize');
  auth.searchParams.set('client_id', clientId);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('state', state);
  auth.searchParams.set('code_challenge', challenge);
  auth.searchParams.set('code_challenge_method', 'S256');
  auth.searchParams.set('scope', 'public_repo');
  auth.searchParams.set('allow_signup', 'true');

  return redirect(auth.toString(), 302);
};
