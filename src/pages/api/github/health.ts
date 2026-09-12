import type { APIRoute } from 'astro';
import { createInstallationToken, getLaunchpadRepository } from '../../../lib/github';

export const GET: APIRoute = async () => {
  try {
    const token = await createInstallationToken();
    const repo = await getLaunchpadRepository(token);
    return Response.json({
      ok: true,
      repository: repo.full_name,
      writable: repo.permissions?.push === true || repo.permissions?.admin === true || repo.permissions?.maintain === true,
      message: 'GitHub App installation is working.'
    });
  } catch (error) {
    console.error('GitHub installation health check failed:', error);
    return Response.json({
      ok: false,
      message: 'GitHub App installation credentials or repository permissions are not working.'
    }, { status: 502 });
  }
};
