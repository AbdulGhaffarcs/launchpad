import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createOrUpdateRepoFile,
  deleteRepoFile,
  getRepoContent,
} from './github';

const projectDir = path.join(process.cwd(), 'src', 'content', 'projects');
const profileDir = path.join(process.cwd(), 'src', 'content', 'profiles');

function isLocal() {
  return import.meta.env.DEV;
}

export async function saveProject(slug: string, markdown: string, title: string) {
  if (isLocal()) {
    await mkdir(projectDir, { recursive: true });
    await writeFile(path.join(projectDir, `${slug}.md`), markdown, 'utf8');
    return { local: true };
  }
  await createOrUpdateRepoFile(`src/content/projects/${slug}.md`, markdown, `Add project: ${title}`);
  return { local: false };
}

export async function updateProject(slug: string, markdown: string, title: string) {
  if (isLocal()) {
    await mkdir(projectDir, { recursive: true });
    await writeFile(path.join(projectDir, `${slug}.md`), markdown, 'utf8');
    return { local: true };
  }
  await createOrUpdateRepoFile(`src/content/projects/${slug}.md`, markdown, `Update project: ${title}`);
  return { local: false };
}

export async function removeProject(slug: string, title: string) {
  if (isLocal()) {
    try { await unlink(path.join(projectDir, `${slug}.md`)); } catch {}
    return { local: true };
  }
  await deleteRepoFile(`src/content/projects/${slug}.md`, `Delete project: ${title}`);
  return { local: false };
}

export async function readProfile(login: string): Promise<Record<string, string>> {
  const filename = `${login.toLowerCase()}.json`;
  if (isLocal()) {
    try {
      return JSON.parse(await readFile(path.join(profileDir, filename), 'utf8')) as Record<string, string>;
    } catch {
      return {};
    }
  }

  const file = await getRepoContent(`src/content/profiles/${filename}`);
  if (!file?.content) return {};
  try {
    return JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function saveProfile(login: string, profile: Record<string, string>) {
  const filename = `${login.toLowerCase()}.json`;
  if (isLocal()) {
    await mkdir(profileDir, { recursive: true });
    await writeFile(path.join(profileDir, filename), JSON.stringify(profile, null, 2) + '\n', 'utf8');
    return { local: true };
  }
  await createOrUpdateRepoFile(
    `src/content/profiles/${filename}`,
    JSON.stringify(profile, null, 2) + '\n',
    `Update profile: ${login}`,
  );
  return { local: false };
}
