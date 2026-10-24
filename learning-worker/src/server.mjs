import {createServer} from 'node:http';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {Store} from './store.mjs';
import {Codex} from './codex.mjs';
import {Jobs} from './jobs.mjs';
import {github,topics} from './github.mjs';
import {validRepo} from '../../web/lib/lesson-contract.mjs';
const equal=(a,b)=>{const x=createHash('sha256').update(String(a||'')).digest(),y=createHash('sha256').update(String(b||'')).digest();return timingSafeEqual(x,y);};
const safeJob=j=>j; // materials (source excerpts) are deliberately never stored in jobs.
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>16000)throw Error('Request is too large');}return JSON.parse(text||'{}');}
export function createApp({store,codex,jobs,proxyToken,ownerKey,githubClient=github,topicLoader=topics}){
  if(!proxyToken||proxyToken.length<32||!ownerKey||ownerKey.length<32)throw Error('Set strong LEARNING_WORKER_TOKEN and OWNER_SETUP_TOKEN before starting');
  const signing=store.setting('session-key')||randomBytes(32).toString('hex');store.setting('session-key',signing);
  const session=expires=>expires+'.'+createHmac('sha256',signing).update(expires).digest('hex');
  const authorized=req=>{const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('toolbox-learning='))?.slice(17);if(!raw)return false;const expiry=raw.split('.')[0];return /^\d{13}$/.test(expiry)&&Number(expiry)>Date.now()&&equal(raw,session(expiry));};
  let failures=0,reset=Date.now();
  return createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
    try{
      const u=new URL(req.url,'http://worker'),path=u.pathname;
      if(path==='/health'&&req.method==='GET')return send({ok:true,version:'1.0.0'});
      if(!equal(req.headers.authorization,'Bearer '+proxyToken))return send({error:'Unauthorized'},401);
      if(path==='/session'&&req.method==='POST'){
        if(Date.now()-reset>15*60000){reset=Date.now();failures=0;}if(failures>=10)return send({error:'Too many unlock attempts. Wait 15 minutes.'},429);
        const data=await body(req);if(!equal(data.key,ownerKey)){failures++;return send({error:'Owner key was not accepted'},401);}failures=0;
        res.setHeader('Set-Cookie',`toolbox-learning=${session(String(Date.now()+30*86400000))}; HttpOnly; Secure; SameSite=Strict; Path=/api/learning; Max-Age=2592000`);return send({authorized:true});
      }
      if(!authorized(req))return send({error:'Unlock your learning workspace first.',authorized:false},401);
      if(path==='/session'&&req.method==='DELETE'){res.setHeader('Set-Cookie','toolbox-learning=; HttpOnly; Secure; SameSite=Strict; Path=/api/learning; Max-Age=0');return send({ok:true});}
      if(path==='/status'&&req.method==='GET')return send({authorized:true,...await codex.account()});
      if(path==='/connect'&&req.method==='POST'){const login=await codex.connect();return send({verificationUrl:login.verificationUrl,userCode:login.userCode});}
      if(path==='/disconnect'&&req.method==='POST'){if(jobs.busy)return send({error:'Wait for queued lessons to finish first'},409);await codex.disconnect();return send({ok:true});}
      if(path==='/models'&&req.method==='GET')return send({models:await codex.models()});
      if(path==='/topics'&&req.method==='GET')return send({topics:await topicLoader(u.searchParams.get('repo'))});
      if(path==='/lessons'&&req.method==='GET')return send({lessons:store.list().map(safeJob)});
      if(path==='/lessons'&&req.method==='POST'){
        const input=await body(req);if(!(await codex.account()).connected)return send({error:'Connect your ChatGPT subscription before generating.'},409);
        const models=await codex.models();if(!models.some(m=>m.id===input.model))return send({error:'Choose a model from your ChatGPT connection.'},400);
        return send({job:safeJob(jobs.enqueue(input))},202);
      }
      const match=path.match(/^\/lessons\/([a-zA-Z0-9-]+)(\/freshness)?$/);
      if(match){const job=store.get(match[1]);if(!job)return send({error:'Lesson not found'},404);
        if(!match[2]&&req.method==='GET')return send({job:safeJob(job)});
        if(match[2]&&req.method==='POST'){
          if(!validRepo(job.repo)||!job.snapshot)return send({error:'No source snapshot yet'},409);
          const meta=await githubClient(job.repo),head=await githubClient(job.repo+'/commits/'+encodeURIComponent(meta.default_branch));
          return send({currentSha:head.sha,lessonSha:job.snapshot.sha,changed:head.sha!==job.snapshot.sha,checkedAt:new Date().toISOString(),note:'Repository head comparison; changed head does not prove this lesson is obsolete.'});
        }
      }
      send({error:'Not found'},404);
    }catch(e){send({error:e instanceof Error?e.message:'Request failed'},400);}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const dir=process.env.DATA_DIR||'data',store=new Store(dir),codex=new Codex(dir),jobs=new Jobs(store,()=>new Codex(dir));
  const app=createApp({store,codex,jobs,proxyToken:process.env.LEARNING_WORKER_TOKEN,ownerKey:process.env.OWNER_SETUP_TOKEN});
  app.listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('AI Toolbox learning worker ready; subscription connection required.'));
  const shutdown=async()=>{jobs.stopping=true;app.close();await codex.stop();const wait=setInterval(()=>{if(!jobs.busy){clearInterval(wait);store.close();process.exit(0);}},100);setTimeout(()=>process.exit(1),5000).unref();};
  process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
}
