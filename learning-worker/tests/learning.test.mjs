import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/store.mjs';
import {Jobs} from '../src/jobs.mjs';
import {createApp} from '../src/server.mjs';
import {topics,snapshot as loadSnapshot} from '../src/github.mjs';
import {validateEnvelope,validateLesson} from '../../web/lib/lesson-contract.mjs';
import {buildLessonHtml} from '../../web/lib/lesson-export.mjs';
import {sources,lesson,envelope,snapshot} from './fixtures.mjs';
const temp=()=>mkdtempSync(join(tmpdir(),'toolbox-test-'));
test('contract rejects unsupported claims, invalid scenarios and code without code evidence',()=>{
 assert.equal(validateLesson(lesson,sources),lesson);let v=envelope();v.lesson.sections[0].nodes[0].sourceIds=['fake'];assert.throws(()=>validateEnvelope(v,sources),/source reference/);
 v=envelope();v.lesson.sections[2].scenario.options[0].path=['missing'];assert.throws(()=>validateEnvelope(v,sources),/existing visual/);
 assert.throws(()=>validateLesson(lesson,[{...sources[0],kind:'documentation'}]),/Code claims/);
 v=envelope();v.lesson.sections[0].nodes[0].label='x'.repeat(71);assert.throws(()=>validateEnvelope(v,sources));
});
test('five successful passes persist a ready lesson; idempotency and restart do not rerun inference',async()=>{
 const dir=temp(),store=new Store(dir);let calls=0,stops=0;
 const jobs=new Jobs(store,()=>({generate:async prompt=>{calls++;assert.match(prompt,/untrusted|sourceSnapshot/);return envelope();},stop:async()=>stops++}),{loadSnapshot:async()=>snapshot(),checkVisuals:async()=>({checks:['Mock browser check'],issues:[]})});
 try{const input={repo:'example/repo',question:'Explain one order',model:'test-model',prs:[],requestId:'request-1234567890'};const job=jobs.enqueue(input);assert.equal(jobs.enqueue(input).id,job.id);assert.throws(()=>jobs.enqueue({...input,question:'Different'}),/different lesson/);await jobs.drain();
 const ready=store.get(job.id);assert.equal(ready.status,'ready');assert.equal(calls,5);assert.equal(stops,5);assert.equal(ready.reviews.length,5);assert.equal(ready.snapshot.materials,undefined);
 store.put({...ready,id:'interrupted-test',status:'running'});store.close();const reopened=new Store(dir);assert.equal(reopened.get('interrupted-test').status,'interrupted');assert.equal(reopened.get(job.id).status,'ready');assert.equal(calls,5);reopened.close();
 }finally{try{store.close()}catch{}rmSync(dir,{recursive:true,force:true});}
});
test('a failed review retains its valid draft without publishing or automatic retry',async()=>{
 const dir=temp(),store=new Store(dir);let calls=0;const jobs=new Jobs(store,()=>({generate:async()=>{if(++calls===3)throw Error('Usage limit reached');return envelope();},stop:async()=>{}}),{loadSnapshot:async()=>snapshot(),checkVisuals:async()=>({checks:['Mock browser check'],issues:[]})});
 try{const j=jobs.enqueue({repo:'example/repo',question:'Explain',model:'test',prs:[],requestId:'request-abcdefghij'});await jobs.drain();const failed=store.get(j.id);assert.equal(failed.status,'failed');assert.equal(failed.reviews.length,2);assert.ok(failed.lesson);assert.equal(calls,3);await jobs.drain();assert.equal(calls,3);}finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('HTTP: owner session + proxy authentication guard subscription and private lesson endpoints',async()=>{
 const dir=temp(),store=new Store(dir);let modelCalls=0;const codex={account:async()=>({connected:true}),models:async()=>[{id:'test'}],connect:async()=>{modelCalls++;return {verificationUrl:'https://auth.openai.com/codex/device',userCode:'TEST-CODE'};}};
 const app=createApp({store,codex,jobs:{busy:false},proxyToken:'p'.repeat(40),ownerKey:'o'.repeat(40)});await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.address().port,auth={Authorization:'Bearer '+'p'.repeat(40)};
 try{
 assert.equal((await fetch(base+'/health')).status,200);assert.equal((await fetch(base+'/lessons')).status,401);assert.equal((await fetch(base+'/connect',{method:'POST',headers:auth})).status,401);assert.equal(modelCalls,0);
 assert.equal((await fetch(base+'/session',{method:'POST',headers:auth,body:JSON.stringify({key:'wrong'})})).status,401);
 const unlock=await fetch(base+'/session',{method:'POST',headers:auth,body:JSON.stringify({key:'o'.repeat(40)})});assert.equal(unlock.status,200);const raw=unlock.headers.get('set-cookie');assert.match(raw,/HttpOnly; Secure; SameSite=Strict/);const headers={...auth,Cookie:raw.split(';')[0]};
 assert.equal((await fetch(base+'/status',{headers})).status,200);assert.equal((await fetch(base+'/lessons',{headers})).status,200);assert.equal((await fetch(base+'/connect',{method:'POST',headers})).status,200);assert.equal(modelCalls,1);
 assert.equal((await fetch(base+'/status',{headers:{...auth,Cookie:'toolbox-learning=9999999999999.invalid'}})).status,401);
 }finally{await new Promise(resolve=>app.close(resolve));store.close();rmSync(dir,{recursive:true,force:true});}
});
test('offline HTML is self contained, interactive and escapes source/model content',()=>{
 const job={status:'ready',repo:'example/repo',lesson:structuredClone(lesson),snapshot:snapshot(),reviews:[]};job.lesson.title='</script><img src=x onerror=alert(1)>';
 const html=buildLessonHtml(job);assert.ok(!html.includes('<img src=x'));assert.match(html,/\\u003c\/script>/);assert.match(html,/data-scenario/);assert.match(html,/aria-live/);assert.ok(!html.includes('fetch('));assert.throws(()=>buildLessonHtml({...job,status:'failed'}),/completed/);
});
test('topic groups use actual common changed files and snapshots pin source URLs',async()=>{
 const sha='a'.repeat(40);const fetcher=async url=>{const p=new URL(url).pathname;
 if(p.endsWith('/pulls'))return Response.json([1,2].map(number=>({number,title:'Improve orders '+number,merged_at:'2026-01-01'})));
 if(p.includes('/files'))return Response.json([{filename:'src/orders.js',patch:'@@\n+change'}]);
 if(p.endsWith('/example/repo'))return Response.json({default_branch:'main'});
 if(p.includes('/commits/'))return Response.json({sha});
 if(p.includes('/git/trees/'))return Response.json({tree:[{path:'src/orders.js',type:'blob',size:20,sha:'b'.repeat(40)}]});
 if(p.includes('/git/blobs/'))return Response.json({encoding:'base64',content:Buffer.from('source example').toString('base64')});
 throw Error('Unexpected URL '+url);
 };
 const ts=await topics('example/repo',fetcher);assert.deepEqual(ts.find(t=>t.kind==='group').prs,[1,2]);const ss=await loadSnapshot('example/repo','orders',[],fetcher);assert.ok(ss.sources[0].url.includes('/blob/'+sha+'/'));assert.equal(ss.materials[0].text,'source example');
});
