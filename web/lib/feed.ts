import {parse} from 'yaml';
export type Repo = {id:string;name:string;owner:string;repository:string;description:string;stage?:string;categories:string[];language?:string;stars?:number;growth?:string;reviewed_on?:string;use_when?:string[];limitations?:string[];suggested_pilot?:{project?:string;scope?:string};evidence?:{outcome?:string}[];catalogUrl?:string;rank?:number};
const headers={'User-Agent':'AI-Toolbox-Site','Accept':'application/vnd.github+json'};
async function get(url:string){const r=await fetch(url,{headers,signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`GitHub returned ${r.status}`);return r;}
export function decode(s:string){return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));}
function plain(s:string){return decode(s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());}
export function parseTrending(html:string):Repo[]{
 const articles=html.match(/<article\b[^>]*class="[^"]*Box-row[^"]*"[^>]*>[\s\S]*?<\/article>/g)||[];
 return articles.map((a,i)=>{const heading=a.match(/<h2\b[\s\S]*?<\/h2>/)?.[0]||''; const path=heading.match(/href="\/([\w.-]+\/[\w.-]+)"/)?.[1]; if(!path)return null;
 const [owner,name]=path.split('/'); const desc=plain(a.match(/<p\b[^>]*>[\s\S]*?<\/p>/)?.[0]||''); const language=plain(a.match(/<span[^>]*itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/)?.[1]||'');
 const star= a.match(/<a\b[^>]*href="[^"#]*\/stargazers"[^>]*>[\s\S]*?<\/a>/)?.[0]; const stars=Number((plain(star||'').match(/[\d,]+/)?.[0]||'0').replace(/,/g,'')); const growth=plain(a.match(/<span[^>]*class="[^"]*float-sm-right[^"]*"[^>]*>([\s\S]*?)<\/span>/)?.[1]||'');
 return {id:path,owner,name,repository:`https://github.com/${path}`,description:desc||'Explore this repository on GitHub.',categories:[],language,stars,growth,rank:i+1}; }).filter(Boolean) as Repo[];
}
export async function loadCatalog():Promise<Repo[]>{
 let list:any[];
 try{list=await (await get('https://api.github.com/repos/50thycal/ai-toolbox/contents/catalog')).json() as any[];}catch{
  const html=await (await get('https://github.com/50thycal/ai-toolbox/tree/main/catalog')).text();
  const paths=[...new Set(html.match(/50thycal\/ai-toolbox\/blob\/main\/catalog\/[\w.-]+\.ya?ml/g)||[])];
  if(!paths.length)throw Error('The public toolbox catalog could not be loaded. GitHub may be rate-limiting requests.');
  list=paths.map(path=>({type:'file',name:path.split('/').at(-1),download_url:'https://raw.githubusercontent.com/'+path.replace('/blob/','/'),html_url:'https://github.com/'+path}));
 }
 const entries=list.filter(f=>f.type==='file'&&/\.ya?ml$/.test(f.name));
 return Promise.all(entries.map(async f=>{const d=parse(await (await get(f.download_url)).text()); if(!d||!d.repository||!d.name)throw Error('Invalid catalog record');const u=new URL(d.repository);if(u.hostname!=='github.com')throw Error('Invalid repository URL');const [owner,...parts]=u.pathname.slice(1).split('/');return {...d,owner,name:d.name,id:d.id||parts.join('/'),categories:d.categories||[],catalogUrl:f.html_url};}));
}
export async function loadTrending(period:string,language:string){const u=new URL('https://github.com/trending'+(language?'/'+language:''));u.searchParams.set('since',period);const repos=parseTrending(await (await get(u.href)).text());if(!repos.length)throw Error('GitHub Trending could not be read. Its page may have changed.');return repos;}
