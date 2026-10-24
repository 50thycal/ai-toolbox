import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {transpileModule,ModuleKind,ScriptTarget} from 'typescript';
import {validRepo} from '../lib/lesson-contract.mjs';
const source=await readFile(new URL('../app/api/learning/[...path]/route.ts',import.meta.url),'utf8');
const route=await import('data:text/javascript;base64,'+Buffer.from(transpileModule(source,{compilerOptions:{module:ModuleKind.ESNext,target:ScriptTarget.ES2022}}).outputText).toString('base64'));
const origFetch=globalThis.fetch,oldUrl=process.env.LEARNING_WORKER_URL,oldToken=process.env.LEARNING_WORKER_TOKEN;
const ctx=path=>({params:Promise.resolve({path:path.split('/')})});
try{
 delete process.env.LEARNING_WORKER_URL;delete process.env.LEARNING_WORKER_TOKEN;
 assert.equal((await route.GET(new Request('https://feed.test/api/learning/status'),ctx('status'))).status,503);
 assert.equal((await route.GET(new Request('https://feed.test/api/learning/unknown'),ctx('unknown'))).status,404);
 process.env.LEARNING_WORKER_URL='https://worker.test';process.env.LEARNING_WORKER_TOKEN='test-token';
 assert.equal((await route.POST(new Request('https://feed.test/api/learning/connect',{method:'POST',headers:{Origin:'https://evil.test'}}),ctx('connect'))).status,403);
 let seen;
 globalThis.fetch=async(url,init)=>{seen={url:String(url),init};return Response.json({ok:true},{headers:{'Set-Cookie':'toolbox-learning=123.signature; HttpOnly; Secure; Path=/api/learning'}})};
 const response=await route.POST(new Request('https://feed.test/api/learning/connect',{method:'POST',headers:{Origin:'https://feed.test',Cookie:'unrelated=secret; toolbox-learning=123.signature'},body:'{}'}),ctx('connect'));
 assert.equal(response.status,200);assert.equal(seen.url,'https://worker.test/connect');assert.equal(seen.init.headers.Cookie,'toolbox-learning=123.signature');assert.equal(seen.init.headers.Authorization,'Bearer test-token');assert.match(response.headers.get('set-cookie'),/^toolbox-learning=/);assert.equal(response.headers.get('cache-control'),'no-store');
 process.env.LEARNING_WORKER_URL='http://unsafe.test';assert.equal((await route.GET(new Request('https://feed.test/api/learning/status'),ctx('status'))).status,503);
 assert.equal(validRepo('owner/repo'),true);assert.equal(validRepo('../repo'),false);assert.equal(validRepo('owner/repo?bad'),false);
 console.log('Passed: learning proxy setup state, path allowlist, CSRF, private cookies, server-only token and HTTPS configuration.');
}finally{globalThis.fetch=origFetch;if(oldUrl===undefined)delete process.env.LEARNING_WORKER_URL;else process.env.LEARNING_WORKER_URL=oldUrl;if(oldToken===undefined)delete process.env.LEARNING_WORKER_TOKEN;else process.env.LEARNING_WORKER_TOKEN=oldToken;}
