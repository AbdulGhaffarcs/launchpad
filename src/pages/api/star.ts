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
  if (!project?.data.github) return Response.json({ error: 'Project has no GitHub repository.' }, { status: 404 });
  const { owner, repo } = parseGithubUrl(project.data.github);
  const session = await getSession(cookies);
  const repository = await getRepo(session?.accessToken ?? null, owner, repo).catch(() => null);
  if (!repository) return Response.json({ error: 'GitHub repository is unavailable.' }, { status: 404 });
  let starred = false;
  if (session) starred = await isStarred(session.accessToken, owner, repo).catch(() => false);
  return Response.json({ authenticated: !!session, starred, count: repository.stargazers_count });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSession(cookies);
  if (!session) return Response.json({ error: 'Sign in with GitHub first.' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const project = await getProject(typeof body.slug === 'string' ? body.slug : null);
  if (!project?.data.github) return Response.json({ error: 'Project has no GitHub repository.' }, { status: 404 });
  const { owner, repo } = parseGithubUrl(project.data.github);
  try {
    const before = await isStarred(session.accessToken, owner, repo);
    const after = !before;
    await setStar(session.accessToken, owner, repo, after);
    const repository = await getRepo(session.accessToken, owner, repo);
    return Response.json({ starred: after, count: repository.stargazers_count });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'GitHub denied the star action. Check the App Starring permission.' }, { status: 502 });
  }
};
