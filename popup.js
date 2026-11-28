 'use strict';

const $ = id => document.getElementById(id);
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const STORAGE_KEY = 'workdesk';
const COLLECTIONS = ['tasks', 'plans', 'clients', 'leads', 'jobs'];
let db = Object.fromEntries(COLLECTIONS.map(key => [key, []]));
let statusTimer;
let mutationQueue = Promise.resolve();
let workspaceReadyPromise = Promise.resolve();

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const dateTimeKey = record => `${record.date || '9999-12-31'}T${record.time || '23:59'}`;
const byDateTime = (a, b) => dateTimeKey(a).localeCompare(dateTimeKey(b)) || String(a.name || '').localeCompare(String(b.name || ''));

function announce(message, isError = false) {
  const status = $('appStatus');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('error', isError);
  status.hidden = !message;
  clearTimeout(statusTimer);
  if (message && !isError) statusTimer = setTimeout(() => { status.hidden = true; }, 3500);
}

function updateStats() {
  const done = db.tasks.filter(task => task.done).length;
  const total = db.tasks.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  $('openCount').textContent = String(total - done);
  $('doneCount').textContent = String(done);
  $('clientCount').textContent = String(db.clients.length);
  $('leadCount').textContent = String(db.leads.length);
  $('progressText').textContent = `${percent}%`;
  $('progressBar').style.width = `${percent}%`;
  $('progressBar').parentElement.setAttribute('aria-valuenow', String(percent));
}

// Queue the mutation itself and resolve records by ID only when it executes.
// This prevents stale object references after an earlier failed mutation restores db.
function commitMutation(mutator, successMessage = 'Saved on this device.') {
  const operation = mutationQueue.then(async () => {
    await workspaceReadyPromise;
    const previous = JSON.parse(JSON.stringify(db));
    try {
      mutator();
      const snapshot = JSON.parse(JSON.stringify(db));
      await chrome.storage.local.set({ [STORAGE_KEY]: snapshot });
      render();
      announce(successMessage);
      return true;
    } catch (error) {
      db = previous;
      render();
      console.error('Workdesk storage operation failed:', error);
      announce('Could not save your change. Your previous data has been restored. Try again.', true);
      return false;
    }
  });
  mutationQueue = operation.catch(() => {});
  return operation;
}

function item(title, detail, id, type, check = false, done = false) {
  const safeId = esc(id);
  return `<article class="item ${done ? 'done' : ''}">${check ? `<input type="checkbox" data-check="${safeId}" aria-label="Mark ${esc(title)} complete" ${done ? 'checked' : ''}>` : ''}<div class="item-copy"><b>${esc(title)}</b><small>${esc(detail || '')}</small></div><button type="button" class="delete" data-del-type="${type}" data-del-id="${safeId}" aria-label="Delete ${esc(title)}">×</button></article>`;
}

function render() {
  const filter = $('taskFilter').value;
  const visibleTasks = db.tasks.filter(task => filter === 'all' || (filter === 'open' && !task.done) || (filter === 'done' && task.done));
  $('taskList').innerHTML = visibleTasks.map(task => item(task.name, `${task.priority || 'Medium'} priority${task.date ? ` · Due ${task.date}` : ''}`, task.id, 'tasks', true, task.done)).join('') || '<p class="empty">No tasks in this view yet.</p>';
  $('planList').innerHTML = [...db.plans].sort(byDateTime).map(plan => item(plan.name, [plan.date, plan.time].filter(Boolean).join(' · '), plan.id, 'plans')).join('') || '<p class="empty">No planned activities yet.</p>';
  $('clientList').innerHTML = db.clients.map(client => item(client.name, [client.email, client.note].filter(Boolean).join(' · '), client.id, 'clients')).join('') || '<p class="empty">No clients saved yet.</p>';
  $('leadList').innerHTML = db.leads.map(lead => item(lead.name, [lead.source, lead.contact].filter(Boolean).join(' · '), lead.id, 'leads')).join('') || '<p class="empty">No leads saved yet.</p>';
  $('jobList').innerHTML = db.jobs.map(job => item(job.name, [job.source, job.url].filter(Boolean).join(' · '), job.id, 'jobs')).join('') || '<p class="empty">No opportunities saved yet.</p>';

  const upcoming = db.tasks.filter(task => !task.done).sort((a, b) => dateTimeKey(a).localeCompare(dateTimeKey(b)) || String(a.name || '').localeCompare(String(b.name || ''))).slice(0, 4);
  $('upcomingList').innerHTML = upcoming.map(task => `<div class="compact-item"><span>${esc(task.name)}</span><span>${esc(task.date || task.priority || 'Open')}</span></div>`).join('') || '<p class="empty">No open tasks. Enjoy the breathing room.</p>';
  updateStats();
}

function bindAdd(formId, key, make, validate = null) {
  $(formId).addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const record = make();
    if (!record.name || !record.name.trim()) {
      announce('Please enter a name before saving.', true);
      return;
    }
    const validationError = validate?.(record);
    if (validationError) {
      announce(validationError.message, true);
      validationError.field?.focus();
      return;
    }
    const saved = await commitMutation(() => db[key].unshift(record));
    if (saved) form.reset();
  });
}

bindAdd('taskForm', 'tasks', () => ({ id: uid(), name: $('taskName').value.trim(), priority: $('priority').value, date: $('dueDate').value, done: false }));
bindAdd('planForm', 'plans', () => ({ id: uid(), name: $('planName').value.trim(), date: $('planDate').value, time: $('planTime').value }));
bindAdd('clientForm', 'clients', () => ({ id: uid(), name: $('clientName').value.trim(), email: $('clientEmail').value.trim(), note: $('clientNote').value.trim() }));
bindAdd('leadForm', 'leads', () => ({ id: uid(), name: $('leadName').value.trim(), source: $('leadSource').value.trim(), contact: $('leadContact').value.trim() }));
bindAdd('jobForm', 'jobs', () => ({ id: uid(), name: $('jobName').value.trim(), source: $('jobSource').value.trim(), url: $('jobUrl').value.trim() }), record => {
  if (!record.url) return null;
  try {
    const parsed = new URL(record.url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
    return null;
  } catch {
    return { message: 'Enter a valid http or https opportunity URL.', field: $('jobUrl') };
  }
});

document.addEventListener('change', async event => {
  if (!event.target.matches('[data-check]')) return;
  const taskId = event.target.dataset.check;
  const nextValue = event.target.checked;
  await commitMutation(() => {
    const task = db.tasks.find(entry => entry.id === taskId);
    if (task) task.done = nextValue;
  });
});

document.addEventListener('click', async event => {
  const del = event.target.closest('[data-del-type][data-del-id]');
  if (del) {
    const key = del.dataset.delType;
    const id = del.dataset.delId;
    if (!COLLECTIONS.includes(key)) return;
    await commitMutation(() => { db[key] = db[key].filter(entry => entry.id !== id); }, 'Item deleted.');
    return;
  }
  const go = event.target.closest('[data-go]');
  if (go) activate(go.dataset.go);
});

function activate(view) {
  if (!$(view)) return;
  document.querySelectorAll('.tab, .view').forEach(element => element.classList.remove('active'));
  document.querySelector(`.tab[data-view="${view}"]`)?.classList.add('active');
  $(view).classList.add('active');
}

document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => activate(button.dataset.view)));
$('taskFilter').addEventListener('change', render);

$('makeProposal').addEventListener('click', () => {
  const service = $('pService').value.trim();
  const need = $('pNeed').value.trim();
  if (!service || !need) {
    announce('Enter the service and the client’s need first.', true);
    (!service ? $('pService') : $('pNeed')).focus();
    return;
  }
  const client = $('pClient').value.trim() || 'there';
  const proof = $('pProof').value.trim();
  $('proposalResult').value = `Hi ${client},\n\nI’d be glad to support you with ${service}.\n\nFrom your description, your main need is: ${need}.\n\nMy approach would be to confirm your priorities, agree on clear deliverables and timelines, and keep you updated throughout the work.${proof ? `\n\nRelevant experience: ${proof}` : ''}\n\nWould you be open to a brief conversation so I can understand the outcome you’re aiming for?\n\nBest regards`;
  $('proposalResult').hidden = false;
  $('copyProposal').hidden = false;
  $('copyStatus').textContent = '';
  announce('Proposal draft created. Review it before sending.');
});

$('copyProposal').addEventListener('click', async () => {
  const field = $('proposalResult');
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(field.value);
      $('copyStatus').textContent = 'Copied.';
      return;
    }
    throw new Error('Clipboard API unavailable');
  } catch (error) {
    field.focus();
    field.select();
    $('copyStatus').textContent = 'Draft selected. Use your device menu to copy.';
  }
});

async function loadWorkspace() {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const workspace = stored?.[STORAGE_KEY];
    if (workspace && typeof workspace === 'object') {
      for (const key of COLLECTIONS) {
        const value = workspace[key];
        db[key] = Array.isArray(value) ? value.filter(record => record && typeof record === 'object' && record.id && typeof record.name === 'string') : [];
      }
    }
  } catch (error) {
    console.error('Could not load local workspace data:', error);
    announce('Could not load saved data. Check extension storage permissions.', true);
  }
  $('todayLabel').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
  render();
}

workspaceReadyPromise = loadWorkspace();