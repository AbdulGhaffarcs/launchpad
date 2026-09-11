import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/session';

export const onRequest = defineMiddleware(async (context, next) => {
  const session = await getSession(context.cookies);
  context.locals.session = session;
  return next();
});
