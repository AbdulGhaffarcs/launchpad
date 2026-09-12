import type { APIRoute } from 'astro';
import { getUser, getRepoContent, createOrUpdateRepoFile } from '../../lib/github';
import { getSession } from '../../lib/session';

function validUrl(value: string){ if(!value)return ''; try{const u=new URL(value); if(!['http:','https:'].includes(u.protocol))return ''; return u.toString();}catch{return '';}}
async function loadProfile(login:string){
  const file=await getRepoContent(`src/content/profiles/${login.toLowerCase()}.json`);
  if(!file?.content)return {};
  try{return JSON.parse(Buffer.from(file.content,'base64').toString('utf8')) as Record<string,unknown>;}catch{return {};}
}

export const GET:APIRoute=async({cookies})=>{
  const session=await getSession(cookies);if(!session)return Response.json({error:'Sign in with GitHub first.'},{status:401});
  const github=await getUser(session.accessToken);
  let profile: Record<string, unknown> = {};
  try { profile = await loadProfile(session.login); } catch (error) { console.error('Could not load profile:', error); }
  return Response.json({github,profile});
};

export const PUT:APIRoute=async({request,cookies})=>{
  const session=await getSession(cookies);if(!session)return Response.json({error:'Sign in with GitHub first.'},{status:401});
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;if(!body)return Response.json({error:'Invalid request.'},{status:400});
  const displayName=typeof body.displayName==='string'?body.displayName.trim().slice(0,80):'';
  const bio=typeof body.bio==='string'?body.bio.trim().slice(0,280):'';
  const website=typeof body.website==='string'?validUrl(body.website.trim()):'';
  const linkedin=typeof body.linkedin==='string'?validUrl(body.linkedin.trim()):'';
  const payload={displayName:displayName||session.login,bio,website,linkedin};
  try{await createOrUpdateRepoFile(`src/content/profiles/${session.login.toLowerCase()}.json`,JSON.stringify(payload,null,2)+'\n',`Update profile: ${session.login}`);return Response.json({ok:true,profile:payload});}
  catch(error){console.error(error);return Response.json({error:'Could not save your profile.'},{status:502});}
};
