import type { APIRoute } from 'astro';
import { getRepo } from '../../../lib/github';
import { getSession } from '../../../lib/session';
import { parseGithubUrl } from '../../../lib/utils';

export const GET: APIRoute = async ({ url, cookies }) => {
  const session = await getSession(cookies);
  if (!session) return Response.json({ error: 'Sign in with GitHub first.' }, { status: 401 });
  const value = url.searchParams.get('url');
  if (!value) return Response.json({ error: 'Missing GitHub URL.' }, { status: 400 });
  try {
    const { owner, repo } = parseGithubUrl(value);
    const data = await getRepo(session.accessToken, owner, repo);
    return Response.json({
      name: data.name,
      description: data.description ?? '',
      language: data.language,
      topics: data.topics ?? [],
      stars: data.stargazers_count,
      private: data.private,
      owner: data.owner.login,
      url: data.html_url,
    });
  } catch {
    return Response.json({ error: 'GitHub could not access that repository. Public repositories work immediately; private repositories may require additional GitHub App installation access.' }, { status: 404 });
  }
};
