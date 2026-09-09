import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const db = new DatabaseSync(process.env.FORGEPLM_DB || join(root, 'server', 'forgeplm.db'));
db.exec('PRAGMA foreign_keys = ON');
for (const file of readdirSync(join(root, 'server', 'migrations')).sort()) db.exec(readFileSync(join(root, 'server', 'migrations', file), 'utf8'));

const hash = value => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
function seed() {
  if (db.prepare('SELECT COUNT(*) count FROM users').get().count) return;
  db.prepare('INSERT INTO users (email,display_name,password_hash) VALUES (?,?,?)').run('admin@forgeplm.local', 'Alex Morgan', hash('forgeplm-demo'));
  db.prepare('INSERT INTO groups (name,description) VALUES (?,?)').run('Engineering', 'Product engineering team');
  for (const [name, released, order] of [['In Work',0,1],['In Review',0,2],['Released',1,3],['Obsolete',0,4]]) db.prepare('INSERT INTO lifecycle_states (name,is_released,sort_order) VALUES (?,?,?)').run(name,released,order);
  db.prepare('INSERT INTO classifications (name,attributes_json) VALUES (?,?)').run('Mechanical components','{"Material":"Steel, Aluminum, Polymer","Standard":"ISO, DIN, ANSI"}');
  const user = 1, inwork = 1, released = 3;
  const parts = [['NX-200-001','Main chassis assembly','C','Released'],['NX-200-014','Battery housing, 48V','B','Released'],['NX-200-031','Thermal interface pad','A','In Work'],['EL-440-008','Motor control board','D','Released'],['ME-120-311','M8 hex bolt, stainless','A','Released'],['ME-200-010','Main chassis','A','Released'],['ME-121-107','Washer, M8','A','Released'],['EL-440-015','48V battery pack','A','Released']];
  for (const [number,name,revision,state] of parts) {
    const stateId = state === 'Released' ? released : inwork;
    const result = db.prepare('INSERT INTO parts (number,name,owner_id,classification_id,lifecycle_state_id,updated_at) VALUES (?,?,?,?,?,?)').run(number,name,user,1,stateId,now());
    const rev = db.prepare('INSERT INTO part_revisions (part_id,revision,lifecycle_state_id,created_by) VALUES (?,?,?,?)').run(Number(result.lastInsertRowid),revision,stateId,user);
    db.prepare('UPDATE parts SET current_revision_id=? WHERE id=?').run(Number(rev.lastInsertRowid),Number(result.lastInsertRowid));
  }
  const assembly = db.prepare('INSERT INTO bom_assemblies (assembly_revision_id,created_by) VALUES (?,?)').run(1,user);
  for (const [number,qty,find] of [['ME-200-010',1,'10'],['ME-120-311',24,'20'],['ME-121-107',24,'30'],['EL-440-008',1,'40'],['EL-440-015',1,'50']]) {
    const child = db.prepare('SELECT current_revision_id id FROM parts WHERE number=?').get(number);
    db.prepare('INSERT INTO bom_lines (assembly_id,child_revision_id,quantity,find_number) VALUES (?,?,?,?)').run(Number(assembly.lastInsertRowid),child.id,qty,find);
  }
  for (const row of [['ECR-2026-042','Update battery enclosure venting','Engineering Change','In Review','2026-09-12'],['ECO-2026-038','Qualify alternate motor supplier','Engineering Change Order','Approved','2026-09-15'],['ECR-2026-041','Correct chassis drawing tolerance','Engineering Change','In Work','2026-09-10'],['MCO-2026-012','Revise assembly work instruction','Manufacturing Change','Submitted','2026-09-18']]) db.prepare('INSERT INTO change_requests(number,title,type,state,assignee_id,due_date,created_by) VALUES (?,?,?,?,?,?,?)').run(...row.slice(0,4),user,row[4],user);
  for (const [name,description] of [['New Product Release','Routes designs through engineering, quality, and manufacturing approval.'],['Engineering Change','Evaluates impacts and controls implementation of technical changes.'],['Supplier Qualification','Validates new suppliers against required evidence and standards.']]) db.prepare('INSERT INTO workflow_definitions(name,description,created_by) VALUES (?,?,?)').run(name,description,user);
}
seed();

function json(res, status, body) { res.writeHead(status, {'Content-Type':'application/json'}); res.end(JSON.stringify(body)); }
function audit(user, type, id, action, before, after) { db.prepare('INSERT INTO audit_events(actor_id,entity_type,entity_id,action,before_json,after_json,created_at) VALUES (?,?,?,?,?,?,?)').run(user.id,type,String(id),action,before?JSON.stringify(before):null,after?JSON.stringify(after):null,now()); }
function userFrom(req) { const value = req.headers.authorization || ''; if (!value.startsWith('Basic ')) return null; try { const [email,password] = Buffer.from(value.slice(6),'base64').toString().split(':'); const user = db.prepare('SELECT * FROM users WHERE email=?').get(email); if (!user || !timingSafeEqual(Buffer.from(user.password_hash),Buffer.from(hash(password)))) return null; return user; } catch { return null; } }
async function body(req) { let raw=''; for await (const chunk of req) raw += chunk; try { return raw ? JSON.parse(raw) : {}; } catch { throw new Error('Invalid JSON request body'); } }
const released = id => db.prepare('SELECT s.is_released FROM parts p JOIN part_revisions r ON r.id=p.current_revision_id JOIN lifecycle_states s ON s.id=r.lifecycle_state_id WHERE p.id=?').get(id)?.is_released;
const partRows = () => db.prepare(`SELECT p.id,p.number,p.name,p.description,r.revision,s.name state,u.display_name owner,p.updated_at FROM parts p JOIN part_revisions r ON r.id=p.current_revision_id JOIN lifecycle_states s ON s.id=r.lifecycle_state_id JOIN users u ON u.id=p.owner_id ORDER BY p.number`).all();

async function api(req,res,url,user) {
  const path = url.pathname, method = req.method;
  if (path === '/api/me' && method === 'GET') return json(res,200,{id:user.id,email:user.email,displayName:user.display_name});
  if (path === '/api/parts' && method === 'GET') return json(res,200,partRows());
  if (path === '/api/parts' && method === 'POST') { const x=await body(req); if (!x.number || !x.name) return json(res,422,{error:'number and name are required'}); const stateId=db.prepare("SELECT id FROM lifecycle_states WHERE name='In Work'").get().id; const p=db.prepare('INSERT INTO parts(number,name,description,owner_id,lifecycle_state_id,updated_at) VALUES(?,?,?,?,?,?)').run(x.number,x.name,x.description||'',user.id,stateId,now()); const r=db.prepare('INSERT INTO part_revisions(part_id,revision,lifecycle_state_id,description,created_by) VALUES(?,?,?,?,?)').run(Number(p.lastInsertRowid),'A',stateId,x.description||'',user.id); db.prepare('UPDATE parts SET current_revision_id=? WHERE id=?').run(Number(r.lastInsertRowid),Number(p.lastInsertRowid)); const row=partRows().find(v=>v.id===Number(p.lastInsertRowid)); audit(user,'part',p.lastInsertRowid,'created',null,row); return json(res,201,row); }
  const partMatch=path.match(/^\/api\/parts\/(\d+)$/); if (partMatch && method === 'PATCH') { const id=Number(partMatch[1]); if(released(id)) return json(res,409,{error:'Released parts are immutable. Create and approve a change request before revising.'}); const before=partRows().find(v=>v.id===id); if(!before)return json(res,404,{error:'Part not found'}); const x=await body(req); db.prepare('UPDATE parts SET name=?,description=?,updated_at=? WHERE id=?').run(x.name??before.name,x.description??before.description,now(),id); const after=partRows().find(v=>v.id===id); audit(user,'part',id,'updated',before,after); return json(res,200,after); }
  if (partMatch && method === 'GET') { const row=partRows().find(v=>v.id===Number(partMatch[1])); return row ? json(res,200,row) : json(res,404,{error:'Part not found'}); }
  if (partMatch && method === 'DELETE') { const id=Number(partMatch[1]); if(released(id)) return json(res,409,{error:'Released parts cannot be deleted directly.'}); const before=partRows().find(v=>v.id===id); if(!before)return json(res,404,{error:'Part not found'}); db.prepare('DELETE FROM part_revisions WHERE part_id=?').run(id); db.prepare('DELETE FROM parts WHERE id=?').run(id); audit(user,'part',id,'deleted',before,null); return json(res,204,{}); }
  if (path === '/api/changes' && method === 'GET') return json(res,200,db.prepare('SELECT c.*,u.display_name assignee FROM change_requests c LEFT JOIN users u ON u.id=c.assignee_id ORDER BY c.created_at DESC').all());
  if (path === '/api/changes' && method === 'POST') { const x=await body(req); if(!x.number||!x.title)return json(res,422,{error:'number and title are required'}); const r=db.prepare('INSERT INTO change_requests(number,title,type,state,assignee_id,due_date,description,created_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(x.number,x.title,x.type||'Engineering Change','Draft',user.id,x.dueDate||null,x.description||'',user.id,now()); const row=db.prepare('SELECT c.*,u.display_name assignee FROM change_requests c LEFT JOIN users u ON u.id=c.assignee_id WHERE c.id=?').get(Number(r.lastInsertRowid)); audit(user,'change_request',r.lastInsertRowid,'created',null,row); return json(res,201,row); }
  const changeMatch=path.match(/^\/api\/changes\/(\d+)$/); if(changeMatch && method==='GET') { const row=db.prepare('SELECT * FROM change_requests WHERE id=?').get(Number(changeMatch[1])); return row?json(res,200,row):json(res,404,{error:'Change request not found'}); }
  if(changeMatch && method==='PATCH') { const id=Number(changeMatch[1]), before=db.prepare('SELECT * FROM change_requests WHERE id=?').get(id); if(!before)return json(res,404,{error:'Change request not found'}); const x=await body(req); db.prepare('UPDATE change_requests SET title=?,description=?,state=?,due_date=?,updated_at=? WHERE id=?').run(x.title??before.title,x.description??before.description,x.state??before.state,x.dueDate??before.due_date,now(),id); const after=db.prepare('SELECT * FROM change_requests WHERE id=?').get(id); audit(user,'change_request',id,'updated',before,after); return json(res,200,after); }
  if(changeMatch && method==='DELETE') { const id=Number(changeMatch[1]), before=db.prepare('SELECT * FROM change_requests WHERE id=?').get(id); if(!before)return json(res,404,{error:'Change request not found'}); if(before.state!=='Draft')return json(res,409,{error:'Only draft change requests can be deleted'}); db.prepare('DELETE FROM change_requests WHERE id=?').run(id); audit(user,'change_request',id,'deleted',before,null); return json(res,204,{}); }
  if (path === '/api/bom' && method === 'GET') return json(res,200,db.prepare(`SELECT p.number,p.name,r.revision,s.name state,1 quantity,'EA' unit,0 depth FROM bom_assemblies a JOIN part_revisions r ON r.id=a.assembly_revision_id JOIN parts p ON p.id=r.part_id JOIN lifecycle_states s ON s.id=r.lifecycle_state_id UNION ALL SELECT cp.number,cp.name,cr.revision,cs.name state,l.quantity,l.unit,1 depth FROM bom_assemblies a JOIN bom_lines l ON l.assembly_id=a.id JOIN part_revisions cr ON cr.id=l.child_revision_id JOIN parts cp ON cp.id=cr.part_id JOIN lifecycle_states cs ON cs.id=cr.lifecycle_state_id ORDER BY depth,number`).all());
  if (path === '/api/workflows' && method === 'GET') return json(res,200,db.prepare(`SELECT w.*,COUNT(t.id) task_count,SUM(CASE WHEN t.state='Pending' THEN 1 ELSE 0 END) pending_count FROM workflow_definitions w LEFT JOIN workflow_tasks t ON t.workflow_id=w.id GROUP BY w.id ORDER BY w.id`).all());
  if (path === '/api/workflows' && method === 'POST') { const x=await body(req); if(!x.name)return json(res,422,{error:'name is required'}); const r=db.prepare('INSERT INTO workflow_definitions(name,description,created_by) VALUES(?,?,?)').run(x.name,x.description||'',user.id); const row=db.prepare('SELECT * FROM workflow_definitions WHERE id=?').get(Number(r.lastInsertRowid)); audit(user,'workflow',r.lastInsertRowid,'created',null,row); return json(res,201,row); }
  const workflowMatch=path.match(/^\/api\/workflows\/(\d+)$/); if(workflowMatch && method==='PATCH') { const id=Number(workflowMatch[1]), before=db.prepare('SELECT * FROM workflow_definitions WHERE id=?').get(id); if(!before)return json(res,404,{error:'Workflow not found'}); const x=await body(req); db.prepare('UPDATE workflow_definitions SET name=?,description=?,active=? WHERE id=?').run(x.name??before.name,x.description??before.description,x.active??before.active,id); const after=db.prepare('SELECT * FROM workflow_definitions WHERE id=?').get(id); audit(user,'workflow',id,'updated',before,after); return json(res,200,after); }
  if(workflowMatch && method==='DELETE') { const id=Number(workflowMatch[1]), before=db.prepare('SELECT * FROM workflow_definitions WHERE id=?').get(id); if(!before)return json(res,404,{error:'Workflow not found'}); db.prepare('DELETE FROM workflow_definitions WHERE id=?').run(id); audit(user,'workflow',id,'deleted',before,null); return json(res,204,{}); }
  if (path === '/api/classifications' && method === 'GET') return json(res,200,db.prepare('SELECT * FROM classifications ORDER BY name').all());
  if (path === '/api/audit-events' && method === 'GET') return json(res,200,db.prepare('SELECT a.*,u.display_name actor FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 100').all());
  return json(res,404,{error:'API route not found'});
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
createServer(async (req,res) => { const url=new URL(req.url,'http://localhost'); if(url.pathname.startsWith('/api/')) { const user=userFrom(req); if(!user) return json(res,401,{error:'Authentication required'}); try { return await api(req,res,url,user); } catch(e) { return json(res,e.code?.includes('SQLITE_CONSTRAINT')?409:400,{error:e.message}); } } const requested=url.pathname==='/'?'index.html':normalize(url.pathname).replace(/^([.][.][\/\\])+/, ''); const file=join(root,requested); if(!file.startsWith(root)||!existsSync(file)) { res.writeHead(404); return res.end('Not found'); } res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'}); res.end(readFileSync(file)); }).listen(process.env.PORT || 3000,()=>console.log(`ForgePLM listening on http://localhost:${process.env.PORT || 3000}`));
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { ObjectStore, DocumentRepository } = require('./lib/store');
const { IntegrationEvents, validateAdapter, cadMetadataContract, erpSyncContract } = require('./integrations/contracts');
const { IntegrationJobQueue } = require('./integrations/jobs');

const repo = new DocumentRepository(new ObjectStore(path.join(process.cwd(), 'data/object-storage')));
const jobs = new IntegrationJobQueue({ onFailure: job => console.error(JSON.stringify({ type: 'integration.failure', jobId: job.id, event: job.event, failure: job.failure })) });
jobs.register(IntegrationEvents.CAD_METADATA_IMPORT, validateAdapter({ name: 'configured-cad-adapter', async execute(payload, context) { const request = cadMetadataContract(payload); context.log(`Importing ${request.source} metadata for ${request.documentId}`); return { imported: true, mapping: request.mapping }; } }));
for (const event of [IntegrationEvents.ERP_ITEM_SYNC, IntegrationEvents.ERP_BOM_SYNC]) jobs.register(event, validateAdapter({ name: 'configured-erp-adapter', async execute(payload, context) { const request = erpSyncContract(payload); context.log(`Synchronizing ${request.entityType} ${request.itemNumber} to ${request.erpSystem}`); return { synchronized: true, idempotencyKey: request.idempotencyKey }; } }));

const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const publicDocument = document => ({ ...document, revisions: document.revisions.map(({ objectKey, ...revision }) => revision) });
async function body(req) { let value = ''; for await (const chunk of req) value += chunk; try { return JSON.parse(value || '{}'); } catch { throw Object.assign(new Error('Invalid JSON body'), { status: 400 }); } }
function user(req) { return req.headers['x-user-id']; }
function authorized(req, res, document) { if (!user(req)) { json(res, 401, { error: 'x-user-id header is required' }); return false; } if (!repo.canAccess(document, user(req))) { json(res, 403, { error: 'Document access denied' }); return false; } return true; }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'); const parts = url.pathname.split('/').filter(Boolean);
    if (req.method === 'POST' && url.pathname === '/api/documents') { const input = await body(req); if (!user(req) || !input.name) return json(res, 400, { error: 'name and x-user-id are required' }); return json(res, 201, publicDocument(repo.create({ ...input, ownerId: user(req) }))); }
    if (parts[0] === 'api' && parts[1] === 'documents' && parts[2]) {
      const document = repo.get(parts[2]); if (!document) return json(res, 404, { error: 'Document not found' }); if (!authorized(req, res, document)) return;
      if (req.method === 'GET' && parts.length === 3) return json(res, 200, publicDocument(document));
      if (req.method === 'POST' && parts[3] === 'revisions' && parts.length === 4) { const input = await body(req); if (!input.filename || !input.contentBase64) return json(res, 400, { error: 'filename and contentBase64 are required' }); const revision = await repo.addRevision(document, { ...input, content: Buffer.from(input.contentBase64, 'base64'), createdBy: user(req) }); const { objectKey, ...safe } = revision; return json(res, 201, safe); }
      const revision = document.revisions.find(item => item.id === parts[4]);
      if (!revision) return json(res, 404, { error: 'Revision not found' });
      if (req.method === 'POST' && parts[3] === 'revisions' && parts[5] === 'release') { if (document.ownerId !== user(req)) return json(res, 403, { error: 'Only the owner can release revisions' }); const released = repo.release(document, revision.id); const { objectKey, ...safe } = released; return json(res, 200, safe); }
      if (req.method === 'GET' && parts[3] === 'revisions' && parts[5] === 'download') { const bytes = await repo.objectStore.get(revision.objectKey); res.writeHead(200, { 'content-type': revision.mediaType, 'content-length': bytes.length, 'content-disposition': `attachment; filename="${revision.filename}"`, 'x-checksum-sha256': revision.checksumSha256, 'x-object-version-id': revision.objectVersionId }); return res.end(bytes); }
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations/jobs') { const input = await body(req); if (!user(req)) return json(res, 401, { error: 'x-user-id header is required' }); if (!Object.values(IntegrationEvents).includes(input.event)) return json(res, 400, { error: 'Unknown integration event' }); const job = jobs.enqueue(input.event, { ...input.payload, requestedBy: user(req) }); return json(res, 202, job); }
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'integrations' && parts[2] === 'jobs' && parts[3]) { const job = jobs.get(parts[3]); return job ? json(res, 200, job) : json(res, 404, { error: 'Job not found' }); }
    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1); const filePath = path.join(process.cwd(), file); if (!filePath.startsWith(process.cwd())) return json(res, 403, { error: 'Forbidden' }); const content = await fs.readFile(filePath); res.end(content);
  } catch (error) { json(res, error.status || 500, { error: error.message }); }
});
if (require.main === module) server.listen(process.env.PORT || 3000, () => console.log('ForgePLM server listening'));
module.exports = { server, repo, jobs };
