import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getRepo } from '../../../lib/github';
import { getSession } from '../../../lib/session';
import { saveProject } from '../../../lib/storage';
import { parseGithubUrl, slugify, yamlArray, yamlString } from '../../../lib/utils';

const categories = new Set(['AI', 'Web', 'Mobile', 'Systems', 'Security', 'Data', 'Education', 'Developer Tools', 'Other']);

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function list(value: unknown, maxItems = 12) {
  return clean(value, 700).split(',').map((item) => item.trim()).filter(Boolean).slice(0, maxItems);
}

function makeMarkdown(input: {
  title: string;
  studentName: string;
  ownerLogin: string;
  github: string;
  demo: string;
  linkedin: string;
  description: string;
  stack: string[];
  lookingFor: string[];
  category: string;
  privateRepo: boolean;
}) {
  return `---\n${[
    `title: ${yamlString(input.title)}`,
    `studentName: ${yamlString(input.studentName)}`,
    `ownerLogin: ${yamlString(input.ownerLogin)}`,
    `github: ${input.github ? yamlString(input.github) : 'null'}`,
    `demo: ${input.demo ? yamlString(input.demo) : 'null'}`,
    `linkedin: ${input.linkedin ? yamlString(input.linkedin) : 'null'}`,
    `description: ${yamlString(input.description)}`,
    `stack: ${yamlArray(input.stack)}`,
    `lookingFor: ${yamlArray(input.lookingFor)}`,
    `category: ${yamlString(input.category)}`,
    `date: ${yamlString(new Date().toISOString())}`,
    `featured: false`,
    `privateRepo: ${input.privateRepo}`,
  ].join('\n')}\n---\n\n${input.description}\n`;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSession(cookies);
  if (!session) return Response.json({ error: 'Sign in with GitHub first.' }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  const title = clean(body.title, 100);
  const description = clean(body.description, 1200);
  const githubInput = clean(body.github, 500);
  const demo = clean(body.demo, 500);
  const linkedin = clean(body.linkedin, 500);
  const category = clean(body.category, 40) || 'Other';
  const stack = list(body.stack);
  const lookingFor = list(body.lookingFor);
  const privateRequested = body.privateRepo === true || body.privateRepo === 'true' || body.privateRepo === 'on';

  if (!title || !description) return Response.json({ error: 'Project name and description are required.' }, { status: 400 });
  if (!categories.has(category)) return Response.json({ error: 'Invalid category.' }, { status: 400 });

  let github = '';
  let privateRepo = privateRequested;

  if (githubInput) {
    try {
      const { owner, repo } = parseGithubUrl(githubInput);
      if (!privateRequested) {
        const remote = await getRepo(null, owner, repo);
        github = remote.private ? '' : remote.html_url;
        privateRepo = remote.private;
      }
    } catch {
      if (!privateRequested) {
        return Response.json({ error: 'That GitHub repository could not be read. Mark it as private if it is private, or check the URL.' }, { status: 400 });
      }
    }
  }

  const existing = await getCollection('projects');
  const used = new Set(existing.map((project) => project.id));
  const base = slugify(title);
  let slug = base;
  let n = 2;
  while (used.has(slug)) slug = `${base}-${n++}`;

  const markdown = makeMarkdown({
    title,
    studentName: session.login,
    ownerLogin: session.login,
    github,
    demo,
    linkedin,
    description,
    stack,
    lookingFor,
    category,
    privateRepo,
  });

  try {
    const result = await saveProject(slug, markdown, title);
    return Response.json({ slug, local: result.local }, { status: 201 });
  } catch (error) {
    console.error('Could not publish project:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Could not publish the project.' }, { status: 502 });
  }
};
