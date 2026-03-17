
  // 1. Initialize the UI (Draggable/Minimize behavior)
  // Note: Pass empty arrays because we are going to drive data from the DOM instead
  if (typeof initUIExtensions === "function") {
    initUIExtensions([], {}); 
  }

  /**
   * THE SUBMISSION METHOD
   * This gathers data from your panel rows and executes your working logic.
   */
  function submitFromPanels() {
    const food = document.getElementById("food-input").value.trim() || "boar";
    const rows = document.querySelectorAll(".feature-row");
    
    const featureNames = [];
    const mappingData = [];

    // Gather what the user typed in the panels
    rows.forEach(row => {
      const name = row.querySelector(".feat-name").value.trim();
      const key = row.querySelector(".feat-key").value.trim();
      if (name && key) {
        featureNames.push(name);
        mappingData.push({ key, name });
      }
    });

    if (featureNames.length === 0) return;

    // YOUR EXACT LOGIC (Now dynamic)
    const FT = MonotonicDFA.encodeFEATURES(featureNames);

    const S_map = {};
    mappingData.forEach(item => {
      const bitmask = FT[item.name];
      // Bitwise OR to allow multiple features per key (e.g., 'b' = fiber | 100 pesos)
      S_map[item.key] = (S_map[item.key] || 0) | bitmask;
    });

    // Initialize Engine and Visualizer
    const mono = MonotonicDFA.WithFeatures(featureNames, S_map, 0);
    window.viz = new MonotonicVisualizer("fsmCanvas", mono, FT);
  }

  /**
   * HELPER: Add a row to the UI panel
   */
  function addRow(name, key) {
    const list = document.getElementById("ui-feature-list");
    if (!list) return;
    const div = document.createElement("div");
    div.className = "feature-row";
    div.style = "display: flex; gap: 5px; margin-bottom: 8px;";
    div.innerHTML = `
      <input type="text" value="${name}" class="feat-name" placeholder="fiber">
      <input type="text" value="${key}" class="feat-key" placeholder="b" style="width: 40px;">
    `;
    list.appendChild(div);
  }

  // --- INITIAL SETUP ---
  
  // 1. Set the default Food
  document.getElementById("food-input").value = "boar";

  // 2. Populate the default rows in the panel
  addRow("fiber", "b");
  addRow("carbohydrates", "o");
  addRow("protien", "r");
  addRow("mt_100_Pesos", "a");

  // 3. Link the Generate button to our new method
  const genBtn = document.getElementById("generate-fsm-btn");
  if (genBtn) {
    genBtn.onclick = submitFromPanels;
  }

  // 4. Initial Run
  submitFromPanels();
