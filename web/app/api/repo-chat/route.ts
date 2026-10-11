import {getRepoChatContext,validSlug} from '@/lib/repo-chat';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const slug=new URL(request.url).searchParams.get('repo');
 if(!validSlug(slug))return Response.json({error:'Invalid repository'},{status:400});
 try{return Response.json({context:await getRepoChatContext(slug)},{headers:{'Cache-Control':'no-store'}})}
 catch{return Response.json({error:'Could not load repository context. Try again shortly.'},{status:502})}
}
