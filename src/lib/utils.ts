export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'project';
}

export function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export function parseGithubUrl(value: string) {
  const url = new URL(value);
  if (url.hostname !== 'github.com') throw new Error('GitHub URL must use github.com');
  const [owner, repo] = url.pathname.split('/').filter(Boolean);
  if (!owner || !repo) throw new Error('Invalid GitHub repository URL');
  return { owner, repo: repo.replace(/\.git$/, '') };
}

export function yamlString(value: string) {
  return JSON.stringify(value ?? '');
}

export function yamlArray(values: string[]) {
  return JSON.stringify(values ?? []);
}
