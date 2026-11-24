const $ = id => document.getElementById(id);
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
let db = {tasks:[], plans:[], clients:[], leads:[], jobs:[]};
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
async function save(){ await chrome.storage.local.set({workdesk:db}); updateStats(); }
function item(title, detail, id, type, check=false, done=false){
  return `<article class="item ${done?'done':''}">${check?`<input type="checkbox" data-check="${esc(id)}" aria-label="Mark ${esc(title)} complete" ${done?'checked':''}>`:''}<div class="item-copy"><b>${esc(title)}</b><small>${esc(detail || '')}</small></div><button class="delete" data-del="${type}:${esc(id)}" aria-label="Delete ${esc(title)}">×</button></article>`;
}
function updateStats(){
  const done=db.tasks.filter(t=>t.done).length, total=db.tasks.length, percent=total?Math.round(done/total*100):0;
  $('openCount').textContent=total-done; $('doneCount').textContent=done; $('clientCount').textContent=db.clients.length; $('leadCount').textContent=db.leads.length;
  $('progressText').textContent=`${percent}%`; $('progressBar').style.width=`${percent}%`;
}
function render(){
  $('taskList').innerHTML=db.tasks.filter(t=>{const f=$('taskFilter').value;return f==='all'||(f==='open'&&!t.done)||(f==='done'&&t.done)}).map(t=>item(t.name,`${t.priority} priority${t.date?' · Due '+t.date:''}`,t.id,'tasks',true,t.done)).join('') || '<p class="empty">No tasks in this view yet.</p>';
  $('planList').innerHTML=db.plans.slice().sort((a,b)=>`${a.date||'9999'}${a.time||''}`.localeCompare(`${b.date||'9999'}${b.time||''}`)).map(x=>item(x.name,[x.date,x.time].filter(Boolean).join(' · '),x.id,'plans')).join('') || '<p class="empty">No planned activities yet.</p>';
  $('clientList').innerHTML=db.clients.map(x=>item(x.name,[x.email,x.note].filter(Boolean).join(' · '),x.id,'clients')).join('') || '<p class="empty">No clients saved yet.</p>';
  $('leadList').innerHTML=db.leads.map(x=>item(x.name,[x.source,x.contact].filter(Boolean).join(' · '),x.id,'leads')).join('') || '<p class="empty">No leads saved yet.</p>';
  $('jobList').innerHTML=db.jobs.map(x=>item(x.name,[x.source,x.url].filter(Boolean).join(' · '),x.id,'jobs')).join('') || '<p class="empty">No opportunities saved yet.</p>';
  const upcoming=db.tasks.filter(t=>!t.done).slice(0,4);
  $('upcomingList').innerHTML=upcoming.map(t=>`<div class="compact-item"><span>${esc(t.name)}</span><span>${esc(t.date||t.priority)}</span></div>`).join('') || '<p class="empty">No open tasks. Enjoy the breathing room.</p>';
  updateStats();
}
function bindAdd(formId,key,make){
  $(formId).addEventListener('submit',async e=>{e.preventDefault();const record=make();if(!record.name)return;db[key].unshift(record);await save();render();e.target.reset();});
}
bindAdd('taskForm','tasks',()=>({id:uid(),name:$('taskName').value.trim(),priority:$('priority').value,date:$('dueDate').value,done:false}));
bindAdd('planForm','plans',()=>({id:uid(),name:$('planName').value.trim(),date:$('planDate').value,time:$('planTime').value}));
bindAdd('clientForm','clients',()=>({id:uid(),name:$('clientName').value.trim(),email:$('clientEmail').value.trim(),note:$('clientNote').value.trim()}));
bindAdd('leadForm','leads',()=>({id:uid(),name:$('leadName').value.trim(),source:$('leadSource').value.trim(),contact:$('leadContact').value.trim()}));
bindAdd('jobForm','jobs',()=>({id:uid(),name:$('jobName').value.trim(),source:$('jobSource').value.trim(),url:$('jobUrl').value.trim()}));
document.addEventListener('change',async e=>{if(e.target.matches('[data-check]')){const task=db.tasks.find(t=>t.id===e.target.dataset.check);if(task){task.done=e.target.checked;await save();render();}}});
document.addEventListener('click',async e=>{
  const del=e.target.closest('[data-del]'); if(del){const [key,id]=del.dataset.del.split(':');if(db[key]){db[key]=db[key].filter(x=>x.id!==id);await save();render();}return;}
  const go=e.target.closest('[data-go]');if(go)activate(go.dataset.go);
});
function activate(view){document.querySelectorAll('.tab,.view').forEach(el=>el.classList.remove('active'));document.querySelector(`.tab[data-view="${view}"]`)?.classList.add('active');$(view)?.classList.add('active');}
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>activate(btn.dataset.view)));
$('taskFilter').addEventListener('change',render);
$('makeProposal').addEventListener('click',()=>{
  const service=$('pService').value.trim(), need=$('pNeed').value.trim();
  if(!service||!need){alert('Please enter the service and the client’s need.');return;}
  const client=$('pClient').value.trim()||'there', proof=$('pProof').value.trim();
  $('proposalResult').value=`Hi ${client},\n\nI’d be glad to support you with ${service}.\n\nFrom your description, your main need is: ${need}.\n\nMy approach would be to confirm your priorities, agree on clear deliverables and timelines, and keep you updated throughout the work.${proof?`\n\nRelevant experience: ${proof}`:''}\n\nWould you be open to a brief conversation so I can understand the outcome you’re aiming for?\n\nBest regards`;
  $('proposalResult').hidden=false;$('copyProposal').hidden=false;$('copyStatus').textContent='';
});
$('copyProposal').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('proposalResult').value);$('copyStatus').textContent='Copied.';}catch{ $('proposalResult').select();$('copyStatus').textContent='Select and copy the draft.'; }});
(async()=>{
  try{const stored=await chrome.storage.local.get('workdesk');if(stored.workdesk){db={...db,...stored.workdesk};for(const key of Object.keys(db))if(!Array.isArray(db[key]))db[key]=[];}}
  catch(error){console.error('Could not load local workspace data',error);}
  $('todayLabel').textContent=new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric'}).format(new Date());
  render();
})();
