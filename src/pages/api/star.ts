import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getRepo, GitHubApiError } from '../../lib/github';
import { parseGithubUrl } from '../../lib/utils';

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');
  const project = slug ? (await getCollection('projects')).find((item) => item.id === slug) : null;
  if (!project?.data.github) return Response.json({ error: 'This project does not have a public GitHub repository.' }, { status: 404 });

  try {
    const { owner, repo } = parseGithubUrl(project.data.github);
    const repository = await getRepo(null, owner, repo);
    return Response.json({ count: repository.stargazers_count, url: repository.html_url });
  } catch (error) {
    if (error instanceof GitHubApiError) return Response.json({ error: 'GitHub stars are temporarily unavailable.' }, { status: 502 });
    return Response.json({ error: 'Invalid repository.' }, { status: 400 });
  }
};

export const POST: APIRoute = async () => {
  return Response.json({
    error: 'Launchpad does not impersonate users to change GitHub stars. Use the repository button to star it directly on GitHub.',
  }, { status: 410 });
};
