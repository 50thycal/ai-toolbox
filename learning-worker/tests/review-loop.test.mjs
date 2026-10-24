import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Jobs} from '../src/jobs.mjs';
import {Store} from '../src/store.mjs';
import {envelope,snapshot} from './fixtures.mjs';
test('browser findings feed the next correction cycle and unresolved final findings block ready',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'review-loop-')),store=new Store(dir);let calls=0,checks=0;
 const jobs=new Jobs(store,()=>({generate:async prompt=>{const data=JSON.parse(prompt);if(++calls===2)assert.match(JSON.stringify(data.previousReviews),/overflows horizontally/);return envelope();},stop:async()=>{}}),{loadSnapshot:async()=>snapshot(),checkVisuals:async()=>({checks:['Fixture browser check'],issues:++checks===1||checks===5?['Draft overflows horizontally at 320px.']:[]})});
 try{const j=jobs.enqueue({repo:'example/repo',question:'Explain orders',model:'test',prs:[],requestId:'browser-loop-123456'});await jobs.drain();const final=store.get(j.id);assert.equal(calls,5);assert.equal(checks,5);assert.equal(final.status,'failed');assert.equal(final.reviews.length,5);assert.match(final.error,/unresolved/);assert.ok(final.lesson);}finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
