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
