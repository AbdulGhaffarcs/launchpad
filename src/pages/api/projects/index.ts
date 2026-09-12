import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { createOrUpdateRepoFile, getRepo } from '../../../lib/github';
import { getSession } from '../../../lib/session';
import { parseGithubUrl, slugify, yamlArray, yamlString } from '../../../lib/utils';

const categories = new Set(['AI','Web','Mobile','Systems','Security','Data','Education','Developer Tools','Other']);
function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0,max) : ''; }
function list(value: unknown, maxItems = 12) { return clean(value,500).split(',').map(v=>v.trim()).filter(Boolean).slice(0,maxItems); }
function makeMarkdown(input: {title:string; studentName:string; ownerLogin:string; github:string; demo:string; linkedin:string; description:string; stack:string[]; lookingFor:string[]; category:string; privateRepo:boolean}) {
  return `---\n${[
    `title: ${yamlString(input.title)}`,
    `studentName: ${yamlString(input.studentName)}`,
    `ownerLogin: ${yamlString(input.ownerLogin)}`,
    `github: ${input.github ? yamlString(input.github) : 'null'}`,
    `demo: ${input.demo ? yamlString(input.demo) : 'null'}`,
    `linkedin: ${input.linkedin ? yamlString(input.linkedin) : 'null'}`,
    `description: ${yamlString(input.description)}`,
    `stack: ${yamlArray(input.stack)}`,
    `lookingFor: ${yamlArray(input.lookingFor)}`,
    `category: ${yamlString(input.category)}`,
    `date: ${yamlString(new Date().toISOString())}`,
    `featured: false`,
    `privateRepo: ${input.privateRepo}`,
  ].join('\n')}\n---\n\n${input.description}\n`;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSession(cookies);
  if (!session) return Response.json({error:'Sign in with GitHub first.'},{status:401});
  const body = await request.json().catch(()=>null) as Record<string,unknown>|null;
  if (!body) return Response.json({error:'Invalid request.'},{status:400});
  const title=clean(body.title,100), description=clean(body.description,1200), github=clean(body.github,500), demo=clean(body.demo,500), linkedin=clean(body.linkedin,500), category=clean(body.category,40), stack=list(body.stack), lookingFor=list(body.lookingFor);
  if (!title || !description) return Response.json({error:'Project name and description are required.'},{status:400});
  if (!categories.has(category || 'Other')) return Response.json({error:'Invalid category.'},{status:400});
  let privateRepo=false;
  if (github) {
    try {
      const {owner,repo}=parseGithubUrl(github);
      const remote=await getRepo(session.accessToken,owner,repo);
      if (remote.owner.login.toLowerCase()!==session.login.toLowerCase()) return Response.json({error:'Submit a repository you own.'},{status:403});
      privateRepo=remote.private;
    } catch {
      // A private repo on a user's personal account may not be visible to a GitHub App
      // that is only installed on IBA-Launchpad. We keep the URL but mark it unverified.
      privateRepo=true;
    }
  }
  const existing=await getCollection('projects');
  const base=slugify(title); const used=new Set(existing.map(p=>p.id)); let slug=base,n=2; while(used.has(slug)) slug=`${base}-${n++}`;
  const markdown=makeMarkdown({title,studentName:session.login,ownerLogin:session.login,github,demo,linkedin,description,stack,lookingFor,category:category||'Other',privateRepo});
  try {
    await createOrUpdateRepoFile(`src/content/projects/${slug}.md`,markdown,`Add project: ${title}`);
  } catch (error) { console.error(error); return Response.json({error:'Could not publish the project to Launchpad.'},{status:502}); }
  return Response.json({slug},{status:201});
};
