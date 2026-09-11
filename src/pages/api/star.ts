import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { isStarred, setStar } from '../../lib/github';
import { getSession } from '../../lib/session';
import { parseGithubUrl } from '../../lib/utils';

async function getProject(slug: string | null) {
  if (!slug) return null;
  const projects = await getCollection('projects');
  return projects.find((p) => p.id === slug) ?? null;
}

async function publicCount(owner: string, repo: string) {
  try {
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10' },
      next: { revalidate: 300 },
    } as RequestInit);
    if (!response.ok) return null;
    const data = await response.json() as { stargazers_count?: number };
    return data.stargazers_count ?? null;
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const project = await getProject(url.searchParams.get('slug'));
  if (!project?.data.github) return Response.json({ error: 'Project has no GitHub repository.' }, { status: 404 });
  const { owner, repo } = parseGithubUrl(project.data.github);
  const session = await getSession(cookies);
  let starred = false;
  if (session) {
    try {
      starred = await isStarred(session.accessToken, owner, repo);
    } catch {
      starred = false;
    }
  }
  return Response.json({ authenticated: !!session, starred, count: await publicCount(owner, repo) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSession(cookies);
  if (!session) return Response.json({ error: 'Sign in with GitHub first.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const project = await getProject(typeof body.id === 'string' ? body.id : null);
  if (!project?.data.github) return Response.json({ error: 'Project has no GitHub repository.' }, { status: 404 });
  const { owner, repo } = parseGithubUrl(project.data.github);
  try {
    const before = await isStarred(session.accessToken, owner, repo);
    const after = !before;
    await setStar(session.accessToken, owner, repo, after);
    return Response.json({ starred: after, count: await publicCount(owner, repo) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'GitHub did not allow the star action. Check the App permission for Starring.' }, { status: 502 });
  }
};
