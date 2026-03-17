function initUIExtensions() {
  // 1. Initialize Minimize Behavior
  addMinimizeBehavior("constructor-panel");
  addMinimizeBehavior("args-panel");
  addMinimizeBehavior("viz-panel");

  // Set initial positions below header (assuming header is ~60px)
  const panels = ["constructor-panel", "args-panel", "viz-panel"];
  const startOffsets = [20, 340, 610];
  panels.forEach((id, i) => {
    const p = document.getElementById(id);
    if(p) {
        p.style.top = "80px"; 
        p.style.left = startOffsets[i] + "px";
    }
  });

  // 2. Setup Feature Adding Logic
  const addFeatureBtn = document.getElementById("add-feature-btn");
  if (addFeatureBtn) {
    addFeatureBtn.onclick = () => {
      const list = document.getElementById("ui-feature-list");
      const index = list.children.length;
      const bitValue = 1 << index;

      const div = document.createElement("div");
      div.className = "feature-row";
      div.style = "display: flex; gap: 5px; margin-bottom: 8px;";
      div.innerHTML = `
        <input type="text" placeholder="Feature Name" class="feat-name" style="flex: 1;">
        <input type="text" placeholder="Key" class="feat-key" style="width: 40px; text-align: center;">
        <span style="font-size: 10px; color: #666; width: 50px;">Mask: ${bitValue}</span>
        <button onclick="this.parentElement.remove()" style="cursor:pointer; border:none; background:none;">×</button>
      `;
      list.appendChild(div);
    };
  }

  // 3. Setup Generate Button Logic
  const generateBtn = document.getElementById("generate-fsm-btn");
  if (generateBtn) {
    generateBtn.onclick = () => {
      const food = document.getElementById("food-input").value;
      const rows = document.querySelectorAll(".feature-row");
      const featureMap = {};
      const S_map = {};

      rows.forEach((row, i) => {
        const name = row.querySelector(".feat-name").value;
        const key = row.querySelector(".feat-key").value;
        const bit = 1 << i;
        if (name && key) {
          featureMap[bit] = name;
          S_map[key] = bit;
        }
      });

      if (food && Object.keys(S_map).length > 0) {
        window.dfa = new MonotonicDFA(food, S_map);
        window.viz = new MonotonicVisualizer('fsmCanvas', window.dfa, featureMap);
        updateArgsDisplay(food, featureMap);
      }
    };
  }

  // 4. Draggable Setup
  makeDraggable(document.getElementById("viz-panel"));
  makeDraggable(document.getElementById("constructor-panel"));
  makeDraggable(document.getElementById("args-panel"));

  // 5. RESIZER IMPLEMENTATION (The Missing Piece)
  const resizer = document.getElementById('viz-resizer');
  const vPanel = document.getElementById('viz-panel');
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
        if (newWidth > 200) vPanel.style.width = newWidth + 'px';
        if (newHeight > 150) vPanel.style.height = newHeight + 'px';
        if (window.viz) window.viz.resize();
      };

      const stopResize = () => {
        window.removeEventListener('mousemove', doResize);
        window.removeEventListener('mouseup', stopResize);
      };

      window.addEventListener('mousemove', doResize);
      window.addEventListener('mouseup', stopResize);
    };
  }

  // --- INTERNAL HELPERS ---
  function updateArgsDisplay(food, features) {
    const display = document.getElementById("active-args-display");
    if (!display) return;
    display.innerHTML = `
      <div style="font-size: 11px;">
        <strong>Target Food:</strong> <code style="background:#eee; padding:2px 4px;">${food}</code>
        <hr style="margin: 8px 0; border:0; border-top:1px solid #ddd;">
        <strong>Feature Bitmasking:</strong>
        <ul style="padding-left: 15px; margin: 5px 0;">
          ${Object.entries(features).map(([bit, name]) => `<li>${bit}: ${name}</li>`).join('')}
        </ul>
      </div>
    `;
  }

function makeDraggable(el) {
  if (!el) return;
  const handle = el.querySelector(".handle");
  if (!handle) return;

  handle.onmousedown = (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
    e.preventDefault();
    let pos3 = e.clientX, pos4 = e.clientY;

    document.onmousemove = (e) => {
      let pos1 = pos3 - e.clientX, pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;

      // --- THE GUARD LOGIC ---
      const headerHeight = 60; // Adjust this to your actual header height
      let newTop = el.offsetTop - pos2;
      let newLeft = el.offsetLeft - pos1;

      // Prevent dragging above the header
      if (newTop < headerHeight) newTop = headerHeight;
      
      // Optional: Prevent dragging off the left/right/bottom edges
      if (newLeft < 0) newLeft = 0;
      if (newLeft > window.innerWidth - el.offsetWidth) newLeft = window.innerWidth - el.offsetWidth;

      el.style.top = newTop + "px";
      el.style.left = newLeft + "px";
    };

    document.onmouseup = () => { document.onmousemove = null; };
  };
}

  function addMinimizeBehavior(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const handle = panel.querySelector(".handle");
    const btn = document.createElement("button");
    btn.className = "min-btn";
    btn.innerHTML = "−";
    btn.onclick = (e) => {
      e.stopPropagation();
      const isMin = panel.classList.toggle("minimized");
      btn.innerHTML = isMin ? "+" : "−";
    };
    handle.appendChild(btn);
  }
}