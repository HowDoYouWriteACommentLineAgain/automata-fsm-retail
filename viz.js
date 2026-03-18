class MonotonicVisualizer {
  constructor(canvasId, monotonicDfa, featureMap) {
    this.canvas = document.getElementById(canvasId);
    this.container = this.canvas.parentElement; 
    this.ctx = this.canvas.getContext('2d');
    this.dfa = monotonicDfa;
    this.FT = featureMap;
    
    this.showOnlyReachable = true;
    this.hoveredState = null;
    this.mousePos = { x: 0, y: 0 };
    
    this.padding = 40;
    this.nodeRadius = 24;
    this.stateCoords = new Map();

    // ALONXI UPDATE! Tracepath so it can apply to the Main Viz aswell
    this.tracePath = [];

    this.symbolColors = {
      b: '#3b82f6', o: '#f97316', a: '#eab308', r: '#ef4444', default: '#94a3b8'
    };

    this.initEvents();
    setTimeout(() => this.resize(), 0);
  }

  initEvents() {
    const ro = new ResizeObserver(() => this.resize());
    if (this.container) ro.observe(this.container);
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      
      //NORMALIZE MOUSE POSITION TO PREVNT CUMULATIVE DRIFTING
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mousePos = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };

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
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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

    // Determine active states
    const activeStates = this.showOnlyReachable 
      ? Array.from(this.getReachableStates()).sort((a, b) => a - b) 
      : [...this.dfa.Q].sort((a, b) => a - b);

    this.visibleStateMap = new Map();
    activeStates.forEach((state, index) => {
      this.visibleStateMap.set(state, index);
    });

    const layers = {};
    activeStates.forEach(state => {
      const bitCount = state.toString(2).split('1').length - 1;
      if (!layers[bitCount]) layers[bitCount] = [];
      layers[bitCount].push(state);
    });

    const layerKeys = Object.keys(layers).sort((a, b) => a - b);
    
    // ADJUSTED: Padding for nodes is increased to move them up
    // previous: this.padding = 40;
    const nodeYPadding = 60; 

    layerKeys.forEach((level, lIdx) => {
      const statesInLayer = layers[level];
      const xStep = width / (statesInLayer.length + 1);
      // Nodes are now compressed vertically, giving more space at the bottom
      const y = nodeYPadding + (lIdx * (height - 3 * nodeYPadding) / Math.max(1, layerKeys.length - 1));
      statesInLayer.forEach((state, sIdx) => {
        this.stateCoords.set(state, { x: xStep * (sIdx + 1), y });
      });
    });

    const symbols = Object.keys(this.dfa.S_map);

    // Identify Neighbors for highlighting
    const neighbors = new Set();
    if (this.hoveredState !== null) {
      symbols.forEach(char => {
        neighbors.add(this.dfa._nextState(this.hoveredState, char));
      });
    }

    // [[ UPDATE NI ALONXI: DRAW ARROWS & DRAW NODES. NOTE: FIXED BY GEMINI SO PROPER PATHS WOULD TRACE ]]

    // Draw Arrows
    for (const state of activeStates) {
      const startPos = this.stateCoords.get(state);
      for (const char of symbols) {
        const nextState = this.dfa._nextState(state, char);
        const endPos = this.stateCoords.get(nextState);
        
        if (endPos && nextState !== state) {
          // --- HIGHLIGHT LOGIC START ---
          const isPathTransition = this.tracePath.includes(state) && 
                                   this.tracePath[this.tracePath.indexOf(state) + 1] === nextState;
          
          if (this.tracePath.length > 0) {
            // If tracing, only show arrows in the path
            this.ctx.globalAlpha = isPathTransition ? 1.0 : 0.05;
          } else if (this.hoveredState !== null) {
            // Fallback to hover logic
            this.ctx.globalAlpha = (state === this.hoveredState) ? 0.9 : 0.05;
          } else {
            this.ctx.globalAlpha = 0.4;
          }
          // --- HIGHLIGHT LOGIC END ---

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
      const isNeighbor = neighbors.has(state);
      const isInPath = this.tracePath.includes(state);

      // --- ALPHA LOGIC ---
      if (this.tracePath.length > 0) {
        // While tracing, only highlight path nodes (and current hover)
        this.ctx.globalAlpha = (isInPath || isHovered) ? 1.0 : 0.1;
      } else {
        // Normal mode
        this.ctx.globalAlpha = (this.hoveredState === null || isHovered || isNeighbor) ? 1.0 : 0.1;
      }
      
      const sequentialIndex = this.visibleStateMap.get(state);
      this.drawNode(pos, sequentialIndex, isFinal, isHovered);
    });

    this.ctx.globalAlpha = 1.0;
    if (this.hoveredState !== null) this.drawTooltip();
    
    // Legend now uses its own defined padding, separate from nodes
    this.drawAlphabetLegend();
  }

  // --- MODIFIED LEGEND AND NODE DRAWING FOR SPACING ---

  drawNode(pos, index, isFinal, isHovered) {
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, this.nodeRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = isHovered ? '#f1f5f9' : '#fff';
    this.ctx.strokeStyle = isHovered ? '#3b82f6' : '#1e293b';
    this.ctx.lineWidth = isHovered ? 3 : 2;
    this.ctx.fill();
    this.ctx.stroke();

    if (isFinal) {
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.nodeRadius - 4, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // RENDER Q_subscript
    this.ctx.fillStyle = '#1e293b';
    this.ctx.textAlign = 'center';
    
    // Draw the "Q"
    this.ctx.font = 'bold 14px serif';
    const qWidth = this.ctx.measureText('Q').width;
    this.ctx.fillText('Q', pos.x - 4, pos.y + 4);
    
    // Draw the Index as Subscript
    this.ctx.font = 'bold 9px serif';
    this.ctx.fillText(index, pos.x + (qWidth/2) + 2, pos.y + 8);
  }

  drawAlphabetLegend() {
    const symbols = Object.keys(this.dfa.S_map);
    // ADJUSTED: Increase bottom padding for the legend
    const bottomPadding = 45; // previous: 20
    const xOffset = 20; 
    let x = xOffset;
    let y = this.canvas.height - bottomPadding;

    symbols.forEach((char) => {
      const color = this.symbolColors[char] || this.symbolColors.default;
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y - 12, 12, 12);
      this.ctx.fillStyle = "#4b5563";
      this.ctx.font = "12px monospace";
      this.ctx.textAlign = "left";
      this.ctx.fillText(`Symbol: ${char}`, x + 18, y - 2);
      x += 100;
    });
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
  
  drawTooltip() {
    const features = MonotonicDFA.decodeFEATURES(this.hoveredState, this.FT);
    const txt = features.length > 0 ? features.join(' + ') : "Start (0)";
    this.ctx.font = "12px sans-serif";
    const w = this.ctx.measureText(txt).width;
    
    this.ctx.fillStyle = "rgba(0,0,0,0.8)";
    this.ctx.fillRect(this.mousePos.x + 10, this.mousePos.y - 30, w + 20, 25);
    this.ctx.fillStyle = "#fff";
    this.ctx.textAlign = "center";
    this.ctx.fillText(txt, this.mousePos.x + 20 + w/2, this.mousePos.y - 13);
  }
}