import {randomUUID} from 'node:crypto';
import {REVIEW_PASSES,validateEnvelope,validRepo} from '../../web/lib/lesson-contract.mjs';
import {snapshot} from './github.mjs';
import {visualQA} from './visual-qa.mjs';
const shape={lesson:{title:'Concise question',summary:'One short overview',objectives:['What the reader can explain afterward'],sections:[{id:'overview',title:'Overview',caption:'One short teaching caption',kind:'flow | timeline | compare | states',evidence:'code | documentation | illustrative',nodes:[{id:'a',label:'Short label',detail:'Tap-to-expand explanation',sourceIds:['s1']}],before:'Required only for compare',after:'Required only for compare',scenario:{label:'Optional what-if question',options:[{label:'Case A',path:['a'],result:'Explicit illustrative outcome'},{label:'Case B',path:['b'],result:'Different illustrative outcome'}]}}]},changes:['Specific correction made'],openIssues:[]};
export class Jobs {
  constructor(store,createModel,{loadSnapshot=snapshot,checkVisuals=visualQA}={}){this.store=store;this.createModel=createModel;this.loadSnapshot=loadSnapshot;this.checkVisuals=checkVisuals;this.busy=false;this.stopping=false;}
  enqueue(input){
    const {repo,question,model,prs=[],requestId}=input;
    if(!validRepo(repo)||typeof question!=='string'||!question.trim()||question.length>1200||typeof model!=='string'||!model||model.length>150||!Array.isArray(prs)||prs.length>6||prs.some(n=>!Number.isInteger(n)||n<1)||typeof requestId!=='string'||! /^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw Error('Choose a repository, question, model and up to six merged PRs.');
    const all=this.store.list(),prior=all.find(j=>j.requestId===requestId);
    if(prior){if(prior.repo!==repo||prior.question!==question||prior.model!==model||JSON.stringify(prior.prs)!==JSON.stringify(prs))throw Error('Request ID already belongs to a different lesson');return prior;}
    if(all.length>=100)throw Error('The saved-lesson limit is 100. Export your lessons before changing retention.');
    if(all.filter(j=>['queued','running'].includes(j.status)).length>=3)throw Error('Three lessons are already queued. Wait for a lesson to finish.');
    const job={id:randomUUID(),requestId,repo,question,model,prs,status:'queued',pass:0,createdAt:new Date().toISOString(),reviews:[]};
    this.store.put(job);queueMicrotask(()=>this.drain());return job;
  }
  async drain(){if(this.busy||this.stopping)return;this.busy=true;try{let job;while(!this.stopping&&(job=this.store.list().reverse().find(j=>j.status==='queued')))await this.run(job);}finally{this.busy=false;}}
  async run(job){
    try{
      job.status='running';this.store.put(job);
      const evidence=await this.loadSnapshot(job.repo,job.question,job.prs);
      const {materials,...publicSnapshot}=evidence;job.snapshot={...publicSnapshot,changes:publicSnapshot.prs,prs:job.prs};this.store.put(job);
      for(let pass=1;pass<=5;pass++){
        if(this.stopping)throw Error('Worker stopped; the saved draft is retained.');
        job.pass=pass;this.store.put(job);
        const prompt=JSON.stringify({task:pass===1?'Plan and create the complete first lesson':'Review and correct the entire lesson, returning the complete replacement',focus:REVIEW_PASSES[pass-1],question:job.question,requirements:[
          'Start with the high-level purpose; follow one concrete item through increasingly detailed chapters.',
          'Use 3–7 chapters and 2–6 nodes per visual. All labels <=70 characters, captions <=350, details <=600.',
          'Every code/documentation node cites supplied source IDs. Code claims need code or patch evidence. Source presence does not prove a claim.',
          'Use compare with before/after captions for PR changes. Distinguish author reports from inspected implementation.',
          'Include at least one optional scenario with two alternatives, existing node-ID paths, and different explicit results.',
          'Illustrative scenarios are teaching examples, not observed outcomes. Mark the whole chapter illustrative when appropriate.',
          'Do not claim browser testing, production validation, benchmark results or runtime facts from source alone.',
          'For phone layout: short labels, vertical sequence, details on tap. Renderer provides all animation and interaction.',
          'Correct all blocking issues before final pass. List unresolved factual uncertainty honestly. No HTML, executable code, tools or Markdown fences.',
          'Return only a JSON object with lesson, changes and openIssues. Omit optional scenario/before/after when unused. The example shape is structural; choose one valid kind/evidence enum, never the pipe-separated string.',
        ],shape,sourceSnapshot:evidence,previousLesson:job.lesson||null,previousReviews:job.reviews});
        const client=this.createModel();let result;
        try{result=validateEnvelope(await client.generate(prompt,job.model),evidence.sources);}finally{await client.stop();}
        if(!result.lesson.sections.some(s=>s.scenario))throw Error('The lesson is missing an interactive scenario.');
        job.lesson=result.lesson;this.store.put(job);
        const visual=await this.checkVisuals(job);
        job.reviews.push({pass,focus:REVIEW_PASSES[pass-1],changes:result.changes,openIssues:[...result.openIssues,...visual.issues],checks:['Schema, source IDs, label limits and scenario paths validated',...visual.checks],at:new Date().toISOString()});this.store.put(job);
      }
      if(job.reviews.at(-1).openIssues.length)throw Error('Final review has unresolved issues. Draft retained; not published as a completed lesson.');
      job.status='ready';this.store.put(job);
    }catch(e){job.status=this.stopping?'interrupted':'failed';job.error=e instanceof Error?e.message:'Generation failed';this.store.put(job);}
  }
}
