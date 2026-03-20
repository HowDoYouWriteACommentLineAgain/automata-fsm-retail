class MonotonicVisualizer {
  constructor(canvasId, monotonicDfa, featureMap) {
    this.canvas = document.getElementById(canvasId);
    this.container = this.canvas.parentElement;
    this.ctx = this.canvas.getContext("2d");
    this.dfa = monotonicDfa;
    this.FT = featureMap;

    this.showOnlyReachable = true;
    this.hoveredState = null;
    this.mousePos = { x: 0, y: 0 };

    this.padding = 40;
    this.nodeRadius = 24;
    this.stateCoords = new Map();
    this.visibleStateMap = new Map();

    this.showSelfLoops = true;

    // Trace state (new)
    this.traceSteps = [];
    this.traceActive = false;

    // Auto-assign colors to symbols from a palette
    this._colorPalette = [
      "#6366f1",
      "#f97316",
      "#10b981",
      "#ef4444",
      "#eab308",
      "#8b5cf6",
      "#06b6d4",
      "#f43f5e",
      "#84cc16",
      "#fb923c",
    ];
    this._symbolColorMap = {};

    this.initEvents();
    setTimeout(() => this.resize(), 0);
  }

  getSymbolColor(sym) {
    if (!this._symbolColorMap[sym]) {
      const idx =
        Object.keys(this._symbolColorMap).length % this._colorPalette.length;
      this._symbolColorMap[sym] = this._colorPalette[idx];
    }
    return this._symbolColorMap[sym];
  }

  // Called by the trace panel on every keystroke
  setTrace(traceSteps) {
    this.traceSteps = traceSteps;
    this.traceActive = traceSteps.length > 0;
    this.draw();
  }

  clearTrace() {
    this.traceSteps = [];
    this.traceActive = false;
    this.draw();
  }

  initEvents() {
    const ro = new ResizeObserver(() => this.resize());
    if (this.container) ro.observe(this.container);

    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mousePos = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };

      this.hoveredState = null;
      for (const [state, pos] of this.stateCoords) {
        const dist = Math.hypot(
          pos.x - this.mousePos.x,
          pos.y - this.mousePos.y,
        );
        if (dist < this.nodeRadius) {
          this.hoveredState = state;
          break;
        }
      }
      this.draw();
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.hoveredState = null;
      this.draw();
    });
  }

  toggleReachability() {
    this.showOnlyReachable = !this.showOnlyReachable;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.draw();
  }

  toggleSelfLoops() {
    this.showSelfLoops = !this.showSelfLoops;
    this.draw();
  }

  getReachableStates() {
    const reachable = new Set([this.dfa.Q0]);
    const queue = [this.dfa.Q0];
    const symbols = Object.keys(this.dfa.S_map);
    while (queue.length > 0) {
      const curr = queue.shift();
      for (const char of symbols) {
        const next = this.dfa._nextState(curr, char);
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }
    return reachable;
  }

  resize() {
    if (!this.container) return;
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
    this.draw();
  }

  draw() {
    const { width, height } = this.canvas;
    if (width === 0 || height === 0) return;

    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, width, height);

    this.stateCoords.clear();
    this.visibleStateMap.clear();

    const activeStates = this.showOnlyReachable
      ? Array.from(this.getReachableStates()).sort((a, b) => a - b)
      : [...this.dfa.Q].sort((a, b) => a - b);

    activeStates.forEach((state, index) => {
      this.visibleStateMap.set(state, index);
    });

    const layers = {};
    activeStates.forEach((state) => {
      const bitCount = state.toString(2).split("1").length - 1;
      if (!layers[bitCount]) layers[bitCount] = [];
      layers[bitCount].push(state);
    });

    const layerKeys = Object.keys(layers).sort((a, b) => a - b);
    const nodeYPadding = 60;

    layerKeys.forEach((level, lIdx) => {
      const statesInLayer = layers[level];
      const xStep = width / (statesInLayer.length + 1);
      const y =
        nodeYPadding +
        (lIdx * (height - 3 * nodeYPadding)) /
          Math.max(1, layerKeys.length - 1);
      statesInLayer.forEach((state, sIdx) => {
        this.stateCoords.set(state, { x: xStep * (sIdx + 1), y });
      });
    });

    const symbols = Object.keys(this.dfa.S_map);

    // Build trace sets for highlighting
    const traceStateSet = new Set();
    const traceEdgeSet = new Set(); // "fromState:token:toState"
    let currentTraceState = null;

    if (this.traceActive && this.traceSteps.length > 0) {
      this.traceSteps.forEach((step, i) => {
        traceStateSet.add(step.state);
        if (i > 0 && !step.unknown) {
          const prev = this.traceSteps[i - 1];
          traceEdgeSet.add(`${prev.state}:${step.token}:${step.state}`);
        }
      });
      currentTraceState = this.traceSteps[this.traceSteps.length - 1].state;
    }

    // Hover neighbors
    const neighbors = new Set();
    if (this.hoveredState !== null) {
      symbols.forEach((char) =>
        neighbors.add(this.dfa._nextState(this.hoveredState, char)),
      );
    }

    // Draw arrows
    for (const state of activeStates) {
      const startPos = this.stateCoords.get(state);
      if (!startPos) continue;
      for (const char of symbols) {
        // Inside your draw() loop for (const char of symbols)
        const nextState = this.dfa._nextState(state, char);
        const endPos = this.stateCoords.get(nextState);

        // Inside your draw() loop:
        if (nextState === state && startPos) {
            // Only draw if the toggle is ON
            if (this.showSelfLoops) {
                const charIndex = symbols.indexOf(char);
                const edgeKey = `${state}:${char}:${nextState}`;
                const isTraceEdge = traceEdgeSet.has(edgeKey);
                
                // (Keep your existing alpha/highlight logic here)
                if (this.traceActive) {
                    this.ctx.globalAlpha = isTraceEdge ? 0.95 : 0.04;
                } else if (this.hoveredState !== null) {
                    // ONLY highlight if this specific state is the one hovered
                    // This prevents "neighbor" highlighting from triggering self-loops
                    this.ctx.globalAlpha = (state === this.hoveredState) ? 0.9 : 0.05;
                } else {
                    this.ctx.globalAlpha = 0.4;
                }            

                this.drawSelfLoop(startPos, this.getSymbolColor(char), charIndex, isTraceEdge ? 2.5 : 1.5);
              }
            continue; // Always continue so it doesn't try to draw a regular arrow to itself
        }

        const edgeKey = `${state}:${char}:${nextState}`;
        const isTraceEdge = traceEdgeSet.has(edgeKey);
        const color = this.getSymbolColor(char);

        if (this.traceActive) {
          this.ctx.globalAlpha = isTraceEdge ? 0.95 : 0.04;
        } else if (this.hoveredState !== null) {
          this.ctx.globalAlpha = state === this.hoveredState ? 0.9 : 0.05;
        } else {
          this.ctx.globalAlpha = 0.4;
        }

        const isJumping = Math.abs(endPos.y - startPos.y) > 120;
        this.drawCurvedArrow(
          startPos,
          endPos,
          isJumping,
          color,
          isTraceEdge ? 2.5 : 1.5,
        );
      }
    }

    // Draw nodes
    this.stateCoords.forEach((pos, state) => {
      const isFinal = this.dfa.F.includes(state);
      const isHovered = this.hoveredState === state;
      const isNeighbor = neighbors.has(state);
      const isTraceState = traceStateSet.has(state);
      const isCurrent = state === currentTraceState;

      if (this.traceActive) {
        this.ctx.globalAlpha = isTraceState ? 1.0 : 0.1;
      } else {
        this.ctx.globalAlpha =
          this.hoveredState === null || isHovered || isNeighbor ? 1.0 : 0.1;
      }

      const seqIndex = this.visibleStateMap.get(state);
      this.drawNode(pos, seqIndex, isFinal, isHovered, isCurrent);
    });

    this.ctx.globalAlpha = 1.0;
    if (this.hoveredState !== null) this.drawTooltip();
    this.drawAlphabetLegend();
    if (this.traceActive) this.drawTraceReadout(currentTraceState);
  }

  drawNode(pos, index, isFinal, isHovered, isCurrent = false) {
    const r = this.nodeRadius;

    // Glow ring for current trace state
    if (isCurrent) {
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, r + 7, 0, Math.PI * 2);
      this.ctx.strokeStyle = "rgba(37,99,235,0.25)";
      this.ctx.lineWidth = 5;
      this.ctx.stroke();
    }

    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    this.ctx.fillStyle = isCurrent
      ? "#eff6ff"
      : isHovered
        ? "#f1f5f9"
        : "#ffffff";
    this.ctx.strokeStyle = isCurrent
      ? "#2563eb"
      : isHovered
        ? "#3b82f6"
        : "#1e293b";
    this.ctx.lineWidth = isCurrent ? 2.5 : isHovered ? 2 : 1.5;
    this.ctx.fill();
    this.ctx.stroke();

    if (isFinal) {
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, r - 4, 0, Math.PI * 2);
      this.ctx.strokeStyle = isCurrent ? "#2563eb" : "#1e293b";
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    // Q subscript label (your updated style)
    this.ctx.fillStyle = isCurrent ? "#1d4ed8" : "#1e293b";
    this.ctx.textAlign = "center";
    this.ctx.font = `bold 14px serif`;
    const qWidth = this.ctx.measureText("Q").width;
    this.ctx.fillText("Q", pos.x - 4, pos.y + 4);
    this.ctx.font = "bold 9px serif";
    this.ctx.fillText(index, pos.x + qWidth / 2 + 2, pos.y + 8);
  }

  drawCurvedArrow(from, to, isLongJump, color, lineWidth = 1.5) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
    const startX = from.x + this.nodeRadius * Math.cos(angle);
    const startY = from.y + this.nodeRadius * Math.sin(angle);
    const endX = to.x - (this.nodeRadius + 5) * Math.cos(angle);
    const endY = to.y - (this.nodeRadius + 5) * Math.sin(angle);

    this.ctx.beginPath();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.moveTo(startX, startY);

    if (isLongJump) {
      const cpX = (startX + endX) / 2 + dist * 0.2;
      const cpY = (startY + endY) / 2;
      this.ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    } else {
      this.ctx.lineTo(endX, endY);
    }
    this.ctx.stroke();

    this.ctx.fillStyle = color;
    this.ctx.save();
    this.ctx.translate(endX, endY);
    this.ctx.rotate(isLongJump ? angle + 0.1 : angle);
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(-8, -4);
    this.ctx.lineTo(-8, 4);
    this.ctx.fill();
    this.ctx.restore();
  }

drawSelfLoop(pos, color, charIndex, lineWidth = 1.5) {
  const r = this.nodeRadius;
  const ctx = this.ctx;

  ctx.save();

  // 1. DYNAMIC ANGLE S
  // We shift the entire "base" of the loop based on the index
  // so they don't sit on top of each other.
  const spacing = 0.3; // Radians between loops
  const centerA = -Math.PI / 2 + (charIndex - 1) * spacing;
  const startA = centerA - 0.2;
  const endA = centerA + spacing;

  // 2. ANCHOR POINTS
  const startX = pos.x + r * Math.cos(startA);
  const startY = pos.y + r * Math.sin(startA);
  
  // Target is the actual circle, End is where the arrow stops (gap)
  const gap = 5;
  const targetX = pos.x + r * Math.cos(endA);
  const targetY = pos.y + r * Math.sin(endA);
  const endX = pos.x + (r + gap) * Math.cos(endA);
  const endY = pos.y + (r + gap) * Math.sin(endA);

  // 3. CIRCULAR CONTROL POINTS
  // To get a circular look, the "handles" need to be quite long
  // and perpendicular to the exit/entry angles.
  const loopSize = 20; 
  const cp1x = startX + loopSize * Math.cos(startA);
  const cp1y = startY + loopSize * Math.sin(startA);
  const cp2x = endX + loopSize * Math.cos(endA);
  const cp2y = endY + loopSize * Math.sin(endA);

  // ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
  ctx.stroke();

  // 4. ARROWHEAD
  // Points directly toward the center of the node from the gap
  const arrowAngle = Math.atan2(targetY - cp2y, targetX - cp2x);
  ctx.fillStyle = color;
  ctx.translate(endX, endY);
  ctx.rotate(arrowAngle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-8, -4);
  ctx.lineTo(-8, 4);
  ctx.fill();
  ctx.restore();
}

  drawAlphabetLegend() {
    const symbols = Object.keys(this.dfa.S_map);
    const bottomPadding = 45;
    let x = 20;
    const y = this.canvas.height - bottomPadding;

    symbols.forEach((char) => {
      const color = this.getSymbolColor(char);
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y - 12, 12, 12);
      this.ctx.fillStyle = "#4b5563";
      this.ctx.font = "11px monospace";
      this.ctx.textAlign = "left";
      this.ctx.fillText(`${char}`, x + 18, y - 2);
      x += this.ctx.measureText(char).width + 36;
    });
  }

  drawTooltip() {
    const features = MonotonicDFA.decodeFEATURES(this.hoveredState, this.FT);
    const txt = features.length > 0 ? features.join(" + ") : "Start (0)";
    this.ctx.font = "12px monospace";
    const w = this.ctx.measureText(txt).width;

    let tx = this.mousePos.x + 12;
    let ty = this.mousePos.y - 36;
    if (tx + w + 20 > this.canvas.width) tx = this.mousePos.x - w - 32;
    if (ty < 8) ty = this.mousePos.y + 12;

    this.ctx.fillStyle = "rgba(239,246,255,0.97)";
    this.ctx.strokeStyle = "#bfdbfe";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(tx, ty, w + 20, 26, 5);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = "#1d4ed8";
    this.ctx.textAlign = "left";
    this.ctx.fillText(txt, tx + 10, ty + 17);
  }

  drawTraceReadout(currentState) {
    if (currentState === null || currentState === undefined) return;
    const features = MonotonicDFA.decodeFEATURES(currentState, this.FT);
    const lines = features.length > 0 ? features : ["∅ (no features)"];

    const pad = 12;
    const lineH = 17;
    const boxW = 190;
    const boxH = pad * 2 + lineH * (lines.length + 2);
    const bx = this.canvas.width - boxW - pad;
    const by = pad;

    this.ctx.fillStyle = "rgba(15,23,42,0.88)";
    this.ctx.strokeStyle = "#94a3b8";
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.roundRect(bx, by, boxW, boxH, 7);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.textAlign = "left";
    this.ctx.fillStyle = "#93c5fd";
    this.ctx.font = "500 11px monospace";
    this.ctx.fillText(`state: ${currentState}`, bx + pad, by + pad + 2);

    this.ctx.fillStyle = "#94a3b8";
    this.ctx.font = "10px monospace";
    this.ctx.fillText("features active:", bx + pad, by + pad + lineH + 2);

    lines.forEach((f, i) => {
      this.ctx.fillStyle = "#e2e8f0";
      this.ctx.font = "11px monospace";
      this.ctx.fillText(`· ${f}`, bx + pad, by + pad + lineH * (2 + i) + 2);
    });
  }
}
