function initUIExtensions() {
  const HEADER_HEIGHT = 60;
  let highestZ = 100;

  const sidebarIds = [
    "tutorial-panel",
    "constructor-panel",
    "args-panel",
    "trace-panel",
    "grocery-panel"
  ];
  const vizId = "viz-panel";

  sidebarIds.forEach((id, i) => {
    addMinimizeBehavior(id);
    const p = document.getElementById(id);
    if (p) {
      p.classList.add("minimized");
      p.style.top = 80 + i * 42 + "px";
      p.style.left = "20px";
      p.style.zIndex = highestZ;
      makeDraggable(p);
    }
  });

  addMinimizeBehavior(vizId);
  const vPanel = document.getElementById(vizId);
  if (vPanel) {
    vPanel.style.top = "80px";
    vPanel.style.left = "320px";
    vPanel.style.width = "700px";
    vPanel.style.height = "480px";
    vPanel.style.zIndex = highestZ;
    makeDraggable(vPanel);
  }

  const resizer = document.getElementById("viz-resizer");
  if (resizer && vPanel) {
    resizer.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startWidth = vPanel.offsetWidth;
      const startHeight = vPanel.offsetHeight;
      const startX = e.clientX;
      const startY = e.clientY;

      const doResize = (moveEvent) => {
        const newWidth = startWidth + (moveEvent.clientX - startX);
        const newHeight = startHeight + (moveEvent.clientY - startY);
        if (newWidth > 300) vPanel.style.width = newWidth + "px";
        if (newHeight > 200) vPanel.style.height = newHeight + "px";
        if (window.viz) window.viz.resize();
      };

      const stopResize = () => {
        window.removeEventListener("mousemove", doResize);
        window.removeEventListener("mouseup", stopResize);
      };

      window.addEventListener("mousemove", doResize);
      window.addEventListener("mouseup", stopResize);
    };
  }

  function makeDraggable(el) {
    if (!el) return;
    const handle = el.querySelector(".handle");
    if (!handle) return;

    handle.onmousedown = (e) => {
      if (["INPUT", "BUTTON", "TEXTAREA"].includes(e.target.tagName)) return;
      highestZ++;
      el.style.zIndex = highestZ;
      e.preventDefault();
      let pos3 = e.clientX,
        pos4 = e.clientY;

      document.onmousemove = (e) => {
        let pos1 = pos3 - e.clientX,
          pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        let newTop = Math.max(HEADER_HEIGHT, el.offsetTop - pos2);
        let newLeft = Math.max(0, el.offsetLeft - pos1);
        el.style.top = newTop + "px";
        el.style.left = newLeft + "px";
      };

      document.onmouseup = () => {
        document.onmousemove = null;
      };
    };
  }

  function addMinimizeBehavior(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const handle = panel.querySelector(".handle");
    if (!handle || handle.querySelector(".min-btn")) return;

    const btn = document.createElement("button");
    btn.className = "min-btn";
    btn.innerHTML = panel.classList.contains("minimized") ? "+" : "−";
    btn.style =
      "float: right; cursor: pointer; background: none; border: none; font-weight: bold; color: inherit;";

    btn.onclick = (e) => {
      e.stopPropagation();
      const isMin = panel.classList.toggle("minimized");
      btn.innerHTML = isMin ? "+" : "−";
    };
    handle.appendChild(btn);
  }
}

if (document.readyState === "complete") {
  initUIExtensions();
} else {
  window.addEventListener("load", initUIExtensions);
}
