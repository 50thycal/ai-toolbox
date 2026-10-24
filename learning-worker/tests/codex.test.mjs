import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough,Writable} from 'node:stream';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Codex,config} from '../src/codex.mjs';
test('Codex protocol keeps credentials isolated and accepts only matching completed turns',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'codex-protocol-'));let child,seenOptions,seenArgs;
 const fakeSpawn=(_binary,args,options)=>{
   seenOptions=options;seenArgs=args;child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.pid=99999999;
   const emit=msg=>queueMicrotask(()=>child.stdout.write(JSON.stringify(msg)+'\n'));
   child.stdin=new Writable({write(chunk,_enc,callback){const m=JSON.parse(chunk.toString());if(m.id){
     const result=m.method==='initialize'?{}:m.method==='account/read'?{account:{type:'chatgpt',planType:'pro'}}:m.method==='thread/start'?{thread:{id:'right-thread'}}:{};
     emit({id:m.id,result});
     if(m.method==='turn/start'){
       emit({method:'item/completed',params:{threadId:'wrong-thread',item:{type:'agentMessage',text:'wrong'}}});
       emit({method:'turn/completed',params:{threadId:'wrong-thread',turn:{status:'completed'}}});
       emit({method:'item/completed',params:{threadId:'right-thread',item:{type:'agentMessage',text:'{"verified":true}'}}});
       emit({method:'turn/completed',params:{threadId:'right-thread',turn:{status:'completed'}}});
     }
   }callback();}});return child;
 };
 const client=new Codex(dir,{spawnProcess:fakeSpawn});
 try{assert.equal((await client.account()).connected,true);assert.equal(seenOptions.env.OPENAI_API_KEY,undefined);assert.equal(seenOptions.env.GITHUB_TOKEN,undefined);assert.equal(seenOptions.env.LEARNING_WORKER_TOKEN,undefined);assert.equal(config['features.shell_tool'],false);assert.equal(config.forced_login_method,'chatgpt');assert.ok(seenArgs.includes('forced_login_method="chatgpt"'));assert.deepEqual(await client.generate('fixture','test'),{verified:true});}
 finally{await client.stop();rmSync(dir,{recursive:true,force:true});}
});
