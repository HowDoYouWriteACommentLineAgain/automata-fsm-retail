class MonotonicVisualizer {
  constructor(canvasId, monotonicDfa, featureMap) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.dfa = monotonicDfa;
    this.FT = featureMap; // The encodeFEATURES object
    
    this.showOnlyReachable = true;
    this.hoveredState = null;
    this.mousePos = { x: 0, y: 0 };
    
    this.padding = 80;
    this.nodeRadius = 24;
    this.stateCoords = new Map();

    // Color palette for symbols
    this.symbolColors = {
      b: '#3b82f6', // Blue (Fiber)
      o: '#f97316', // Orange (Carbs/Fiber)
      a: '#eab308', // Amber (Carbs)
      r: '#ef4444', // Red (Protein)
      default: '#94a3b8'
    };

    this.initEvents();
    this.resize();
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      // Check if hovering over a node
      this.hoveredState = null;
      for (const [state, pos] of this.stateCoords) {
        const dist = Math.hypot(pos.x - this.mousePos.x, pos.y - this.mousePos.y);
        if (dist < this.nodeRadius) {
          this.hoveredState = state;
          break;
        }
      }
      this.draw();
    });
  }

  toggleReachability() {
    this.showOnlyReachable = !this.showOnlyReachable;
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
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.draw();
  }

  draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.stateCoords.clear();

    const activeStates = this.showOnlyReachable 
      ? Array.from(this.getReachableStates()) 
      : this.dfa.Q;

    const layers = {};
    activeStates.forEach(state => {
      const bitCount = state.toString(2).split('1').length - 1;
      if (!layers[bitCount]) layers[bitCount] = [];
      layers[bitCount].push(state);
    });

    const layerKeys = Object.keys(layers).sort((a, b) => a - b);
    
    layerKeys.forEach((level, lIdx) => {
      const statesInLayer = layers[level];
      const xStep = width / (statesInLayer.length + 1);
      const y = this.padding + (lIdx * (height - 2 * this.padding) / Math.max(1, layerKeys.length - 1));
      statesInLayer.forEach((state, sIdx) => {
        this.stateCoords.set(state, { x: xStep * (sIdx + 1), y });
      });
    });

    // Draw Arrows
    const symbols = Object.keys(this.dfa.S_map);
    for (const state of activeStates) {
      const startPos = this.stateCoords.get(state);
      for (const char of symbols) {
        const nextState = this.dfa._nextState(state, char);
        const endPos = this.stateCoords.get(nextState);
        if (endPos && nextState !== state) {
          const color = this.symbolColors[char] || this.symbolColors.default;
          const isJumping = Math.abs(endPos.y - startPos.y) > 120;
          this.drawCurvedArrow(startPos, endPos, isJumping, color);
        }
      }
    }

    // Draw Nodes
    this.stateCoords.forEach((pos, state) => {
      const isFinal = this.dfa.F.includes(state);
      const isHovered = this.hoveredState === state;
      this.drawNode(pos, state, isFinal, isHovered);
    });

    // Draw Tooltip for Hover
    if (this.hoveredState !== null) {
      this.drawTooltip();
    }
  }

  drawCurvedArrow(from, to, isLongJump, color) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const dist = Math.sqrt((to.x - from.x)**2 + (to.y - from.y)**2);
    const startX = from.x + this.nodeRadius * Math.cos(angle);
    const startY = from.y + this.nodeRadius * Math.sin(angle);
    const endX = to.x - this.nodeRadius * Math.cos(angle);
    const endY = to.y - this.nodeRadius * Math.sin(angle);

    this.ctx.beginPath();
    this.ctx.strokeStyle = color;
    this.ctx.globalAlpha = 0.6;
    this.ctx.lineWidth = isLongJump ? 1 : 2;
    this.ctx.moveTo(startX, startY);

    if (isLongJump) {
      const cpX = (startX + endX) / 2 + (dist * 0.2); 
      const cpY = (startY + endY) / 2;
      this.ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    } else {
      this.ctx.lineTo(endX, endY);
    }
    this.ctx.stroke();
    this.ctx.globalAlpha = 1.0;

    // Arrowhead
    this.ctx.fillStyle = color;
    this.ctx.save();
    this.ctx.translate(endX, endY);
    this.ctx.rotate(isLongJump ? angle + 0.1 : angle); // Slight adjust for curve
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(-8, -4);
    this.ctx.lineTo(-8, 4);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawNode(pos, state, isFinal, isHovered) {
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, this.nodeRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = isHovered ? '#f1f5f9' : '#fff';
    this.ctx.strokeStyle = isHovered ? '#3b82f6' : '#1e293b';
    this.ctx.lineWidth = 2;
    this.ctx.fill();
    this.ctx.stroke();

    // Double Circle for Final State
    if (isFinal) {
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.nodeRadius - 4, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = '#1e293b';
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(state, pos.x, pos.y + 4);
  }

  drawTooltip() {
    const features = MonotonicDFA.decodeFEATURES(this.hoveredState, this.FT);
    const txt = features.length > 0 ? features.join(' + ') : "Start (0)";
    this.ctx.font = "12px sans-serif";
    const w = this.ctx.measureText(txt).width;
    
    this.ctx.fillStyle = "rgba(0,0,0,0.8)";
    this.ctx.fillRect(this.mousePos.x + 10, this.mousePos.y - 30, w + 20, 25);
    this.ctx.fillStyle = "#fff";
    this.ctx.fillText(txt, this.mousePos.x + 20 + w/2, this.mousePos.y - 13);
  }
}
