import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getRepo, isStarred, setStar, GitHubApiError } from '../../lib/github';
import { getSession } from '../../lib/session';
import { parseGithubUrl } from '../../lib/utils';

async function findProject(slug: string | null) {
  if (!slug) return null;
  return (await getCollection('projects')).find((item) => item.id === slug) ?? null;
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const project = await findProject(url.searchParams.get('slug'));
  if (!project?.data.github) {
    return Response.json({ error: 'This project does not have a GitHub repository.' }, { status: 404 });
  }

  try {
    const { owner, repo } = parseGithubUrl(project.data.github);
    const repository = await getRepo(null, owner, repo);
    const session = await getSession(cookies);
    let starred = false;

    if (session) {
      try {
        starred = await isStarred(session.accessToken, owner, repo);
      } catch (error) {
        if (!(error instanceof GitHubApiError && (error.status === 401 || error.status === 403))) throw error;
      }
    }

    return Response.json({
      count: repository.stargazers_count,
      starred,
      authenticated: !!session,
      url: repository.html_url,
    });
  } catch (error) {
    if (error instanceof GitHubApiError) {
      return Response.json({ error: 'GitHub stars are temporarily unavailable.' }, { status: 502 });
    }
    return Response.json({ error: 'Invalid repository.' }, { status: 400 });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSession(cookies);
  if (!session) return Response.json({ error: 'Sign in with GitHub first.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const project = await findProject(typeof body.slug === 'string' ? body.slug : null);

  if (!project?.data.github) {
    return Response.json({ error: 'This project does not have a GitHub repository.' }, { status: 404 });
  }

  try {
    const { owner, repo } = parseGithubUrl(project.data.github);
    const currentlyStarred = await isStarred(session.accessToken, owner, repo);
    await setStar(session.accessToken, owner, repo, !currentlyStarred);

    const repository = await getRepo(null, owner, repo);

    return Response.json({
      starred: !currentlyStarred,
      count: repository.stargazers_count,
    });
  } catch (error) {
    console.error('Star action failed:', error);

    if (error instanceof GitHubApiError && error.status === 403) {
      return Response.json({
        error: 'GitHub denied this action. Please reconnect Launchpad and allow public repository access.',
        reauthorize: true,
      }, { status: 403 });
    }

    if (error instanceof GitHubApiError && error.status === 401) {
      return Response.json({
        error: 'Your GitHub session expired. Reconnect Launchpad.',
        reauthorize: true,
      }, { status: 401 });
    }

    return Response.json({ error: 'Could not change the GitHub star.' }, { status: 502 });
  }
};
