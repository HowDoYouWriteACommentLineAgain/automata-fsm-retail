/**
 * UI Extension Logic for Retail FSM Demo
 * Handles panel population and draggability.
 */

function initUIExtensions(featureNames, S_map) {
  // Populate Feature List UI
  const featureList = document.getElementById("ui-feature-list");
  if (featureList) {
    featureNames.forEach((name) => {
      const div = document.createElement("div");
      div.className = "feature-item";
      div.innerHTML = `<input type="checkbox" checked disabled> <span>${name}</span>`;
      featureList.appendChild(div);
    });
  }

  // Populate Legend UI
  const smapList = document.getElementById("ui-smap-list");
  if (smapList) {
    Object.keys(S_map).forEach((key) => {
      const li = document.createElement("li");
      li.innerText = `Key: ${key}`;
      smapList.appendChild(li);
    });
  }

  // Simple Draggable implementation
  function makeDraggable(el) {
    if (!el) return;
    let pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;
    const handle = el.querySelector(".handle");

    if (handle) {
      handle.onmousedown = (e) => {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = () => {
          document.onmouseup = null;
          document.onmousemove = null;
        };
        document.onmousemove = (e) => {
          pos1 = pos3 - e.clientX;
          pos2 = pos4 - e.clientY;
          pos3 = e.clientX;
          pos4 = e.clientY;
          el.style.top = el.offsetTop - pos2 + "px";
          el.style.left = el.offsetLeft - pos1 + "px";
        };
      };
    }
  }

  const configPanel = document.getElementById("config-panel");
  if (configPanel) {
    makeDraggable(configPanel);
  }
}
