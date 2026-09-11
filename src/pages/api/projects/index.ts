import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { createProjectFile, getRepo } from '../../../lib/github';
import { getSession } from '../../../lib/session';
import { parseGithubUrl, slugify, yamlArray, yamlString } from '../../../lib/utils';

const categories = new Set([
  'AI', 'Web', 'Mobile', 'Systems', 'Security', 'Data', 'Education', 'Developer Tools', 'Other'
]);

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function list(value: unknown, maxItems = 12) {
  return clean(value, 500)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSession(cookies);
  if (!session) return Response.json({ error: 'Sign in with GitHub first.' }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  const title = clean(body.title, 100);
  const description = clean(body.description, 1200);
  const github = clean(body.github, 500);
  const demo = clean(body.demo, 500) || '';
  const linkedin = clean(body.linkedin, 500) || '';
  const category = clean(body.category, 40);
  const stack = list(body.stack);
  const lookingFor = list(body.lookingFor);

  if (!title || !description) return Response.json({ error: 'Project name and description are required.' }, { status: 400 });
  if (category && !categories.has(category)) return Response.json({ error: 'Invalid category.' }, { status: 400 });

  let githubOwner = '';
  let githubRepo = '';
  let privateRepo = false;

  if (github) {
    try {
      ({ owner: githubOwner, repo: githubRepo } = parseGithubUrl(github));
      const repo = await getRepo(session.accessToken, githubOwner, githubRepo);
      privateRepo = repo.private;
      if (repo.owner.login.toLowerCase() !== session.login.toLowerCase()) {
        return Response.json({ error: 'Submit a repository you own.' }, { status: 403 });
      }
    } catch {
      return Response.json({ error: 'That GitHub repository could not be verified with your GitHub account.' }, { status: 400 });
    }
  }

  const existing = await getCollection('projects');
  const base = slugify(title);
  const used = new Set(existing.map((project) => project.id));
  let slug = base;
  let n = 2;
  while (used.has(slug)) slug = `${base}-${n++}`;

  const content = `---\n${[
    `title: ${yamlString(title)}`,
    `studentName: ${yamlString(session.login)}`,
    `github: ${github ? yamlString(github) : 'null'}`,
    `demo: ${demo ? yamlString(demo) : 'null'}`,
    `linkedin: ${linkedin ? yamlString(linkedin) : 'null'}`,
    `description: ${yamlString(description)}`,
    `stack: ${yamlArray(stack)}`,
    `lookingFor: ${yamlArray(lookingFor)}`,
    `category: ${yamlString(category || 'Other')}`,
    `date: ${yamlString(new Date().toISOString())}`,
    `featured: false`,
    `privateRepo: ${privateRepo}`,
  ].join('\n')}\n---\n\n${description}\n`;

  try {
    await createProjectFile(`src/content/projects/${slug}.md`, content, `Add project: ${title}`);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Could not publish the project to Launchpad.' }, { status: 502 });
  }

  return Response.json({ slug, githubOwner, githubRepo }, { status: 201 });
};
