function buildFSM() {
  const featureRaw = document.getElementById("feature-list-input").value;
  const featureNames = featureRaw
    .split(",")
    .map((f) => f.trim().toLowerCase())
    .filter((f) => f);

  if (featureNames.length === 0) {
    console.error("Build failed: No features found in the input box.");
    return;
  }

  const FT = MonotonicDFA.encodeFEATURES(featureNames);

  const mappingRaw = document
    .getElementById("alphabet-mapping-input")
    .value.trim();
  const lines = mappingRaw.split("\n");
  const S_map = {};

  lines.forEach((line) => {
    if (!line.includes(":")) return;
    const [symbolPart, featuresPart] = line.split(":");
    const symbol = symbolPart.trim().toLowerCase();
    if (!symbol) return;
    const assignedFeatures = featuresPart
      .split(",")
      .map((f) => f.trim().toLowerCase());

    let symbolMask = 0;
    assignedFeatures.forEach((feat) => {
      if (FT[feat] !== undefined) {
        symbolMask |= FT[feat];
      } else if (feat !== "") {
        console.warn(`Feature "${feat}" not found in feature list.`);
      }
    });
    S_map[symbol] = symbolMask;
  });

  console.log(
    "%c--- FSM DATA CAPTURE ---",
    "color: #10b981; font-weight: bold;",
  );
  const totalStates = 1 << featureNames.length;
  console.log("Features:", featureNames);
  console.log("S_map:", S_map);
  console.log("Total States:", totalStates);

  try {
    const mono = MonotonicDFA.WithFeatures(featureNames, S_map, 0);
    window.currentDFA = mono;
    window.currentFT = FT;

    window.viz = new MonotonicVisualizer("fsmCanvas", mono, FT);

    syncGroceryStore()
    updateCartUI()

    document.getElementById("active-args-display").innerHTML = `
            <strong>FSM Built</strong>
            <hr style="margin:6px 0; border:0; border-top:1px solid #e5e7eb;">
            <div style="font-size:11px; font-family:monospace; line-height:1.8;">
              Features: ${featureNames.length}<br>
              Total States: ${totalStates}<br>
              Tokens: ${Object.keys(S_map).length}
              <hr style="margin:6px 0; border:0; border-top:1px solid #e5e7eb;">
              ${Object.entries(S_map)
                .map(([sym, mask]) => {
                  const feats = MonotonicDFA.decodeFEATURES(mask, FT);
                  return `<b>${sym}</b> → ${feats.join(", ") || "∅"}`;
                })
                .join("<br>")}
            </div>
        `;

    // Re-run any existing trace input after a rebuild
    const traceInput = document.getElementById("trace-input");
    if (traceInput && traceInput.value.trim()) {
      runTrace(traceInput.value);
    }
  } catch (err) {
    console.error("FSM Initialization Error:", err);
  }
}

function runTrace(inputStr) {
  if (!window.currentDFA || !inputStr.trim()) {
    if (window.viz) window.viz.clearTrace();
    renderTraceSteps([]);
    return;
  }

  const result = window.currentDFA.evaluateTokenized(inputStr);
  window.viz.setTrace(result.trace);
  renderTraceSteps(result.trace);
}

function renderTraceSteps(trace) {
  updateCartUI();
  const container = document.getElementById("trace-steps");
  if (!container) return;

  if (!trace.length) {
    container.innerHTML =
      '<div style="color:#9ca3af;font-size:11px;font-style:italic;">Type tokens above to trace.</div>';
    return;
  }

  let html = `<div class="trace-step-row">
        <span class="trace-token-badge" style="background:#f3f4f6;color:#6b7280">start</span>
        <span class="trace-arrow">→</span>
        <span class="trace-state-label">Q<sub>${trace[0].state}</sub></span>
    </div>`;

  for (let i = 1; i < trace.length; i++) {
    const step = trace[i];
    const isCurrent = i === trace.length - 1;
    const color = window.viz
      ? window.viz.getSymbolColor(step.token)
      : "#6366f1";

    if (step.unknown) {
      html += `<div class="trace-step-row trace-unknown-row">
                <span class="trace-token-badge" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca">${step.token}</span>
                <span style="font-size:10px;color:#ef4444;margin-left:4px">unknown — skipped</span>
            </div>`;
    } else {
      html += `<div class="trace-step-row ${isCurrent ? "trace-current-row" : ""}">
                <span class="trace-token-badge" style="background:${color}18;color:${color};border:1px solid ${color}44">${step.token}</span>
                <span class="trace-arrow">→</span>
                <span class="trace-state-label">Q<sub>${step.state}</sub></span>
            </div>`;
    }
  }

  if (window.currentFT && trace.length > 0) {
    const last = trace[trace.length - 1];
    const features = MonotonicDFA.decodeFEATURES(last.state, window.currentFT);
    html += `<hr style="margin:8px 0;border:0;border-top:1px solid #e5e7eb;">`;
    if (features.length > 0) {
      html += `<div style="font-size:10px;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;">Features accumulated</div>`;
      html += features
        .map(
          (f) =>
            `<span style="display:inline-block;padding:2px 7px;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:4px;font-size:10px;margin:2px 2px 2px 0;">${f}</span>`,
        )
        .join("");
    } else {
      html += `<span style="font-size:11px;color:#9ca3af;">∅ no features accumulated</span>`;
    }
  }

  container.innerHTML = html;
}

function syncGroceryStore() {
    const shelf = document.getElementById("grocery-shelf");
    const traceInput = document.getElementById("trace-input");
    if (!window.currentDFA || !shelf) return;

    shelf.innerHTML = ""; 
    const tokens = Object.keys(window.currentDFA.S_map);

    // Dummy Data Helpers
    const getPrice = (name) => (name.length * 1.5 + 2.99).toFixed(2);
    const getDistributor = (name) => {
        const distros = ["Global Harvest", "Atlas Foods", "Peak Logistics", "EcoSource", "Prime Route"];
        return distros[name.length % distros.length];
    };

    tokens.forEach(token => {
        const price = getPrice(token);
        const distributor = getDistributor(token);
        const displayName = token.charAt(0).toUpperCase() + token.slice(1);

        const card = document.createElement("div");
        card.className = "item-card hip-card";
        card.innerHTML = `
            <div class="card-image-placeholder">🛒</div>
            <div class="card-info">
                <span class="item-name">${displayName}</span>
                <span class="item-distro">${distributor}</span>
                <div class="card-footer">
                    <span class="item-price">$${price}</span>
                    <span class="add-plus">+</span>
                </div>
            </div>
        `;

        card.onclick = () => {
            const current = traceInput.value.trim();
            traceInput.value = current ? `${current} ${token}` : token;
            if (typeof runTrace === 'function') runTrace(traceInput.value);
            updateCartUI();
        };
        shelf.appendChild(card);
    });
} 

/**
 * Updates the Cart display area to show tokens as styled badges with remove buttons.
 */
function updateCartUI() {
    const traceInput = document.getElementById("trace-input");
    const cartDisplay = document.getElementById("cart-display");
    if (!traceInput || !cartDisplay) return;

    const tokens = traceInput.value.split(/\s+/).filter(t => t.length > 0);

    if (tokens.length === 0) {
        cartDisplay.innerHTML = '<span style="color: #9ca3af; font-style: italic;">Cart is empty.</span>';
        return;
    }

    // Map tokens to badges with an onclick event to remove specific indices
    cartDisplay.innerHTML = tokens.map((t, index) => `
        <span style="background: #ecfdf5; color: #065f46; padding: 3px 10px; border-radius: 12px; border: 1px solid #a7f3d0; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 5px;">
            ${t}
            <b onclick="removeItem(${index})" style="cursor:pointer; color:#059669; font-size: 14px; line-height: 1;">×</b>
        </span>
    `).join("");
}

/**
 * Removes a specific token from the string and re-runs the trace.
 */
/**
 * Removes a specific token from the string and re-runs the trace.
 * This is attached to window so the 'onclick' in the HTML can find it.
 * Keeps it at the window scope
 */
window.removeItem = function(index) {
    const traceInput = document.getElementById("trace-input");
    if (!traceInput) return;

    // 1. Get current tokens as an array
    let tokens = traceInput.value.split(/\s+/).filter(t => t.length > 0);
    
    // 2. Remove the specific item at the clicked index
    tokens.splice(index, 1);
    
    // 3. Update the input field with the remaining tokens
    traceInput.value = tokens.join(" ");
    
    // 4. Trigger the DFA to recalculate the state from Q0
    if (typeof runTrace === 'function') {
        runTrace(traceInput.value);
    }
    
    // 5. Refresh the UI badges
    updateCartUI();
};