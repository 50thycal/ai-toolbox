import {loadCatalog,loadTrending} from '@/lib/feed';
const cache=new Map<string,{repos:any[];updatedAt:string;expires:number}>();
export async function GET(req:Request){const u=new URL(req.url);const source=u.searchParams.get('source')==='trending'?'trending':'catalog';const period=['daily','weekly','monthly'].includes(u.searchParams.get('period')||'')?u.searchParams.get('period')!:'daily';const language=['','typescript','javascript','python','rust','go','swift'].includes(u.searchParams.get('language')||'')?u.searchParams.get('language')||'':'';const key=`${source}:${period}:${language}`;const old=cache.get(key);
 if(old&&old.expires>Date.now())return Response.json({...old,stale:false});
 try{const repos=source==='catalog'?await loadCatalog():await loadTrending(period,language);const data={repos,updatedAt:new Date().toISOString(),expires:Date.now()+15*60*1000};cache.set(key,data);return Response.json({...data,stale:false});}
 catch(e){const error=e instanceof Error?e.message:'Feed unavailable';if(old)return Response.json({...old,stale:true,error});return Response.json({repos:[],error}, {status:502});}
}
