import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { exchangeCode, getUser } from '../../../../lib/github';
import { consumeOAuthState, sessionFromGithubUser } from '../../../../lib/session';
import { safeNext } from '../../../../lib/utils';

export const GET: APIRoute = async ({ cookies, url, redirect }) => {
  const error = url.searchParams.get('error');
  if (error) return new Response(`GitHub authorization failed: ${error}`, { status: 400 });

  const code = url.searchParams.get('code');
  const incomingState = url.searchParams.get('state');
  const { state, next } = consumeOAuthState(cookies);

  if (!code || !incomingState || !state || !crypto.timingSafeEqual(Buffer.from(incomingState), Buffer.from(state))) {
    return new Response('Invalid OAuth state.', { status: 400 });
  }

  try {
    const redirectUri = `${url.origin}/api/auth/github/callback`;
    const oauth = await exchangeCode(code, redirectUri);
    const user = await getUser(oauth.access_token);
    await sessionFromGithubUser(cookies, user, oauth);
    return redirect(safeNext(next), 302);
  } catch (error) {
    console.error(error);
    return new Response('GitHub sign-in failed.', { status: 502 });
  }
};
