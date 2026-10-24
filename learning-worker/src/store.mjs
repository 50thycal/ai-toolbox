import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {resolve} from 'node:path';
export class Store {
  constructor(dir) {
    mkdirSync(dir,{recursive:true,mode:0o700});chmodSync(dir,0o700);
    this.db = new DatabaseSync(resolve(dir,'learning.sqlite'));
    this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);');
    for (const job of this.list()) if (['queued','running'].includes(job.status)) this.put({...job,status:'interrupted',error:'Worker restarted. The saved draft and reviews are retained. Start a new generation to try again.'});
  }
  get(id){const row=this.db.prepare('SELECT data FROM jobs WHERE id=?').get(id);return row?JSON.parse(row.data):null;}
  put(job){job.updatedAt=new Date().toISOString();this.db.prepare('INSERT INTO jobs VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(job.id,JSON.stringify(job));return job;}
  list(){return this.db.prepare('SELECT data FROM jobs ORDER BY rowid DESC').all().map(r=>JSON.parse(r.data));}
  setting(key,value){if(value!==undefined)this.db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,value);return this.db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value;}
  close(){this.db.close();}
}
