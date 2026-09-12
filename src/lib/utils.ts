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
  if (url.protocol !== 'https:' || url.hostname !== 'github.com') {
    throw new Error('GitHub URL must use https://github.com');
  }
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) throw new Error('Invalid GitHub repository URL');
  return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
}

export function yamlString(value: string) {
  return JSON.stringify(value ?? '');
}

export function yamlArray(values: string[]) {
  return JSON.stringify(values ?? []);
}
