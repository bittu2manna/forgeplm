'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer, permissionsFor } = require('./server');

let server; let base;
test.before(async () => { server = createServer(); await new Promise(resolve => server.listen(0, resolve)); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => new Promise(resolve => server.close(resolve)));
test('role permission matrix is explicit', () => { assert.deepEqual(permissionsFor('Supplier'), ['read']); assert.ok(permissionsFor('Engineering Admin').includes('administer')); });
test('protected API rejects anonymous access and allows a signed-in user', async () => { const anonymous = await fetch(`${base}/api/parts`); assert.equal(anonymous.status, 401); const signIn = await fetch(`${base}/api/auth/sign-in`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'devon@forgeplm.local', password: 'Design!26' }) }); assert.equal(signIn.status, 200); const cookie = signIn.headers.get('set-cookie').split(';')[0]; const parts = await fetch(`${base}/api/parts`, { headers: { cookie } }); assert.equal(parts.status, 200); const release = await fetch(`${base}/api/parts/NX-200-031/release`, { method: 'POST', headers: { cookie } }); assert.equal(release.status, 403); });
test('quality can approve changes while a supplier cannot create records', async () => {
  const signIn = async (email, password) => { const response = await fetch(`${base}/api/auth/sign-in`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }); return response.headers.get('set-cookie').split(';')[0]; };
  const qualityCookie = await signIn('priya@forgeplm.local', 'Quality!26');
  const approved = await fetch(`${base}/api/changes/ECR-2026-042/approve`, { method: 'POST', headers: { cookie: qualityCookie } });
  assert.equal(approved.status, 200);
  const supplierCookie = await signIn('sam@forgeplm.local', 'Supplier!26');
  const created = await fetch(`${base}/api/parts`, { method: 'POST', headers: { cookie: supplierCookie, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Unauthorized part' }) });
  assert.equal(created.status, 403);
});
