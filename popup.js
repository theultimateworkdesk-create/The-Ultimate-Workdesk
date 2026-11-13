const taskInput = document.getElementById("task");
const saveButton = document.getElementById("save");
const status = document.getElementById("status");

chrome.storage.local.get(["dailyFocus"], (data) => {
  if (data.dailyFocus) taskInput.value = data.dailyFocus;
});

saveButton.addEventListener("click", () => {
  const focus = taskInput.value.trim();
  chrome.storage.local.set({ dailyFocus: focus }, () => {
    status.textContent = "Your focus has been saved.";
    setTimeout(() => status.textContent = "", 2200);
  });
});
