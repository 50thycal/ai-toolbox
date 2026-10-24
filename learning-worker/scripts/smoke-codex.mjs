import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Codex} from '../src/codex.mjs';
const dir=mkdtempSync(join(tmpdir(),'toolbox-codex-smoke-')),client=new Codex(dir);
try{const account=await client.account();if(account.connected)throw Error('Fresh isolated home unexpectedly contains an account');console.log('Official Codex handshake and isolated unauthenticated account/read passed. No sign-in or inference performed.');}finally{await client.stop();rmSync(dir,{recursive:true,force:true});}
