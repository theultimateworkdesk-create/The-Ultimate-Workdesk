const taskForm=document.getElementById("taskForm");
const taskInput=document.getElementById("taskInput");
const prioritySelect=document.getElementById("prioritySelect");
const taskList=document.getElementById("taskList");
const taskCount=document.getElementById("taskCount");
const progressText=document.getElementById("progressText");
const progressPercent=document.getElementById("progressPercent");
const progressBar=document.getElementById("progressBar");
let tasks=[];

function saveTasks(){chrome.storage.local.set({workdeskTasks:tasks});}
function renderTasks(){
  taskList.innerHTML="";
  if(tasks.length===0){
    taskList.innerHTML='<div class="empty-state"><div class="empty-icon">✓</div><strong>Your workspace is clear.</strong><p>Add your first task to get started.</p></div>';
  }else{
    tasks.forEach(task=>{
      const item=document.createElement("div");
      item.className=`task-item${task.completed?" completed":""}`;
      const checkbox=document.createElement("input");
      checkbox.type="checkbox";checkbox.className="task-check";checkbox.checked=task.completed;
      checkbox.setAttribute("aria-label","Mark task as completed");
      checkbox.addEventListener("change",()=>{task.completed=checkbox.checked;saveTasks();renderTasks();});
      const main=document.createElement("div");main.className="task-main";
      const title=document.createElement("span");title.className="task-title";title.textContent=task.title;
      const priority=document.createElement("span");priority.className=`priority ${task.priority}`;priority.textContent=`${task.priority} priority`;
      main.append(title,priority);
      const remove=document.createElement("button");remove.className="delete-button";remove.type="button";remove.textContent="×";
      remove.setAttribute("aria-label","Delete task");
      remove.addEventListener("click",()=>{tasks=tasks.filter(entry=>entry.id!==task.id);saveTasks();renderTasks();});
      item.append(checkbox,main,remove);taskList.appendChild(item);
    });
  }
  const completed=tasks.filter(task=>task.completed).length;
  const total=tasks.length;const percent=total===0?0:Math.round(completed/total*100);
  taskCount.textContent=`${total} ${total===1?"task":"tasks"}`;
  progressText.textContent=`${completed} of ${total} completed`;
  progressPercent.textContent=`${percent}%`;progressBar.style.width=`${percent}%`;
}
taskForm.addEventListener("submit",event=>{
  event.preventDefault();const title=taskInput.value.trim();if(!title)return;
  tasks.unshift({id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,title,priority:prioritySelect.value,completed:false});
  saveTasks();renderTasks();taskInput.value="";taskInput.focus();
});
chrome.storage.local.get(["workdeskTasks"],result=>{
  tasks=Array.isArray(result.workdeskTasks)?result.workdeskTasks:[];renderTasks();
});
