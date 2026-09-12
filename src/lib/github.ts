import { SignJWT } from 'jose';
import { createPrivateKey } from 'node:crypto';

const API = 'https://api.github.com';
const VERSION = '2026-03-10';

function env(name: string): string {
  const value = import.meta.env[name] ?? process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, '\n');
}

export type GithubUser = {
  login: string;
  avatar_url: string;
  name: string | null;
  bio?: string | null;
  html_url: string;
  blog?: string | null;
};

export type GithubRepo = {
  id: number;
  full_name: string;
  name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  stargazers_count: number;
  language: string | null;
  topics?: string[];
  owner: { login: string };
};


async function githubFetch<T>(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': VERSION,
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body}`);
  }
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('GITHUB_CLIENT_ID'),
      client_secret: env('GITHUB_CLIENT_SECRET'),
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error_description ?? data.error ?? 'GitHub OAuth failed');
  return data as { access_token: string; expires_in?: number; refresh_token?: string; refresh_token_expires_in?: number };
}

export async function refreshUserToken(refreshToken: string) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('GITHUB_CLIENT_ID'),
      client_secret: env('GITHUB_CLIENT_SECRET'),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error_description ?? data.error ?? 'GitHub token refresh failed');
  return data as { access_token: string; expires_in: number; refresh_token?: string; refresh_token_expires_in?: number };
}

export async function getUser(accessToken: string) {
  return githubFetch<GithubUser>(`${API}/user`, { headers: { Authorization: `Bearer ${accessToken}` } });
}

export async function getRepo(accessToken: string | null, owner: string, repo: string) {
  return githubFetch<GithubRepo>(`${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cache: 'no-store',
  });
}

export async function isStarred(accessToken: string, owner: string, repo: string) {
  const response = await fetch(`${API}/user/starred/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': VERSION, Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 204) return true;
  if (response.status === 404) return false;
  throw new Error(`GitHub star check failed: ${response.status}`);
}

export async function setStar(accessToken: string, owner: string, repo: string, starred: boolean) {
  return githubFetch<null>(`${API}/user/starred/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
    method: starred ? 'PUT' : 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Length': '0' },
  });
}

export async function createInstallationToken() {
  const appId = env('GITHUB_APP_ID');
  const installationId = env('GITHUB_INSTALLATION_ID');
  const privateKey = normalizePrivateKey(env('GITHUB_PRIVATE_KEY'));
  const key = createPrivateKey({ key: privateKey, format: 'pem' });
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 9 * 60)
    .setIssuer(appId)
    .sign(key);

  const token = await githubFetch<{ token: string }>(`${API}/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
  });
  return token.token;
}

export async function getRepoContent(path: string) {
  const token = await createInstallationToken();
  const owner = env('GITHUB_ORG');
  const repo = env('GITHUB_REPO');
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  try {
    return await githubFetch<{ sha: string; content?: string; encoding?: string }>(`${API}/repos/${owner}/${repo}/contents/${encodedPath}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('GitHub API 404')) return null;
    throw error;
  }
}

export async function createOrUpdateRepoFile(path: string, content: string, message: string) {
  const token = await createInstallationToken();
  const owner = env('GITHUB_ORG');
  const repo = env('GITHUB_REPO');
  const current = await getRepoContent(path);
  const encoded = Buffer.from(content, 'utf8').toString('base64');
  const body: Record<string, string> = { message, content: encoded };
  if (current?.sha) body.sha = current.sha;

  return githubFetch(`${API}/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deleteRepoFile(path: string, message: string) {
  const token = await createInstallationToken();
  const owner = env('GITHUB_ORG');
  const repo = env('GITHUB_REPO');
  const current = await getRepoContent(path);
  if (!current?.sha) return null;
  return githubFetch(`${API}/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sha: current.sha }),
  });
}
