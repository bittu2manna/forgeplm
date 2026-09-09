'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 8000);
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const users = [
  { id: 'u-admin', email: 'alex@forgeplm.local', name: 'Alex Morgan', role: 'Engineering Admin', passwordHash: 'dacb8bb6eb371daa9bab035e4a31d68e:4728bb2776a63cec887dd04187149cf2d4a9a5394888ccb6e728fc3f0fdf7d6fa7491aba18a6593908c16bade701a5805b741ae7fa877cbd352411e2f1bba187' },
  { id: 'u-design', email: 'devon@forgeplm.local', name: 'Devon Hayes', role: 'Design Engineer', passwordHash: '4e917700e58612e5c9f4272cb16e6193:de7d84ab9ffbcf46620695aa380fd9307afebeb7936659ac0e0415b135ade9a06dfa63a9d264bda5284d28dbaad0f626aeef03db9f8f90d2b0ce3735171930f5' },
  { id: 'u-mfg', email: 'riley@forgeplm.local', name: 'Riley Silva', role: 'Manufacturing Engineer', passwordHash: 'bdfb68e0c743d194eceb4bed2ba24681:d0589b37f27d4626be0fbe6f6ed53caf36f518c49db8f023165547bd4a5ce2bd2ccccd11d8a73e0158fd34de288b9a019ad0ff8592701791dff2e5b4f75d1f73' },
  { id: 'u-quality', email: 'priya@forgeplm.local', name: 'Priya Shah', role: 'Quality Reviewer', passwordHash: '1b4cf2049896144c0958568d8007308b:53640ef88964e6ce538a6ed98b8067a3869cbdc414c0fec88e2a3d0efa43257e22b66302ac57b710b2204fcdb5ede7b145226f46d1db794e576081de2c29c813' },
  { id: 'u-supplier', email: 'sam@forgeplm.local', name: 'Sam Ortiz', role: 'Supplier', passwordHash: '7f18cafc7d092eebf096a6093e1858f1:1c634e674710a831f97214e57155acc1a81801d7007e3cfad4696fd508bf403f697fba3d5cb9815de717e7e716728a2c61c6c092f90e1ac006758d9a7f5b3c87' }
];
const groups = {
  'Engineering Admin': ['read', 'create', 'revise', 'release', 'approve', 'administer'],
  'Design Engineer': ['read', 'create', 'revise'],
  'Manufacturing Engineer': ['read', 'create', 'revise', 'release'],
  'Quality Reviewer': ['read', 'approve'],
  Supplier: ['read']
};
const sessions = new Map();
const parts = [
  { number: 'NX-200-001', name: 'Main chassis assembly', revision: 'C', state: 'Released', owner: 'L. Chen', modified: 'Today, 09:42' },
  { number: 'NX-200-014', name: 'Battery housing, 48V', revision: 'B', state: 'Released', owner: 'A. Morgan', modified: 'Yesterday' },
  { number: 'NX-200-031', name: 'Thermal interface pad', revision: 'A', state: 'In Work', owner: 'J. Patel', modified: 'Sep 07, 2026' },
  { number: 'EL-440-008', name: 'Motor control board', revision: 'D', state: 'Released', owner: 'R. Silva', modified: 'Sep 04, 2026' },
  { number: 'ME-120-311', name: 'M8 hex bolt, stainless', revision: 'A', state: 'Released', owner: 'L. Chen', modified: 'Sep 02, 2026' }
];
const changes = [
  { number: 'ECR-2026-042', title: 'Update battery enclosure venting', type: 'Engineering Change', state: 'In Review', assignee: 'You', dueDate: 'Sep 12, 2026' },
  { number: 'ECO-2026-038', title: 'Qualify alternate motor supplier', type: 'Engineering Change Order', state: 'Approved', assignee: 'L. Chen', dueDate: 'Sep 15, 2026' },
  { number: 'ECR-2026-041', title: 'Correct chassis drawing tolerance', type: 'Engineering Change', state: 'In Work', assignee: 'J. Patel', dueDate: 'Sep 10, 2026' },
  { number: 'MCO-2026-012', title: 'Revise assembly work instruction', type: 'Manufacturing Change', state: 'Submitted', assignee: 'R. Silva', dueDate: 'Sep 18, 2026' }
];

function permissionsFor(role) { return groups[role] || []; }
function verifyPassword(password, passwordHash) { const [salt, expected] = passwordHash.split(':'); const actual = crypto.scryptSync(password, salt, 64).toString('hex'); return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex')); }
function publicUser(user) { return { id: user.id, email: user.email, name: user.name, role: user.role, permissions: permissionsFor(user.role) }; }
function cookie(req, name) { return (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1); }
function currentUser(req) { const id = cookie(req, 'forge_session'); const session = id && sessions.get(id); if (!session || session.expiresAt < Date.now()) { if (id) sessions.delete(id); return null; } return users.find(user => user.id === session.userId) || null; }
function json(res, status, data, headers = {}) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }); res.end(JSON.stringify(data)); }
function parseBody(req) { return new Promise((resolve, reject) => { let raw = ''; req.on('data', c => { raw += c; if (raw.length > 100_000) req.destroy(); }); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } }); req.on('error', reject); }); }
function requirePermission(req, res, permission) { const user = currentUser(req); if (!user) { json(res, 401, { error: 'Sign in is required.' }); return null; } if (!permissionsFor(user.role).includes(permission)) { json(res, 403, { error: `Your ${user.role} role cannot ${permission} PLM records.` }); return null; } return user; }
function issueSession(res, user) { const token = crypto.randomBytes(32).toString('base64url'); sessions.set(token, { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS }); const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''; return `forge_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`; }
function staticFile(req, res) { const fileName = req.url === '/' ? 'index.html' : decodeURIComponent(req.url.slice(1).split('?')[0]); const root = path.resolve(__dirname); const file = path.resolve(root, fileName); if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); } const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }; res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res); }

async function handleApi(req, res, url) {
  if (req.method === 'POST' && url.pathname === '/api/auth/sign-in') {
    const { email = '', password = '' } = await parseBody(req); const user = users.find(u => u.email === String(email).toLowerCase()); if (user && !verifyPassword(String(password), user.passwordHash)) return json(res, 401, { error: 'Invalid email or password.' });
    if (!user) return json(res, 401, { error: 'Invalid email or password.' });
    return json(res, 200, { user: publicUser(user) }, { 'set-cookie': issueSession(res, user) });
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/sign-out') { const token = cookie(req, 'forge_session'); if (token) sessions.delete(token); return json(res, 204, {}, { 'set-cookie': 'forge_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' }); }
  if (req.method === 'GET' && url.pathname === '/api/session') { const user = currentUser(req); return user ? json(res, 200, { user: publicUser(user) }) : json(res, 401, { error: 'No active session.' }); }
  if (req.method === 'GET' && url.pathname === '/api/parts') { if (!requirePermission(req, res, 'read')) return; return json(res, 200, { parts }); }
  if (req.method === 'GET' && url.pathname === '/api/changes') { if (!requirePermission(req, res, 'read')) return; return json(res, 200, { changes }); }
  if (req.method === 'POST' && url.pathname === '/api/parts') { const user = requirePermission(req, res, 'create'); if (!user) return; const body = await parseBody(req); if (!String(body.name || '').trim()) return json(res, 422, { error: 'A record title is required.' }); const item = { number: `NX-${String(300 + parts.length).padStart(3, '0')}-001`, name: body.name.trim(), revision: 'A', state: 'In Work', owner: user.name, modified: 'Just now' }; parts.unshift(item); return json(res, 201, { part: item }); }
  if (req.method === 'POST' && url.pathname === '/api/changes') { const user = requirePermission(req, res, 'create'); if (!user) return; const body = await parseBody(req); if (!String(body.title || '').trim()) return json(res, 422, { error: 'A change title is required.' }); const item = { number: `ECR-2026-${String(43 + changes.length).padStart(3, '0')}`, title: body.title.trim(), type: 'Engineering Change', state: 'In Work', assignee: user.name, dueDate: 'Not scheduled' }; changes.unshift(item); return json(res, 201, { change: item }); }
  const partAction = url.pathname.match(/^\/api\/parts\/([^/]+)\/(revise|release)$/);
  if (req.method === 'POST' && partAction) { const action = partAction[2]; if (!requirePermission(req, res, action)) return; const part = parts.find(p => p.number === decodeURIComponent(partAction[1])); if (!part) return json(res, 404, { error: 'Part not found.' }); if (action === 'revise') part.revision = String.fromCharCode(part.revision.charCodeAt(0) + 1); else part.state = 'Released'; part.modified = 'Just now'; return json(res, 200, { part }); }
  const changeAction = url.pathname.match(/^\/api\/changes\/([^/]+)\/approve$/);
  if (req.method === 'POST' && changeAction) { if (!requirePermission(req, res, 'approve')) return; const change = changes.find(c => c.number === decodeURIComponent(changeAction[1])); if (!change) return json(res, 404, { error: 'Change not found.' }); change.state = 'Approved'; return json(res, 200, { change }); }
  if (req.method === 'GET' && url.pathname === '/api/admin/groups') { if (!requirePermission(req, res, 'administer')) return; return json(res, 200, { groups }); }
  return json(res, 404, { error: 'API route not found.' });
}

function createServer() { return http.createServer(async (req, res) => { try { const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url); staticFile(req, res); } catch (error) { json(res, 400, { error: error.message || 'Request failed.' }); } }); }
if (require.main === module) createServer().listen(PORT, () => console.log(`ForgePLM listening on http://localhost:${PORT}`));
module.exports = { createServer, permissionsFor };
