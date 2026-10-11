import {loadCatalog, type Repo} from './feed';

export type RepoChatContext = {slug:string;readme:string;readmeTruncated:boolean;metadata:Record<string,unknown>|null;review:Repo|null;sources:{label:string;url:string}[];warnings:string[];fetchedAt:string};
export const validSlug=(value:unknown):value is string=>typeof value==='string'&&value.length<=200&&/^[\w.-]+\/[\w.-]+$/.test(value)&&!value.split('/').some(p=>p==='.'||p==='..');
const cache=new Map<string,{time:number;data:RepoChatContext}>();
type GithubSource={full_name?:string;description?:string;language?:string;license?:{spdx_id?:string};stargazers_count?:number;forks_count?:number;open_issues_count?:number;archived?:boolean;topics?:string[];default_branch?:string;pushed_at?:string;encoding?:string;content?:string};
async function github(path:string):Promise<GithubSource>{const response=await fetch('https://api.github.com/repos/'+path,{headers:{Accept:'application/vnd.github+json','User-Agent':'AI-Toolbox-Repo-Chat'},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('GitHub source unavailable');return await response.json() as GithubSource;}
export async function getRepoChatContext(slug:string):Promise<RepoChatContext>{
 if(!validSlug(slug))throw Error('Invalid repository');
 const key=slug.toLowerCase(),prior=cache.get(key);if(prior&&Date.now()-prior.time<1800000)return prior.data;
 const [meta,readme,catalog]=await Promise.allSettled([github(slug),github(slug+'/readme'),loadCatalog()]);
 const warnings:string[]=[],sources:{label:string;url:string}[]=[];
 let metadata:Record<string,unknown>|null=null,markdown='',readmeTruncated=false;
 if(meta.status==='fulfilled'){const m=meta.value;metadata={name:m.full_name,description:m.description,language:m.language,license:m.license?.spdx_id,stars:m.stargazers_count,forks:m.forks_count,openIssues:m.open_issues_count,archived:m.archived,topics:m.topics,defaultBranch:m.default_branch,pushedAt:m.pushed_at};sources.push({label:'GitHub repository',url:'https://github.com/'+slug})}else warnings.push('GitHub metadata could not be loaded.');
 if(readme.status==='fulfilled'&&readme.value.encoding==='base64'&&typeof readme.value.content==='string'){
  const encoded=readme.value.content.replace(/\s/g,'');if(encoded.length<=1500000){const binary=atob(encoded);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));const full=new TextDecoder().decode(bytes);markdown=full.slice(0,32000);readmeTruncated=full.length>markdown.length;sources.push({label:readmeTruncated?'README (first 32,000 characters)':'README',url:'https://github.com/'+slug+'#readme'})}
 }
 if(!markdown){
  for(const file of ['README.md','readme.md','README.rst','README']){
   try{const url='https://raw.githubusercontent.com/'+slug+'/HEAD/'+file;const response=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!response.ok)continue;const full=await response.text();markdown=full.slice(0,32000);readmeTruncated=full.length>markdown.length;sources.push({label:readmeTruncated?'README (first 32,000 characters)':'README',url});break}catch{}
  }
 }
 if(!markdown)warnings.push('README could not be loaded. Answers will have less context.');
 if(catalog.status==='rejected')warnings.push('Toolbox review could not be checked.');
 const review=catalog.status==='fulfilled'?catalog.value.find(r=>r.repository.replace(/\/$/,'').toLowerCase()==='https://github.com/'+key)||null:null;
 if(review?.catalogUrl)sources.push({label:'Toolbox review',url:review.catalogUrl});
 if(!metadata&&!markdown)throw Error('Could not load this repository from GitHub. Try again shortly.');
 const data={slug,readme:markdown,readmeTruncated,metadata,review,sources,warnings,fetchedAt:new Date().toISOString()};
 if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(key,{time:Date.now(),data});return data;
}
