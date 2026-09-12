import type { APIRoute } from 'astro';
import { GitHubApiError, getRepo } from '../../../lib/github';
import { getSession } from '../../../lib/session';
import { parseGithubUrl } from '../../../lib/utils';

export const GET: APIRoute = async ({ url, cookies }) => {
  const value = url.searchParams.get('url')?.trim() ?? '';
  if (!value) return Response.json({ error: 'Enter a GitHub repository URL.' }, { status: 400 });

  try {
    const { owner, repo } = parseGithubUrl(value);
    const session = await getSession(cookies);
    const data = await getRepo(session?.accessToken ?? null, owner, repo);
    return Response.json({
      name: data.name,
      owner: data.owner.login,
      description: data.description,
      stars: data.stargazers_count,
      language: data.language,
      topics: data.topics ?? [],
      private: data.private,
      html_url: data.html_url,
    });
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      return Response.json({
        privateOrUnavailable: true,
        message: 'GitHub could not expose this repository here. If it is private, you can still submit it; Launchpad will not publish the private URL.',
      }, { status: 404 });
    }
    return Response.json({ error: 'That is not a valid GitHub repository.' }, { status: 400 });
  }
};
