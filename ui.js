/**
 * Global UI State
 */
let highestZ = 100;
const HEADER_HEIGHT = 60;
const SIDEBAR_IDS = ["tutorial-panel", "constructor-panel", "args-panel", "trace-panel", "grocery-panel"];

/**
 * Main Initialization
 */
function initUIExtensions() {
    // 1. Setup Sidebar Panels
    SIDEBAR_IDS.forEach((id, i) => {
        addMinimizeBehavior(id);
        const p = document.getElementById(id);
        if (p) {
            p.classList.add("minimized");
            p.style.top = 80 + i * 42 + "px";
            p.style.left = "20px";
            p.style.zIndex = highestZ;
            
            // Set default sizes for when they are expanded
            makeDraggable(p);
        }
    });

    // 2. Setup Visualizer Panel
    const vPanel = document.getElementById("viz-panel");
    if (vPanel) {
        vPanel.style.top = "80px";
        vPanel.style.left = "350px";
        vPanel.style.width = "700px";
        vPanel.style.height = "480px";
        vPanel.style.zIndex = highestZ;
        makeDraggable(vPanel);
        setupResizer("viz-resizer", vPanel, true);
    }

    // 3. Setup Grocery Specific Resizer
    const gPanel = document.getElementById("grocery-panel");
    if (gPanel) {
        setupResizer("grocery-resizer", gPanel, false);
    }

    // 4. Setup Header "Recall" Button
    setupRecallButton();
}

/**
 * Reusable Resizer Logic
 */
function setupResizer(resizerId, panel, isViz = false) {
    const resizer = document.getElementById(resizerId);
    if (!resizer || !panel) return;

    resizer.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startWidth = panel.offsetWidth;
        const startHeight = panel.offsetHeight;
        const startX = e.clientX;
        const startY = e.clientY;

        const doResize = (moveEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            const newHeight = startHeight + (moveEvent.clientY - startY);
            if (newWidth > 200) panel.style.width = newWidth + "px";
            if (newHeight > 150) panel.style.height = newHeight + "px";
            if (isViz && window.viz) window.viz.resize();
        };

        const stopResize = () => {
            window.removeEventListener("mousemove", doResize);
            window.removeEventListener("mouseup", stopResize);
        };

        window.addEventListener("mousemove", doResize);
        window.addEventListener("mouseup", stopResize);
    };
}

/**
 * Dragging & Z-Index logic
 */
function makeDraggable(el) {
    if (!el) return;
    const handle = el.querySelector(".handle");
    if (!handle) return;

    el.addEventListener("mousedown", () => {
        highestZ++;
        el.style.zIndex = highestZ;
    }, true);

    handle.onmousedown = (e) => {
        if (["INPUT", "BUTTON", "TEXTAREA"].includes(e.target.tagName)) return;
        e.preventDefault();
        
        let pos3 = e.clientX;
        let pos4 = e.clientY;

        document.onmousemove = (e) => {
            let pos1 = pos3 - e.clientX;
            let pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            // 1. Calculate intended new positions
            let newTop = el.offsetTop - pos2;
            let newLeft = el.offsetLeft - pos1;

            // 2. Calculate Boundaries
            // maxX/maxY ensure the window doesn't go off the right/bottom
            const maxX = window.innerWidth - el.offsetWidth;
            const maxY = window.innerHeight - el.offsetHeight;

            // 3. Clamp the values
            // We use Math.max(HEADER_HEIGHT, ...) to keep it below the header
            // We use Math.min(..., maxX/maxY) to keep it inside the screen
            const finalTop = Math.min(Math.max(HEADER_HEIGHT, newTop), maxY);
            const finalLeft = Math.min(Math.max(0, newLeft), maxX);

            el.style.top = finalTop + "px";
            el.style.left = finalLeft + "px";
        };

        document.onmouseup = () => {
            document.onmousemove = null;
        };
    };
}

/**
 * Minimize Behavior
 */
function addMinimizeBehavior(panelId) {
    const panel = document.getElementById(panelId);
    const handle = panel?.querySelector(".handle");
    if (!handle || handle.querySelector(".min-btn")) return;

    const btn = document.createElement("button");
    btn.className = "min-btn";
    btn.innerHTML = panel.classList.contains("minimized") ? "+" : "−";
    btn.style = "float: right; cursor: pointer; background: none; border: none; font-weight: bold; color: inherit;";

    btn.onclick = (e) => {
        e.stopPropagation();
        const isMin = panel.classList.toggle("minimized");
        btn.innerHTML = isMin ? "+" : "−";
    };
    handle.appendChild(btn);
}

/**
 * Header Button Setup
 */
function setupRecallButton() {
    const header = document.querySelector("#header-toolbar") || document.querySelector("header");
    if (!header || document.getElementById("recall-btn")) return;

    const recallBtn = document.createElement("button");
    recallBtn.id = "recall-btn";
    recallBtn.innerText = "⟲ Reset Layout and minimize";
    recallBtn.style = `margin-left: 10px; padding: 5px 12px; font-size: 12px; font-weight: 600; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; transition: all 0.2s;`;

    recallBtn.onmouseover = () => { recallBtn.style.background = "#e2e8f0"; };
    recallBtn.onmouseout = () => { recallBtn.style.background = "#f1f5f9"; };
    recallBtn.onclick = resetPanelPositions;
    
    header.appendChild(recallBtn);
}

/**
 * Reset Layout Logic
 */
function resetPanelPositions() {
    SIDEBAR_IDS.forEach((id, i) => {
        const p = document.getElementById(id);
        if (p) {
            p.style.top = 80 + i * 42 + "px";
            p.style.left = "20px";
            p.classList.toggle("minimized", !("minimized" in p.classList))
            // if (id === "grocery-panel") {
            //     p.style.width = "320px";
            //     p.style.height = "500px";
            // }
        }
    });

    const vPanel = document.getElementById("viz-panel");
    if (vPanel) {
        vPanel.style.top = "80px";
        vPanel.style.left = "350px";
        vPanel.style.width = "700px";
        vPanel.style.height = "480px";
        if (window.viz) window.viz.resize();
    }
}

// Bootstrapper
if (document.readyState === "complete") {
    initUIExtensions();
} else {
    window.addEventListener("load", initUIExtensions);
}