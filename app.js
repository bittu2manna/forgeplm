const parts = [
  ['NX-200-001','Main chassis assembly','C','Released','L. Chen','Today, 09:42'],
  ['NX-200-014','Battery housing, 48V','B','Released','A. Morgan','Yesterday'],
  ['NX-200-031','Thermal interface pad','A','In Work','J. Patel','Sep 07, 2026'],
  ['EL-440-008','Motor control board','D','Released','R. Silva','Sep 04, 2026'],
  ['ME-120-311','M8 hex bolt, stainless','A','Released','L. Chen','Sep 02, 2026']
];
const changes = [
  ['ECR-2026-042','Update battery enclosure venting','Engineering Change','In Review','You','Sep 12, 2026'],
  ['ECO-2026-038','Qualify alternate motor supplier','Engineering Change Order','Approved','L. Chen','Sep 15, 2026'],
  ['ECR-2026-041','Correct chassis drawing tolerance','Engineering Change','In Work','J. Patel','Sep 10, 2026'],
  ['MCO-2026-012','Revise assembly work instruction','Manufacturing Change','Submitted','R. Silva','Sep 18, 2026']
];
const $ = s => document.querySelector(s);
function statePill(state){ return `<span class="pill ${state==='Released'||state==='Approved'?'released':'inwork'}">${state}</span>` }
function renderTables(){
  $('#partsTable').innerHTML=parts.map(p=>`<tr><td><strong>${p[0]}</strong></td><td>${p[1]}</td><td>${p[2]}</td><td>${statePill(p[3])}</td><td>${p[4]}</td><td>${p[5]}</td></tr>`).join('');
  $('#changesTable').innerHTML=changes.map(c=>`<tr><td><strong>${c[0]}</strong></td><td>${c[1]}</td><td>${c[2]}</td><td>${statePill(c[3])}</td><td>${c[4]}</td><td>${c[5]}</td></tr>`).join('');
}
function showView(name){ document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===name)); document.querySelectorAll('.nav-item').forEach(v=>v.classList.toggle('active',v.dataset.view===name)); const labels={home:'Workspace / Overview',parts:'Product / Parts & Documents',bom:'Product / Bill of Materials',classification:'Foundation / Classification',changes:'Process / Change Management',workflows:'Process / Workflows',admin:'System / Administration'}; $('#crumb').textContent=labels[name]; }
document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-view-target]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.viewTarget)));
const attention=[['↺','ECR-2026-042','Update battery enclosure venting','Due in 3 days','review','Review required'],['▤','DOC-1018','Supplier qualification package','Awaiting your approval','review','Approval needed'],['✓','ECO-2026-038','Qualify alternate motor supplier','Approved by 4 of 5 reviewers','approved','Almost complete']];
$('#attentionList').innerHTML=attention.map((a,i)=>`<div class="attention-item"><div class="type-icon ${i===1?'blue':''}">${a[0]}</div><div><div class="item-title">${a[1]} · ${a[2]}</div><div class="item-meta">${a[3]}</div></div><span class="status ${a[4]}">${a[5]}</span></div>`).join('');
const activities=['Alex Morgan promoted <strong>NX-200 Assembly</strong> to Released.','Lin Chen added revision C to <strong>Motor control board</strong>.','Priya Shah submitted <strong>ECR-2026-042</strong> for review.','Forge Assist matched 12 existing parts to your latest search.'];
$('.activity-list').innerHTML=activities.map((a,i)=>`<div class="activity-row"><div class="activity-dot">${['↑','✎','↺','✦'][i]}</div><p>${a}<time>${i+1} hour${i?'s':''} ago</time></p></div>`).join('');
const bom=[['▾','NX-200-001','NX-200 Assembly','1 EA',0],['▾','ME-200-010','Main chassis','1 EA',1],['','ME-120-311','M8 hex bolt, stainless','24 EA',2],['','ME-121-107','Washer, M8','24 EA',2],['','EL-440-008','Motor control board','1 EA',1],['','EL-440-015','48V battery pack','1 EA',1]];
$('#bomTree').innerHTML=bom.map((b,i)=>`<div class="tree-item ${i===0?'selected':''}" style="padding-left:${7+b[4]*25}px" data-code="${b[1]}" data-name="${b[2]}" data-qty="${b[3]}"><span>${b[0]||'·'}</span><span class="tree-code">${b[1]}</span><span class="tree-name">${b[2]}</span><span class="tree-qty">${b[3]}</span></div>`).join('');
document.querySelectorAll('.tree-item').forEach(e=>e.addEventListener('click',()=>{document.querySelectorAll('.tree-item').forEach(x=>x.classList.remove('selected'));e.classList.add('selected');$('#selectedPart').textContent=e.dataset.code;$('.detail-name').textContent=e.dataset.name;$('#detailQty').textContent=e.dataset.qty}));
const flows=[['New Product Release','Routes designs through engineering, quality, and manufacturing approval.','8 active','93% on time'],['Engineering Change','Evaluates impacts and controls implementation of technical changes.','5 active','2 approvals waiting'],['Supplier Qualification','Validates new suppliers against required evidence and standards.','3 active','100% on time']];
$('#workflowCards').innerHTML=flows.map(f=>`<article class="panel workflow-card"><span class="pill released">ACTIVE</span><h3>${f[0]}</h3><p>${f[1]}</p><footer><span>${f[2]}</span><span>${f[3]}</span></footer></article>`).join('');
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800)}
function runSearch(){const query=$('#globalSearch').value.trim();if(!query)return; const q=query.toLowerCase();const hits=parts.filter(p=>p.join(' ').toLowerCase().includes(q));$('#searchResult').innerHTML=hits.length?`<strong>Forge Assist found ${hits.length} matching item${hits.length>1?'s':''}:</strong> ${hits.map(h=>`${h[0]} — ${h[1]}`).join(' · ')}`:`Forge Assist found no exact match for “${query}”. Try a part number, material, document, or change ID.`}
$('#searchBtn').addEventListener('click',runSearch);$('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter')runSearch()});
window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus()}});
const modal=$('#modal');function openModal(type='Part'){ $('#modalType').value=type;$('#modalEyebrow').textContent='CREATE';$('#modalTitle').textContent=`Create ${type}`;modal.showModal();$('#modalName').focus() }
$('#createBtn').addEventListener('click',()=>openModal());$('#newPartBtn').addEventListener('click',()=>openModal('Part'));$('#newChangeBtn').addEventListener('click',()=>openModal('Change Request'));
$('#modalSubmit').addEventListener('click',()=>{if(!$('#modalName').value.trim())return;toast(`${$('#modalType').value} “${$('#modalName').value}” created as a draft.`);$('#modalName').value=''});
$('#exportBtn').addEventListener('click',()=>toast('Workspace report exported successfully.'));
renderTables();
