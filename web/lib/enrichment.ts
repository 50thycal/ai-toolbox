export type Discussion={title:string;url:string;date?:string;points?:number};
export type Enrichment={images:{src:string;alt:string}[];highlights:string[];stars?:number;forks?:number;openIssues?:number;license?:string;language?:string;topics?:string[];pushedAt?:string;archived?:boolean;homepage?:string;readmeUrl:string;hn:Discussion[];hnStatus:string;githubStatus:string;fetchedAt:string;stale?:boolean};
const headers={'User-Agent':'Calvin-AI-Toolbox','Accept':'application/vnd.github+json'};
const memo=new Map<string,{data:Enrichment;until:number}>();
function text(s:string){return s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'").replace(/\s+/g,' ').trim();}
function safeUrl(value:string,base?:string){try{const u=new URL(value,base);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
export function readmeMedia(html:string,slug:string,branch:string){const base=`https://raw.githubusercontent.com/${slug}/${encodeURIComponent(branch)}/`;
 const images=(html.match(/<img\b[^>]*>/gi)||[]).flatMap(tag=>{const src=tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];const alt=text(tag.match(/\balt=["']([^"']*)["']/i)?.[1]||'Repo image');const canonical=tag.match(/data-canonical-src=["']([^"']+)["']/)?.[1]||src||'';
 if(!src||/badge|shield|npm version|license:|made.by|visitor|coverage|workflow|avatar|status|discord/i.test(alt+' '+canonical))return [];
 const width=tag.match(/\bwidth=["'](\d+)["']/)?.[1];if(width&&Number(width)<90)return [];
 let value=src.replace(/&amp;/g,'&');const blob=value.match(/^https:\/\/github.com\/([^/]+\/[^/]+)\/blob\/(.+)$/);if(blob)value=`https://raw.githubusercontent.com/${blob[1]}/${blob[2]}`;
 const resolved=safeUrl(value,base);return resolved?[{src:resolved,alt}]:[];});
 const unique=images.filter((v,i,a)=>a.findIndex(x=>x.src===v.src)===i).slice(0,4);
 const paragraphs=(html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi)||[]).map(text).filter(p=>p.length>60&&!/^(npm |pnpm |yarn |pip |Copyright)/i.test(p)).slice(0,3).map(p=>p.slice(0,260)+(p.length>260?'…':''));
 return {images:unique,highlights:paragraphs};}
async function get(url:string,extra:Record<string,string>={}){const r=await fetch(url,{headers:{...headers,...extra},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error(String(r.status));return r;}
export async function enrich(slug:string):Promise<Enrichment>{const prev=memo.get(slug);if(prev&&prev.until>Date.now())return prev.data;
 const [meta,readme,hn]=await Promise.allSettled([
 get(`https://api.github.com/repos/${slug}`).then(r=>r.json()) as Promise<any>,
 get(`https://api.github.com/repos/${slug}/readme`,{'Accept':'application/vnd.github.html+json'}).then(r=>r.text()),
 get(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent('github.com/'+slug)}&restrictSearchableAttributes=url&tags=story&hitsPerPage=50`).then(r=>r.json()) as Promise<any>
 ]);
 if(meta.status==='rejected'&&readme.status==='rejected'&&prev)return {...prev.data,stale:true};
 const m=meta.status==='fulfilled'?meta.value:{};const media=readme.status==='fulfilled'?readmeMedia(readme.value,slug,m.default_branch||'main'):{images:[],highlights:[]};
 const stories=hn.status==='fulfilled'?(hn.value.hits||[]).filter((hit:any)=>{try{const u=new URL(hit.url);return u.hostname==='github.com'&&(u.pathname.toLowerCase()===('/'+slug).toLowerCase()||u.pathname.toLowerCase().startsWith(('/'+slug+'/').toLowerCase()))}catch{return false}}).map((hit:any)=>({title:hit.title||'Discussion',url:`https://news.ycombinator.com/item?id=${hit.objectID}`,date:hit.created_at,points:hit.points})):[];
 const data:Enrichment={...media,stars:m.stargazers_count,forks:m.forks_count,openIssues:m.open_issues_count,license:m.license?.spdx_id==='NOASSERTION'?undefined:m.license?.spdx_id,language:m.language,topics:m.topics||[],pushedAt:m.pushed_at,archived:m.archived,homepage:safeUrl(m.homepage||'')||undefined,readmeUrl:`https://github.com/${slug}#readme`,hn:stories,hnStatus:hn.status==='fulfilled'?'available':'unavailable',githubStatus:meta.status==='fulfilled'?'available':'unavailable',fetchedAt:new Date().toISOString()};
 if(memo.size>150)memo.delete(memo.keys().next().value!);memo.set(slug,{data,until:Date.now()+60*60*1000});return data;
}
