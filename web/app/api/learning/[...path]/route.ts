export const dynamic='force-dynamic';
export const maxDuration=60;
const allowed=/^(status|session|connect|disconnect|models|topics|lessons(?:\/[a-zA-Z0-9-]+(?:\/freshness)?)?)$/;
async function proxy(request:Request,context:{params:Promise<{path:string[]}>}){
  const path=(await context.params).path.join('/');if(!allowed.test(path))return Response.json({error:'Not found'},{status:404});
  const url=new URL(request.url);
  if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return Response.json({error:'Use this app to change your learning workspace.'},{status:403});
  const base=process.env.LEARNING_WORKER_URL,token=process.env.LEARNING_WORKER_TOKEN;
  if(!base||!token)return Response.json({error:'The ChatGPT learning worker is not connected yet. Your feed and collection are still available.',setupRequired:true},{status:503});
  let origin:URL;try{origin=new URL(base);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error();}catch{return Response.json({error:'Learning worker configuration needs attention.'},{status:503});}
  try{
    let body:string|undefined;if(request.method!=='GET'){body=await request.text();if(new TextEncoder().encode(body).length>16000)return Response.json({error:'Request is too large'},{status:413});}
    const cookie=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).filter(s=>/^toolbox-learning=[a-zA-Z0-9.]+$/.test(s)).join('; ');
    const response=await fetch(new URL('/'+path+url.search,origin),{method:request.method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Cookie:cookie},body,signal:AbortSignal.timeout(45000),redirect:'error',cache:'no-store'});
    const headers=new Headers({'Content-Type':'application/json','Cache-Control':'no-store'}),session=response.headers.get('set-cookie');if(session&&session.startsWith('toolbox-learning='))headers.set('Set-Cookie',session);
    return new Response(await response.text(),{status:response.status,headers});
  }catch{return Response.json({error:'The learning worker could not be reached. Saved lessons remain on the worker; try again shortly.'},{status:502});}
}
export const GET=proxy;export const POST=proxy;export const DELETE=proxy;
