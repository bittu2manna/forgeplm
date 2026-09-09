const $ = s => document.querySelector(s);
const api = async (path, options={}) => {
  const response = await fetch(`/api${path}`, { ...options, headers: { Authorization: `Basic ${btoa('admin@forgeplm.local:forgeplm-demo')}`, 'Content-Type':'application/json', ...(options.headers||{}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
};
let parts = [];
let changes = [];
function statePill(state){ return `<span class="pill ${state==='Released'||state==='Approved'?'released':'inwork'}">${state}</span>` }
function renderTables(){
  $('#partsTable').innerHTML=parts.map(p=>`<tr><td><strong>${p.number}</strong></td><td>${p.name}</td><td>${p.revision}</td><td>${statePill(p.state)}</td><td>${p.owner}</td><td>${new Date(p.updated_at).toLocaleDateString()}</td></tr>`).join('');
  $('#changesTable').innerHTML=changes.map(c=>`<tr><td><strong>${c.number}</strong></td><td>${c.title}</td><td>${c.type}</td><td>${statePill(c.state)}</td><td>${c.assignee || 'Unassigned'}</td><td>${c.due_date || '—'}</td></tr>`).join('');
let currentUser;
let parts = [];
let changes = [];
const $ = s => document.querySelector(s);
const can = permission => currentUser?.permissions.includes(permission);
const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
async function api(url, options = {}) { const response = await fetch(url, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } }); if (response.status === 204) return null; const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed.'); return data; }
function statePill(state) { return `<span class="pill ${state === 'Released' || state === 'Approved' ? 'released' : 'inwork'}">${escapeHtml(state)}</span>`; }
function actionButton(label, action, code, permission) { return can(permission) ? `<button class="row-action" data-action="${action}" data-code="${escapeHtml(code)}">${label}</button>` : ''; }
function renderTables() {
  $('#partsTable').innerHTML = parts.map(p => `<tr><td><strong>${escapeHtml(p.number)}</strong></td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.revision)}</td><td>${statePill(p.state)}</td><td>${escapeHtml(p.owner)}</td><td>${escapeHtml(p.modified)}</td><td>${actionButton('Revise', 'revise', p.number, 'revise')} ${p.state !== 'Released' ? actionButton('Release', 'release', p.number, 'release') : ''}</td></tr>`).join('');
  $('#changesTable').innerHTML = changes.map(c => `<tr><td><strong>${escapeHtml(c.number)}</strong></td><td>${escapeHtml(c.title)}</td><td>${escapeHtml(c.type)}</td><td>${statePill(c.state)}</td><td>${escapeHtml(c.assignee)}</td><td>${escapeHtml(c.dueDate)}</td><td>${c.state !== 'Approved' ? actionButton('Approve', 'approve', c.number, 'approve') : ''}</td></tr>`).join('');
  document.querySelectorAll('.row-action').forEach(button => button.addEventListener('click', async () => { try { await api(`/api/${button.dataset.action === 'approve' ? 'changes' : 'parts'}/${encodeURIComponent(button.dataset.code)}/${button.dataset.action}`, { method: 'POST' }); await loadRecords(); toast(`${button.dataset.code} updated.`); } catch (error) { toast(error.message, true); } }));
}
function applyPermissions() { document.querySelectorAll('[data-permission]').forEach(element => element.hidden = !can(element.dataset.permission)); document.querySelectorAll('.nav-item').forEach(item => { if (item.hidden && item.classList.contains('active')) showView('home'); }); }
function showView(name) { const view = document.getElementById(name); if (!view || document.querySelector(`[data-view="${name}"]`)?.hidden) return; document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === name)); document.querySelectorAll('.nav-item').forEach(v => v.classList.toggle('active', v.dataset.view === name)); const labels = { home:'Workspace / Overview', parts:'Product / Parts & Documents', bom:'Product / Bill of Materials', classification:'Foundation / Classification', changes:'Process / Change Management', workflows:'Process / Workflows', admin:'System / Administration' }; $('#crumb').textContent = labels[name]; }
document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
document.querySelectorAll('[data-view-target]').forEach(b => b.addEventListener('click', () => showView(b.dataset.viewTarget)));
const attention = [['↺','ECR-2026-042','Update battery enclosure venting','Due in 3 days','review','Review required'],['▤','DOC-1018','Supplier qualification package','Awaiting your approval','review','Approval needed'],['✓','ECO-2026-038','Qualify alternate motor supplier','Approved by 4 of 5 reviewers','approved','Almost complete']];
$('#attentionList').innerHTML = attention.map((a,i) => `<div class="attention-item"><div class="type-icon ${i===1?'blue':''}">${a[0]}</div><div><div class="item-title">${a[1]} · ${a[2]}</div><div class="item-meta">${a[3]}</div></div><span class="status ${a[4]}">${a[5]}</span></div>`).join('');
const activities = ['Alex Morgan promoted <strong>NX-200 Assembly</strong> to Released.','Lin Chen added revision C to <strong>Motor control board</strong>.','Priya Shah submitted <strong>ECR-2026-042</strong> for review.','Forge Assist matched 12 existing parts to your latest search.'];
$('.activity-list').innerHTML = activities.map((a,i) => `<div class="activity-row"><div class="activity-dot">${['↑','✎','↺','✦'][i]}</div><p>${a}<time>${i+1} hour${i?'s':''} ago</time></p></div>`).join('');
const bom = [['▾','NX-200-001','NX-200 Assembly','1 EA',0],['▾','ME-200-010','Main chassis','1 EA',1],['','ME-120-311','M8 hex bolt, stainless','24 EA',2],['','ME-121-107','Washer, M8','24 EA',2],['','EL-440-008','Motor control board','1 EA',1],['','EL-440-015','48V battery pack','1 EA',1]];
$('#bomTree').innerHTML = bom.map((b,i) => `<div class="tree-item ${i===0?'selected':''}" style="padding-left:${7+b[4]*25}px" data-code="${b[1]}" data-name="${b[2]}" data-qty="${b[3]}"><span>${b[0]||'·'}</span><span class="tree-code">${b[1]}</span><span class="tree-name">${b[2]}</span><span class="tree-qty">${b[3]}</span></div>`).join('');
document.querySelectorAll('.tree-item').forEach(e => e.addEventListener('click', () => { document.querySelectorAll('.tree-item').forEach(x => x.classList.remove('selected')); e.classList.add('selected'); $('#selectedPart').textContent=e.dataset.code; $('.detail-name').textContent=e.dataset.name; $('#detailQty').textContent=e.dataset.qty; }));
const flows = [['New Product Release','Routes designs through engineering, quality, and manufacturing approval.','8 active','93% on time'],['Engineering Change','Evaluates impacts and controls implementation of technical changes.','5 active','2 approvals waiting'],['Supplier Qualification','Validates new suppliers against required evidence and standards.','3 active','100% on time']];
$('#workflowCards').innerHTML = flows.map(f => `<article class="panel workflow-card"><span class="pill released">ACTIVE</span><h3>${f[0]}</h3><p>${f[1]}</p><footer><span>${f[2]}</span><span>${f[3]}</span></footer></article>`).join('');
function toast(message, error=false) { const el=$('#toast'); el.textContent=message; el.classList.toggle('error', error); el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2800); }
function runSearch() { const query=$('#globalSearch').value.trim(); if (!query) return; const hits=parts.filter(p => Object.values(p).join(' ').toLowerCase().includes(query.toLowerCase())); $('#searchResult').innerHTML = hits.length ? `<strong>Forge Assist found ${hits.length} matching item${hits.length>1?'s':''}:</strong> ${hits.map(h => `${escapeHtml(h.number)} — ${escapeHtml(h.name)}`).join(' · ')}` : `Forge Assist found no exact match for “${escapeHtml(query)}”.`; }
$('#searchBtn').addEventListener('click', runSearch); $('#globalSearch').addEventListener('keydown', e => { if(e.key==='Enter') runSearch(); }); window.addEventListener('keydown', e => { if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus();} });
const modal=$('#modal'); function openModal(type='Part') { if (!can('create')) return toast('You do not have permission to create records.', true); $('#modalType').value=type; $('#modalEyebrow').textContent='CREATE'; $('#modalTitle').textContent=`Create ${type}`; modal.showModal(); $('#modalName').focus(); }
$('#createBtn').addEventListener('click', () => openModal()); $('#newPartBtn').addEventListener('click', () => openModal('Part')); $('#newChangeBtn').addEventListener('click', () => openModal('Change Request'));
$('#modalSubmit').addEventListener('click', async event => { if(!$('#modalName').value.trim()) return; event.preventDefault(); try { const isPart = $('#modalType').value === 'Part'; const data = await api(isPart ? '/api/parts' : '/api/changes', { method:'POST', body: JSON.stringify(isPart ? { name: $('#modalName').value } : { title: $('#modalName').value }) }); if (isPart) parts.unshift(data.part); else changes.unshift(data.change); renderTables(); modal.close(); toast(`${isPart ? 'Part' : 'Change'} “${isPart ? data.part.name : data.change.title}” created as a draft.`); $('#modalName').value=''; } catch(error) { toast(error.message, true); } });
$('#exportBtn').addEventListener('click', () => toast('Workspace report exported successfully.'));
async function loadRecords() { const [partData, changeData] = await Promise.all([api('/api/parts'), api('/api/changes')]); parts = partData.parts; changes = changeData.changes; renderTables(); }
function renderProfile() { $('#profileName').textContent=currentUser.name; $('#profileRole').textContent=currentUser.role; $('#profileAvatar').textContent=currentUser.name.split(' ').map(n=>n[0]).join('').slice(0,2); $('#greetingName').textContent=currentUser.name.split(' ')[0]; }
async function startWorkspace(user) { currentUser=user; renderProfile(); applyPermissions(); await loadRecords(); $('#signInScreen').hidden=true; $('#appShell').hidden=false; }
$('#signInForm').addEventListener('submit', async event => { event.preventDefault(); $('#signInError').textContent=''; try { const data=await api('/api/auth/sign-in', { method:'POST', body:JSON.stringify({email:$('#email').value,password:$('#password').value}) }); await startWorkspace(data.user); } catch(error) { $('#signInError').textContent=error.message; } });
$('#signOutBtn').addEventListener('click', async () => { await api('/api/auth/sign-out', { method:'POST' }); currentUser=null; $('#appShell').hidden=true; $('#signInScreen').hidden=false; });
api('/api/session').then(data => startWorkspace(data.user)).catch(() => {});
function showView(name){ document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===name)); document.querySelectorAll('.nav-item').forEach(v=>v.classList.toggle('active',v.dataset.view===name)); const labels={home:'Workspace / Overview',parts:'Product / Parts & Documents',bom:'Product / Bill of Materials',classification:'Foundation / Classification',changes:'Process / Change Management',workflows:'Process / Workflows',admin:'System / Administration'}; $('#crumb').textContent=labels[name]; }
document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-view-target]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.viewTarget)));
const attention=[['↺','ECR-2026-042','Update battery enclosure venting','Due in 3 days','review','Review required'],['▤','DOC-1018','Supplier qualification package','Awaiting your approval','review','Approval needed'],['✓','ECO-2026-038','Qualify alternate motor supplier','Approved by 4 of 5 reviewers','approved','Almost complete']];
$('#attentionList').innerHTML=attention.map((a,i)=>`<div class="attention-item"><div class="type-icon ${i===1?'blue':''}">${a[0]}</div><div><div class="item-title">${a[1]} · ${a[2]}</div><div class="item-meta">${a[3]}</div></div><span class="status ${a[4]}">${a[5]}</span></div>`).join('');
const activities=['Alex Morgan promoted <strong>NX-200 Assembly</strong> to Released.','Lin Chen added revision C to <strong>Motor control board</strong>.','Priya Shah submitted <strong>ECR-2026-042</strong> for review.','Forge Assist matched 12 existing parts to your latest search.'];
$('.activity-list').innerHTML=activities.map((a,i)=>`<div class="activity-row"><div class="activity-dot">${['↑','✎','↺','✦'][i]}</div><p>${a}<time>${i+1} hour${i?'s':''} ago</time></p></div>`).join('');
function renderBom(bom){ $('#bomTree').innerHTML=bom.map((b,i)=>`<div class="tree-item ${i===0?'selected':''}" style="padding-left:${7+b.depth*25}px" data-code="${b.number}" data-name="${b.name}" data-qty="${b.quantity} ${b.unit}"><span>${b.depth===0?'▾':'·'}</span><span class="tree-code">${b.number}</span><span class="tree-name">${b.name}</span><span class="tree-qty">${b.quantity} ${b.unit}</span></div>`).join(''); document.querySelectorAll('.tree-item').forEach(e=>e.addEventListener('click',()=>{document.querySelectorAll('.tree-item').forEach(x=>x.classList.remove('selected'));e.classList.add('selected');$('#selectedPart').textContent=e.dataset.code;$('.detail-name').textContent=e.dataset.name;$('#detailQty').textContent=e.dataset.qty})); }
function renderWorkflows(flows){ $('#workflowCards').innerHTML=flows.map(f=>`<article class="panel workflow-card"><span class="pill released">${f.active?'ACTIVE':'INACTIVE'}</span><h3>${f.name}</h3><p>${f.description || ''}</p><footer><span>${f.task_count || 0} tasks</span><span>${f.pending_count || 0} pending</span></footer></article>`).join(''); }
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800)}
function runSearch(){const query=$('#globalSearch').value.trim();if(!query)return; const q=query.toLowerCase();const hits=parts.filter(p=>Object.values(p).join(' ').toLowerCase().includes(q));$('#searchResult').innerHTML=hits.length?`<strong>Forge Assist found ${hits.length} matching item${hits.length>1?'s':''}:</strong> ${hits.map(h=>`${h.number} — ${h.name}`).join(' · ')}`:`Forge Assist found no exact match for “${query}”. Try a part number, material, document, or change ID.`}
function escapeHtml(value=''){const element=document.createElement('span');element.textContent=value;return element.innerHTML}
function renderSearchResults(payload){
  const results=payload.results||[];
  if(!results.length){$('#searchResult').innerHTML=`<p class="search-summary">No permitted records matched “${escapeHtml(payload.query)}”. Try a part number, material, document, or change ID.</p>`;return}
  $('#searchResult').innerHTML=`<p class="search-summary"><strong>Forge Assist</strong> found ${results.length} grounded, permitted result${results.length===1?'':'s'}.</p><div class="grounded-results">${results.map(result=>`<a class="grounded-result" href="${escapeHtml(result.record_url)}"><span class="result-type">${escapeHtml(result.record_type)}</span><span class="result-body"><strong>${escapeHtml(result.title)}</strong><small>${escapeHtml(result.source_snippet)}</small></span><span class="result-meta">${result.revision?`Rev. ${escapeHtml(result.revision)} · `:''}${escapeHtml(result.lifecycle_state||'')}</span></a>`).join('')}</div>`;
}
async function runSearch(){
  const query=$('#globalSearch').value.trim();if(!query)return;
  const result=$('#searchResult');result.innerHTML='<p class="search-summary">Searching permitted records…</p>';
  // Production pages inject a short-lived token after the normal sign-in flow;
  // the client never chooses access groups and does not fall back to local data.
  const token=window.FORGE_ASSIST_TOKEN;
  if(!token){result.innerHTML='<p class="search-summary search-error">Sign in is required to search Forge Assist.</p>';return}
  try{
    const response=await fetch(`/api/search?q=${encodeURIComponent(query)}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},credentials:'same-origin'});
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.error||'search_failed');
    renderSearchResults(payload);
  }catch(error){result.innerHTML='<p class="search-summary search-error">Search is temporarily unavailable. No local or unrestricted results were shown.</p>'}
}
$('#searchBtn').addEventListener('click',runSearch);$('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter')runSearch()});
window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus()}});
const modal=$('#modal');function openModal(type='Part'){ $('#modalType').value=type;$('#modalEyebrow').textContent='CREATE';$('#modalTitle').textContent=`Create ${type}`;modal.showModal();$('#modalName').focus() }
$('#createBtn').addEventListener('click',()=>openModal());$('#newPartBtn').addEventListener('click',()=>openModal('Part'));$('#newChangeBtn').addEventListener('click',()=>openModal('Change Request'));
$('#modalSubmit').addEventListener('click',async e=>{e.preventDefault();const name=$('#modalName').value.trim(), type=$('#modalType').value;if(!name)return;try { if(type==='Part') { const number=`PRT-${Date.now().toString().slice(-6)}`; await api('/parts',{method:'POST',body:JSON.stringify({number,name})}); } else if(type==='Change Request') { const number=`ECR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`; await api('/changes',{method:'POST',body:JSON.stringify({number,title:name})}); } else { toast('Document API is available for metadata governance and will be connected to this form next.'); return; } await loadData(); modal.close(); $('#modalName').value=''; toast(`${type} “${name}” created as a draft.`); } catch(error) { toast(error.message); }});
$('#exportBtn').addEventListener('click',()=>toast('Workspace report exported successfully.'));
async function loadData(){ try { [parts,changes] = await Promise.all([api('/parts'),api('/changes')]); const [bom,flows] = await Promise.all([api('/bom'),api('/workflows')]); renderTables(); renderBom(bom); renderWorkflows(flows); } catch(error) { $('#searchResult').textContent=`Unable to load workspace data: ${error.message}`; } }
loadData();
