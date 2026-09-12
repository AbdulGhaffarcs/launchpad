import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { createOrUpdateRepoFile, deleteRepoFile } from '../../../lib/github';
import { getSession } from '../../../lib/session';
import { parseGithubUrl, yamlArray, yamlString } from '../../../lib/utils';

const categories=new Set(['AI','Web','Mobile','Systems','Security','Data','Education','Developer Tools','Other']);
function clean(v:unknown,max:number){return typeof v==='string'?v.trim().slice(0,max):'';}
function list(v:unknown){return clean(v,500).split(',').map(x=>x.trim()).filter(Boolean).slice(0,12);}
function owned(project:any,session:any){return project && (project.data.ownerLogin?.toLowerCase()===session.login.toLowerCase() || project.data.studentName.toLowerCase()===session.login.toLowerCase());}

export const PUT:APIRoute=async({request,cookies,params})=>{
  const session=await getSession(cookies); if(!session)return Response.json({error:'Sign in with GitHub first.'},{status:401});
  const slug=params.slug; const project=(await getCollection('projects')).find(p=>p.id===slug);
  if(!project)return Response.json({error:'Project not found.'},{status:404});
  if(!owned(project,session))return Response.json({error:'You can only edit your own project.'},{status:403});
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null; if(!body)return Response.json({error:'Invalid request.'},{status:400});
  const title=clean(body.title,100),description=clean(body.description,1200),github=clean(body.github,500),demo=clean(body.demo,500),linkedin=clean(body.linkedin,500),category=clean(body.category,40)||'Other',stack=list(body.stack),lookingFor=list(body.lookingFor);
  if(!title||!description||!categories.has(category))return Response.json({error:'Invalid project data.'},{status:400});
  let privateRepo=project.data.privateRepo;
  if(github){try{const {owner,repo}=parseGithubUrl(github); const {getRepo}=await import('../../../lib/github'); const remote=await getRepo(session.accessToken,owner,repo); if(remote.owner.login.toLowerCase()!==session.login.toLowerCase())return Response.json({error:'Submit a repository you own.'},{status:403}); privateRepo=remote.private;}catch{privateRepo=true;}}
  const content=`---\n${[
    `title: ${yamlString(title)}`,
    `studentName: ${yamlString(project.data.studentName)}`,
    `ownerLogin: ${yamlString(project.data.ownerLogin ?? session.login)}`,
    `github: ${github?yamlString(github):'null'}`,
    `demo: ${demo?yamlString(demo):'null'}`,
    `linkedin: ${linkedin?yamlString(linkedin):'null'}`,
    `description: ${yamlString(description)}`,
    `stack: ${yamlArray(stack)}`,
    `lookingFor: ${yamlArray(lookingFor)}`,
    `category: ${yamlString(category)}`,
    `date: ${yamlString(project.data.date.toISOString())}`,
    `featured: ${project.data.featured}`,
    `privateRepo: ${privateRepo}`,
  ].join('\n')}\n---\n\n${description}\n`;
  try{await createOrUpdateRepoFile(`src/content/projects/${slug}.md`,content,`Update project: ${title}`);return Response.json({ok:true});}catch(error){console.error(error);return Response.json({error:'Could not update the project.'},{status:502});}
};

export const DELETE:APIRoute=async({cookies,params})=>{
  const session=await getSession(cookies);if(!session)return Response.json({error:'Sign in with GitHub first.'},{status:401});
  const slug=params.slug;const project=(await getCollection('projects')).find(p=>p.id===slug);if(!project)return Response.json({error:'Project not found.'},{status:404});
  if(!owned(project,session))return Response.json({error:'You can only delete your own project.'},{status:403});
  try{await deleteRepoFile(`src/content/projects/${slug}.md`,`Delete project: ${project.data.title}`);return Response.json({ok:true});}catch(error){console.error(error);return Response.json({error:'Could not delete the project.'},{status:502});}
};
