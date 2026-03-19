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
