import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getRepo, isStarred, setStar } from '../../lib/github';
import { getSession } from '../../lib/session';
import { parseGithubUrl } from '../../lib/utils';

async function getProject(slug: string | null) {
  if (!slug) return null;
  return (await getCollection('projects')).find((p) => p.id === slug) ?? null;
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const project = await getProject(url.searchParams.get('slug'));
  if (!project?.data.github) return Response.json({ error: 'This project does not have a GitHub repository.' }, { status: 404 });
  const { owner, repo } = parseGithubUrl(project.data.github);
  const session = await getSession(cookies);
  try {
    const repository = await getRepo(session?.accessToken ?? null, owner, repo);
    let starred = false;
    if (session) starred = await isStarred(session.accessToken, owner, repo);
    return Response.json({ authenticated: !!session, starred, count: repository.stargazers_count });
  } catch (error) {
    console.error('Star GET failed:', error);
    return Response.json({ error: 'GitHub activity is temporarily unavailable.' }, { status: 502 });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSession(cookies);
  if (!session) return Response.json({ error: 'Sign in with GitHub first.', code: 'AUTH_REQUIRED' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const project = await getProject(typeof body.slug === 'string' ? body.slug : null);
  if (!project?.data.github) return Response.json({ error: 'This project does not have a GitHub repository.' }, { status: 404 });

  const { owner, repo } = parseGithubUrl(project.data.github);
  try {
    const before = await isStarred(session.accessToken, owner, repo);
    const after = !before;
    await setStar(session.accessToken, owner, repo, after);
    const repository = await getRepo(session.accessToken, owner, repo);
    return Response.json({ starred: after, count: repository.stargazers_count });
  } catch (error) {
    console.error('Star POST failed:', error);
    const message = error instanceof Error ? error.message : '';
    const permissionProblem = message.includes('403') || message.includes('Resource not accessible') || message.includes('insufficient');
    return Response.json({
      error: permissionProblem
        ? 'GitHub has not granted Launchpad permission to manage stars for your account. Re-authorize Launchpad after enabling the App Starring permission.'
        : 'GitHub could not complete the star action right now.',
      code: permissionProblem ? 'STAR_PERMISSION_REQUIRED' : 'STAR_FAILED',
    }, { status: permissionProblem ? 403 : 502 });
  }
};
