import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ url }) => {
  const installationId = url.searchParams.get('installation_id');
  const setupAction = url.searchParams.get('setup_action');
  const appId = import.meta.env.GITHUB_APP_ID ?? '';

  return new Response(`<!doctype html><html><head><title>Launchpad GitHub setup</title></head><body style="font-family:system-ui;max-width:720px;margin:60px auto;padding:20px"><h1>Launchpad GitHub setup</h1><p>Setup action: ${setupAction ?? 'unknown'}</p><p>Installation ID: <strong>${installationId ?? 'missing'}</strong></p><p>App ID: <strong>${appId || 'set GITHUB_APP_ID first'}</strong></p><p>Copy the installation ID into Vercel as <code>GITHUB_INSTALLATION_ID</code>.</p></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
