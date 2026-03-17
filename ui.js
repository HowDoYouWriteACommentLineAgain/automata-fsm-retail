/**
 * UI Extension Logic
 * Initializes panels, tables, and drag behavior.
 */

function initUIExtensions(featureNames, S_map) {
  // 1. Populate Feature List (Checkboxes)
  const featureList = document.getElementById("ui-feature-list");
  if (featureList) {
    featureNames.forEach((name) => {
      const div = document.createElement("div");
      div.className = "feature-item";
      div.innerHTML = `
        <input type="checkbox" checked id="feat-${name}"> 
        <label for="feat-${name}" style="margin-left:8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</label>
      `;
      featureList.appendChild(div);
    });
  }

  // 2. Populate S_map Table (Replacing the list)
  const legendPanel = document.getElementById("legend-panel");
  if (legendPanel) {
    // FIX: Added table-layout: fixed and width: 100% to ensure it stays within bounds
    legendPanel.innerHTML = `
      <div class="handle">::: STATE CONFIGURATION</div>
      <strong style="display: block; margin-bottom: 5px;">Active S_map Keys</strong>
      <div class="filter-group">
        <span class="filter-chip">All</span>
        <span class="filter-chip">Pricing</span>
        <span class="filter-chip">Nutrition</span>
      </div>
      <div style="width: 100%; overflow-x: hidden;">
        <table class="data-table" style="table-layout: fixed; width: 100%;">
          <thead>
            <tr>
              <th style="width: 60px;">Key</th>
              <th>Logic Expression</th>
            </tr>
          </thead>
          <tbody id="ui-smap-tbody"></tbody>
        </table>
      </div>
    `;

    const tbody = document.getElementById("ui-smap-tbody");
    Object.keys(S_map).forEach((key) => {
      const row = document.createElement("tr");
      // FIX: Added box-sizing and width 100% to input to prevent overflow
      row.innerHTML = `
        <td style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>${key}</strong></td>
        <td>
            <input type="text" 
                   id='${key}-${S_map[key]}' 
                   value="Mask: ${S_map[key]}" 
                   readonly 
                   style="width: 100%; box-sizing: border-box; display: block;">
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  // 3. Draggable Implementation
  function makeDraggable(el) {
    if (!el) return;
    let pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;
    const handle = el.querySelector(".handle");

    if (handle) {
      handle.onmousedown = (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON")
          return;
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

  makeDraggable(document.getElementById("config-panel"));
  makeDraggable(document.getElementById("legend-panel"));
}
