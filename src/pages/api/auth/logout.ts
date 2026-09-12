import type { APIRoute } from 'astro';
import { clearSession } from '../../../lib/session';

export const GET: APIRoute = ({ cookies, redirect }) => { clearSession(cookies); return redirect('/', 302); };
export const POST: APIRoute = ({ cookies, redirect }) => { clearSession(cookies); return redirect('/', 303); };
