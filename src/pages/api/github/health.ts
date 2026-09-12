import type { APIRoute } from 'astro';
import { GitHubApiError, createInstallationToken, getLaunchpadRepository } from '../../../lib/github';

export const GET: APIRoute = async () => {
  try {
    const token = await createInstallationToken();
    const repo = await getLaunchpadRepository(token);
    const permissions = repo.permissions ?? {};
    const writable = permissions.push === true || permissions.admin === true || permissions.maintain === true;

    return Response.json({
      ok: true,
      repository: repo.full_name,
      writable,
      permissions,
      message: writable ? 'GitHub App installation is healthy.' : 'GitHub App reached Launchpad but cannot write.',
    });
  } catch (error) {
    console.error('GitHub App health check failed:', error);
    const message = error instanceof GitHubApiError
      ? `GitHub returned ${error.status}.`
      : error instanceof Error
        ? error.message
        : 'Unknown GitHub App error.';
    return Response.json({ ok: false, message }, { status: 502 });
  }
};
