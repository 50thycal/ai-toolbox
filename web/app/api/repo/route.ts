import {enrich} from '@/lib/enrichment';
export async function GET(request:Request){const slug=new URL(request.url).searchParams.get('repo')||'';if(!/^[\w.-]+\/[\w.-]+$/.test(slug)||slug.length>200)return Response.json({error:'Invalid repository'}, {status:400});return Response.json(await enrich(slug));}
