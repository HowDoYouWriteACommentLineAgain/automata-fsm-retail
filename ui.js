function initUIExtensions() {
  const HEADER_HEIGHT = 60;
  let highestZ = 100;

  const allPanels = document.querySelectorAll(".draggable-panel");

  allPanels.forEach((panel) => {
    panel.style.position = "absolute";
    
    // 1. INITIAL POSITIONING (Matching your Image)
    if (panel.id === "viz-panel") {
      // Large Visualizer on the right
      panel.style.top = "80px";
      panel.style.left = "320px";
      panel.classList.remove("minimized"); 
    } else {
      // Sidebars stacked on the left
      panel.style.left = "20px";
      panel.classList.add("minimized");

      if (panel.id === "tutorial-panel") panel.style.top = "80px";
      else if (panel.id === "constructor-panel") panel.style.top = "190px";
      else if (panel.id === "args-panel") panel.style.top = "300px";
      else panel.style.top = "410px"; // Fallback for any other panels
    }

    panel.style.zIndex = highestZ;

    // 2. Bring to Front on Click
    panel.addEventListener("mousedown", () => {
      highestZ++;
      panel.style.zIndex = highestZ;
    });

    // 3. Attach Behaviors
    addMinimizeBehavior(panel);
    makeDraggable(panel);
    setupResizer(panel); // Added Resizer Logic
  });

  function makeDraggable(el) {
    const handle = el.querySelector(".handle");
    if (!handle) return;

    handle.onmousedown = (e) => {
      // FIX: Don't drag if clicking buttons or resizers
      if (["INPUT", "BUTTON", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.target.classList.contains("resizer") || e.target.id.includes("resizer")) return;

      e.preventDefault();
      highestZ++;
      el.style.zIndex = highestZ;

      let startX = e.clientX;
      let startY = e.clientY;

      const onMove = (mE) => {
        const dx = startX - mE.clientX;
        const dy = startY - mE.clientY;
        startX = mE.clientX;
        startY = mE.clientY;

        let newTop = el.offsetTop - dy;
        let newLeft = el.offsetLeft - dx;

        if (newTop < HEADER_HEIGHT) newTop = HEADER_HEIGHT;
        el.style.top = newTop + "px";
        el.style.left = newLeft + "px";
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };
  }

  // --- THE RESIZER FIX ---
  function setupResizer(panel) {
    const resizer = panel.querySelector(".resizer") || document.getElementById(panel.id + "-resizer");
    if (!resizer) return;

    resizer.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevents the 'drag' logic from triggering

      const startWidth = panel.offsetWidth;
      const startHeight = panel.offsetHeight;
      const startX = e.clientX;
      const startY = e.clientY;

      const onResizeMove = (mE) => {
        const newWidth = startWidth + (mE.clientX - startX);
        const newHeight = startHeight + (mE.clientY - startY);

        if (newWidth > 200) panel.style.width = newWidth + "px";
        if (newHeight > 100) panel.style.height = newHeight + "px";

        // Sync Viz if applicable
        if (panel.id === "viz-panel" && window.viz) {
          window.viz.resize();
        }
      };

      const onResizeUp = () => {
        window.removeEventListener('mousemove', onResizeMove);
        window.removeEventListener('mouseup', onResizeUp);
      };

      window.addEventListener('mousemove', onResizeMove);
      window.addEventListener('mouseup', onResizeUp);
    };
  }

  function addMinimizeBehavior(panel) {
    const handle = panel.querySelector(".handle");
    if (!handle || handle.querySelector(".min-btn")) return;

    const btn = document.createElement("button");
    btn.className = "min-btn";
    btn.innerHTML = panel.classList.contains("minimized") ? "+" : "−";
    btn.style = "float: right; cursor: pointer; background: none; border: none; font-weight: bold; color: inherit; padding: 0 5px;";
    
    btn.onclick = (e) => {
      e.stopPropagation();
      const isMin = panel.classList.toggle("minimized");
      btn.innerHTML = isMin ? "+" : "−";
      if (!isMin) {
        highestZ++;
        panel.style.zIndex = highestZ;
      }
    };
    handle.appendChild(btn);
  }
}

// Global Trigger
if (document.readyState === "complete") {
    initUIExtensions();
} else {
    window.addEventListener("load", initUIExtensions);
}