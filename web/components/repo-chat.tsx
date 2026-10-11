'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Check,Copy,MessageCircle,Sparkles,X} from 'lucide-react';
import type {Repo} from '@/lib/feed';
import {buildHandoffPrompt} from '@/lib/repo-handoff';
import type {RepoChatContext} from '@/lib/repo-chat';
const starters=[
 ['Explain it simply','Explain what this repo does in plain English, who it is for, and the problem it solves. Give one concrete example.'],
 ['What could I build?','Give me three practical things I could build with this repo. Distinguish documented features from ideas.'],
 ['How does it work?','Walk me through how this repo works, based on the README. Explain the key concepts without assuming I know the jargon.'],
 ['Getting started','What would I need to try this repo? Explain setup, dependencies, and a small first experiment. Note anything the sources do not establish.'],
 ['Tradeoffs & alternatives','What are the tradeoffs and limitations? What alternatives should I compare? Clearly label suggestions that are not verified in the repo sources.'],
 ['Fit for my project','Would this be useful for my project? Use any project background I provided and the toolbox review. If you need more information, ask me. Do not assume it has been tested.']
];
export default function RepoChat({repo,onClose}:{repo:Repo;onClose:()=>void}){
 const slug=new URL(repo.repository).pathname.slice(1).replace(/\/$/,'');
 const [context,setContext]=useState<RepoChatContext|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[question,setQuestion]=useState(starters[0][1]),[project,setProject]=useState(''),[copied,setCopied]=useState(false),[retry,setRetry]=useState(0),[selected,setSelected]=useState('Explain it simply');
 const dialog=useRef<HTMLElement>(null),input=useRef<HTMLTextAreaElement>(null),promptBox=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.querySelector<HTMLElement>('button')?.focus();function keys(e:KeyboardEvent){if(e.key==='Escape'){onClose();return}if(e.key==='Tab'){const nodes=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,textarea,summary')||[]).filter(n=>n.getClientRects().length>0);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}document.addEventListener('keydown',keys);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keys);previous?.focus()}},[onClose]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');fetch('/api/repo-chat?repo='+encodeURIComponent(slug),{signal:controller.signal}).then(async r=>{const d=await r.json() as {context?:RepoChatContext;error?:string};if(!r.ok||!d.context)throw Error(d.error||'Repo context unavailable');setContext(d.context)}).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[slug,retry]);
 const copyable=context?buildHandoffPrompt(context,question,project):'';
 async function copy(){try{await navigator.clipboard.writeText(copyable);setCopied(true);setError('')}catch{setError('Clipboard unavailable. Select the prompt below and copy it.');promptBox.current?.closest('details')?.setAttribute('open','');promptBox.current?.focus();promptBox.current?.select()}}
 return <div className="repo-chat-backdrop" onClick={onClose}><section className="repo-chat-panel" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="repo-chat-title" onClick={e=>e.stopPropagation()}>
  <header className="repo-chat-header"><div><span className="chat-eyebrow"><Sparkles size={13}/> TAKE THIS REPO INTO CHATGPT</span><h2 id="repo-chat-title">Chat about {repo.name}</h2><span className="chat-slug">{slug}</span></div><button className="icon-button" aria-label="Close repo guide" onClick={onClose}><X size={21}/></button></header>
  <div className="repo-chat-body">
   <div className="chat-intro"><span className="chat-avatar"><MessageCircle size={21}/></span><h3>A better starting question.</h3><p>Choose a question and we’ll include the README, source links, and any toolbox review. Continue the conversation in your own ChatGPT session.</p><div className="chat-grounding">{loading?'Loading repo knowledge…':context?<><span className="sync-dot"/> {context.readme?'README':'Repo sources'}{context.metadata?' + GitHub metadata':''}{context.review?' + toolbox review':''}<small>Fetched {new Date(context.fetchedAt).toLocaleString()}</small></>:'Repo knowledge unavailable'}</div></div>
   {!loading&&!context&&<button className="review-button" onClick={()=>setRetry(n=>n+1)}>Retry loading repo</button>}
   {context?.warnings.map(w=><p className="chat-source-warning" key={w}>{w}</p>)}
   <div className="chat-starters" aria-label="Suggested questions">{starters.map(([label,text])=><button key={label} aria-pressed={selected===label} onClick={()=>{setSelected(label);setQuestion(text);setCopied(false);input.current?.focus()}}><Sparkles size={12}/>{label}</button>)}</div>
   <details className="chat-project"><summary>Add project background <span>optional</span></summary><label>What are you building?<textarea maxLength={2000} placeholder="For example: a mobile app with a Next.js backend. I want a simpler way to test the main user flows." value={project} onChange={e=>{setProject(e.target.value);setCopied(false)}}/></label><p>Your background is included only in the prompt you choose to copy.</p></details>
   <label className="handoff-question">Your starting question<textarea ref={input} rows={4} maxLength={4000} value={question} onChange={e=>{setQuestion(e.target.value);setSelected('');setCopied(false)}}/></label>
   {context&&<details className="chat-sources"><summary>Included context <span>{context.sources.length} sources</span></summary><p>Public repo documentation and the saved review when available. This site hasn’t run the code or read every source file.</p>{context.sources.map(s=><a href={s.url} target="_blank" rel="noreferrer" key={s.url}>{s.label}<ArrowUpRight size={13}/></a>)}{context.readmeTruncated&&<p>The README is long; the prompt includes its first 32,000 characters.</p>}</details>}
   {error&&<p className="chat-error" role="alert">{error}</p>}
   {context&&<details className="chat-copy"><summary>View the copyable prompt</summary><textarea ref={promptBox} readOnly aria-label="Copyable repo prompt" value={copyable}/></details>}
  </div>
  <footer className="repo-chat-compose"><button className="primary full" disabled={!context||loading||!question.trim()} onClick={()=>void copy()}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'Prompt copied':'1. Copy repo prompt'}</button><a className="handoff-open" href="https://chatgpt.com/" target="_blank" rel="noreferrer">2. Open ChatGPT & paste <ArrowUpRight size={16}/></a>{copied&&<p className="handoff-copied" role="status">Paste the prompt into ChatGPT, then ask follow-up questions there.</p>}<p className="chat-privacy">Uses your existing ChatGPT session. No API key or API billing. The prompt stays here until you copy and paste it.</p></footer>
 </section></div>;
}
