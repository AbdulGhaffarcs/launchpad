import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { updateProject, removeProject } from '../../../lib/storage';
import { getSession } from '../../../lib/session';
import { yamlArray, yamlString } from '../../../lib/utils';

const categories = new Set(['AI', 'Web', 'Mobile', 'Systems', 'Security', 'Data', 'Education', 'Developer Tools', 'Other']);
function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function list(value: unknown) { return clean(value, 700).split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12); }
function makeMarkdown(input: Record<string, unknown>) {
  return `---\n${[
    `title: ${yamlString(String(input.title))}`,
    `studentName: ${yamlString(String(input.studentName))}`,
    `ownerLogin: ${yamlString(String(input.ownerLogin))}`,
    `github: ${input.github ? yamlString(String(input.github)) : 'null'}`,
    `demo: ${input.demo ? yamlString(String(input.demo)) : 'null'}`,
    `linkedin: ${input.linkedin ? yamlString(String(input.linkedin)) : 'null'}`,
    `description: ${yamlString(String(input.description))}`,
    `stack: ${yamlArray(input.stack as string[])}`,
    `lookingFor: ${yamlArray(input.lookingFor as string[])}`,
    `category: ${yamlString(String(input.category))}`,
    `date: ${yamlString(String(input.date))}`,
    `featured: ${Boolean(input.featured)}`,
    `privateRepo: ${Boolean(input.privateRepo)}`,
  ].join('\n')}\n---\n\n${String(input.description)}\n`;
}

async function getOwnedProject(slug: string, login: string) {
  const project = (await getCollection('projects')).find((item) => item.id === slug);
  if (!project) return null;
  const owner = (project.data.ownerLogin ?? project.data.studentName).toLowerCase() === login.toLowerCase();
  return owner ? project : null;
}

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  const session = await getSession(cookies);
  if (!session) return Response.json({ error: 'Sign in with GitHub first.' }, { status: 401 });

  const slug = params.slug;
  if (!slug) return Response.json({ error: 'Missing project.' }, { status: 400 });
  const project = await getOwnedProject(slug, session.login);
  if (!project) return Response.json({ error: 'Project not found or you do not own it.' }, { status: 404 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  const title = clean(body.title, 100);
  const description = clean(body.description, 1200);
  const category = clean(body.category, 40) || 'Other';
  if (!title || !description || !categories.has(category)) return Response.json({ error: 'Invalid project details.' }, { status: 400 });

  const privateRequested = body.privateRepo === true || body.privateRepo === 'true' || body.privateRepo === 'on';
  const github = privateRequested ? '' : clean(body.github, 500);
  const data = {
    title,
    studentName: project.data.studentName,
    ownerLogin: session.login,
    github: github || null,
    demo: clean(body.demo, 500) || null,
    linkedin: clean(body.linkedin, 500) || null,
    description,
    stack: list(body.stack),
    lookingFor: list(body.lookingFor),
    category,
    date: project.data.date.toISOString(),
    featured: project.data.featured,
    privateRepo: privateRequested,
  };

  try {
    await updateProject(slug, makeMarkdown(data), title);
    return Response.json({ ok: true, local: import.meta.env.DEV });
  } catch (error) {
    console.error('Could not update project:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Could not update project.' }, { status: 502 });
  }
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  const session = await getSession(cookies);
  if (!session) return Response.json({ error: 'Sign in with GitHub first.' }, { status: 401 });

  const slug = params.slug;
  if (!slug) return Response.json({ error: 'Missing project.' }, { status: 400 });
  const project = await getOwnedProject(slug, session.login);
  if (!project) return Response.json({ error: 'Project not found or you do not own it.' }, { status: 404 });

  try {
    await removeProject(slug, project.data.title);
    return Response.json({ ok: true, local: import.meta.env.DEV });
  } catch (error) {
    console.error('Could not delete project:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Could not delete project.' }, { status: 502 });
  }
};
