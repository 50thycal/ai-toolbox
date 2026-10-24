import {validRepo} from '../../web/lib/lesson-contract.mjs';
const headers=()=>({'Accept':'application/vnd.github+json','User-Agent':'AI-Toolbox-Learning',...(process.env.GITHUB_TOKEN?{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`}:{})});
export async function github(path,fetcher=fetch){
  const r=await fetcher('https://api.github.com/repos/'+path,{headers:headers(),signal:AbortSignal.timeout(20000),redirect:'error'});
  if(!r.ok)throw Error(r.status===403||r.status===429?'GitHub is rate limited. Try again later.':r.status===404?'Repository or source is unavailable to this worker.':'GitHub source could not be loaded.');
  const body=await r.text();if(body.length>8_000_000)throw Error('GitHub response is too large');return JSON.parse(body);
}
export async function recentPRs(repo,fetcher=fetch){
  if(!validRepo(repo))throw Error('Invalid repository');
  return (await github(repo+'/pulls?state=closed&sort=updated&direction=desc&per_page=25',fetcher)).filter(p=>p.merged_at).slice(0,12);
}
export async function topics(repo,fetcher=fetch){
  if(!validRepo(repo))throw Error('Invalid repository');
  const base=[{id:'overview',repo,title:'Follow one thing through '+repo.split('/')[1],reason:'Build a mental model of the main code path, then explore its failure cases.',kind:'repo',prs:[]}];
  const prs=await recentPRs(repo,fetcher);
  for(const p of prs.slice(0,4))base.push({id:'pr-'+p.number,repo,title:p.title,reason:`PR #${p.number}: compare the prior behavior, change, and tradeoff.`,kind:'pr',prs:[p.number]});
  // Group by actual shared changed-file areas, not merge proximity or diff size.
  const files=await Promise.all(prs.slice(0,6).map(async p=>({p,files:await github(repo+`/pulls/${p.number}/files?per_page=100`,fetcher)})));
  const areas=new Map();
  for(const {p,files:changed} of files){const dirs=new Set(changed.filter(f=>!/(lock|\.md$|test|spec)/i.test(f.filename)).map(f=>f.filename.includes('/')?f.filename.split('/').slice(0,2).join('/'):f.filename));for(const area of dirs){const group=areas.get(area)||[];group.push(p);areas.set(area,group);}}
  const group=[...areas].filter(([,ps])=>ps.length>=2).sort((a,b)=>b[1].length-a[1].length)[0];
  if(group)base.splice(1,0,{id:'group-'+group[1].map(p=>p.number).join('-'),repo,title:`What changed in ${group[0]}?`,reason:'These merged PRs touch the same code area. Review the proposed grouping before generating.',kind:'group',prs:group[1].map(p=>p.number)});
  return base;
}
const forbidden=/(^|\/)(\.env[^/]*|\.git|node_modules|vendor|dist|build|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|.*\.(pem|key|p12|pfx|sqlite|db))($|\/)/i;
export async function snapshot(repo,question,prNumbers=[],fetcher=fetch){
  if(!validRepo(repo)||!Array.isArray(prNumbers)||prNumbers.length>6||prNumbers.some(n=>!Number.isInteger(n)||n<1))throw Error('Invalid source selection');
  const meta=await github(repo,fetcher),head=await github(repo+'/commits/'+encodeURIComponent(meta.default_branch),fetcher),sha=head.sha;
  if(!/^[a-f0-9]{40}$/.test(sha))throw Error('Could not pin repository commit');
  const tree=await github(repo+'/git/trees/'+sha+'?recursive=1',fetcher),warnings=[];
  if(tree.truncated)warnings.push('GitHub returned a partial file tree.');
  const terms=question.toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>3);
  const words=[...new Set(terms.flatMap(w=>[w,w.replace(/(ing|ed|s)$/,'')]))],sources=[],materials=[];
  let budget=110000;
  const add=(label,url,kind,content,max=10000)=>{if(budget<=0)return;const data=String(content||''),limited=data.slice(0,Math.min(max,budget)),id='s'+(sources.length+1);sources.push({id,label,url,kind,truncated:data.length>limited.length});materials.push({sourceId:id,text:limited});budget-=limited.length;};
  const candidates=(tree.tree||[]).filter(f=>f.type==='blob'&&f.size<=180000&&!forbidden.test(f.path)&&/\.(md|rst|js|mjs|cjs|ts|tsx|jsx|py|rs|go|json|toml|yaml|yml)$/.test(f.path)).map(f=>({...f,score:(/^readme\./i.test(f.path)?100:0)+words.filter(w=>f.path.toLowerCase().includes(w)).length*20+(/(^|\/)(server|main|index|app|runner|market|fill|order|config)\./.test(f.path)?12:0)-f.path.split('/').length})).sort((a,b)=>b.score-a.score);
  for(const f of candidates.slice(0,10)){
    try{const blob=await github(repo+'/git/blobs/'+f.sha,fetcher);if(blob.encoding!=='base64')continue;const body=Buffer.from(blob.content,'base64').toString('utf8');add(f.path,`https://github.com/${repo}/blob/${sha}/${f.path.split('/').map(encodeURIComponent).join('/')}`,/\.(md|rst)$/.test(f.path)?'documentation':'code',body,12000);}catch{warnings.push('Could not load '+f.path);}
  }
  const prs=[];
  for(const number of prNumbers){
    const p=await github(repo+'/pulls/'+number,fetcher);if(!p.merged_at||!p.merge_commit_sha)throw Error(`PR #${number} is not merged; choose a merged change.`);
    const files=await github(repo+`/pulls/${number}/files?per_page=100`,fetcher);
    prs.push({number,title:p.title,baseSha:p.base.sha,headSha:p.head.sha,mergeSha:p.merge_commit_sha,mergedAt:p.merged_at});
    add(`PR #${number} description (author report)`,`https://github.com/${repo}/pull/${number}`,'documentation',p.title+'\n'+(p.body||''),5000);
    for(const f of files.filter(f=>!forbidden.test(f.filename)&&f.patch).slice(0,8))add(`PR #${number}: ${f.filename}`,`https://github.com/${repo}/commit/${p.merge_commit_sha}`,'patch',f.filename+'\n'+f.patch,5000);
    if(p.changed_files>100||files.some(f=>!f.patch))warnings.push(`PR #${number}: patch coverage is incomplete; compare only the included evidence.`);
  }
  if(sources.some(s=>s.truncated))warnings.push('Some source excerpts are truncated. Missing code and production behavior are not verified.');
  if(!sources.length)throw Error('No usable repository evidence was found');
  return {repo,sha,fetchedAt:new Date().toISOString(),sources,materials,warnings,prs,scope:'Selected source excerpts; not a full-repository or production audit'};
}
