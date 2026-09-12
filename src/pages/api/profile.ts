import type { APIRoute } from 'astro';
import { getUser } from '../../lib/github';
import { getSession } from '../../lib/session';
import { readProfile, saveProfile } from '../../lib/storage';

function validUrl(value: string) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export const GET: APIRoute = async ({ cookies }) => {
  const session = await getSession(cookies);
  if (!session) return Response.json({ error: 'Sign in with GitHub first.' }, { status: 401 });
  const github = await getUser(session.accessToken);
  const profile = await readProfile(session.login);
  return Response.json({ github, profile });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const session = await getSession(cookies);
  if (!session) return Response.json({ error: 'Sign in with GitHub first.' }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  const profile = {
    displayName: typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 80) || session.login : session.login,
    bio: typeof body.bio === 'string' ? body.bio.trim().slice(0, 280) : '',
    website: typeof body.website === 'string' ? validUrl(body.website.trim()) : '',
    linkedin: typeof body.linkedin === 'string' ? validUrl(body.linkedin.trim()) : '',
  };

  try {
    await saveProfile(session.login, profile);
    return Response.json({ ok: true, profile, local: import.meta.env.DEV });
  } catch (error) {
    console.error('Could not save profile:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Could not save your profile.' }, { status: 502 });
  }
};
