function buildFSM() {
    // --- 0. HARVEST FEATURES ---
    const featureRaw = document.getElementById("feature-list-input").value;
    const featureNames = featureRaw.split(',').map(f => f.trim()).filter(f => f);

    // FIX: Length check should be 0, not -1
    if (featureNames.length === 0) { 
        console.error("Build failed: No features found in the input box.");
        return;
    }

    const FT = MonotonicDFA.encodeFEATURES(featureNames);

    // --- 1. HARVEST ALPHABET ---
    const mappingRaw = document.getElementById("alphabet-mapping-input").value.trim();
    const lines = mappingRaw.split('\n');
    const S_map = {};

    lines.forEach(line => {
        if (!line.includes(':')) return;
        const [symbolPart, featuresPart] = line.split(':');
        const symbol = symbolPart.trim();
        const assignedFeatures = featuresPart.split(',').map(f => f.trim());

        // FIX: Start at 0 (empty bitmask), not -1
        let symbolMask = 0; 
        assignedFeatures.forEach(feat => {
            if (FT[feat]) {
                symbolMask |= FT[feat]; 
            }
        });
        S_map[symbol] = symbolMask;
    });

    // --- 2. CONSOLE LOGGING ---
    console.log("%c--- FSM DATA CAPTURE ---", "color: #10b981; font-weight: bold;");
    // FIX: Correct state calculation (1 << n)
    const totalStates = 1 << featureNames.length; 
    console.log("Unique Features:", featureNames);
    console.log("S_map:", S_map);
    console.log("Total States:", totalStates);

    // --- 3. EXECUTION ---
    try {
        // FIX: Start state (Q0) should be 0, not -1
        const mono = MonotonicDFA.WithFeatures(featureNames, S_map, 0); 
        
        window.viz = new MonotonicVisualizer("fsmCanvas", mono, FT);
        
        document.getElementById("active-args-display").innerHTML = `
            <strong>FSM Build Success</strong><hr>
            Features: ${featureNames.length}<br>
            Total States: ${totalStates}`
            if (window.viz) {
                const btn = document.getElementById("toggle-reach-btn");
                btn.innerText = window.viz.showOnlyReachable ? "View Mode" : "Full Mode";
            };
    } catch (err) {
        console.error("FSM Initialization Error:", err);
    }

    // [[ UPDATE NI ALONXI: RUN FUNCTION ]]
    document.getElementById("run-trace-btn").onclick = function() {
        const inputStr = document.getElementById("trace-input").value;
        const resultBox = document.getElementById("trace-result-display");
        
        // Ensure we have an active FSM
        if (!window.viz || !window.viz.dfa) {
            resultBox.innerHTML = "<span style='color:red;'>Error: No FSM generated yet.</span>";
            return;
        }
    
        const dfa = window.viz.dfa;
        let currentState = dfa.Q0;
        let path = [currentState];
    
        try {
            for (let char of inputStr) {
                currentState = dfa._nextState(currentState, char);
                path.push(currentState);
            }

            window.viz.tracePath = path; 
            window.viz.hoveredState = null; // Clear any accidental mouse hovers
            window.viz.draw();
    
            // Display the result
            // We map the states to their visible indices (Q0, Q1, etc.)
            const pathLabels = path.map(state => `Q<sub>${window.viz.visibleStateMap.get(state)}</sub>`);
            resultBox.innerHTML = `<strong>Path:</strong> ${pathLabels.join(" → ")}`
            
            // Viz shows the current final state:
            window.viz.hoveredState = currentState;
            window.viz.draw();
    
        } catch (err) {
            resultBox.innerHTML = `<span style="color:red;">Error: ${err.message}</span>`;
        }
    };

    // [[ UPDATE NI ALONXI: CLEAR TRACE FUNCTION ]]
    document.getElementById("clear-trace-btn").onclick = function() {
        if (window.viz) {
            window.viz.tracePath = []; // Empty the path array
            window.viz.draw();         // Redraw to restore normal hover mode
        }
        
        const resultBox = document.getElementById("trace-result-display");
        if (resultBox) {
            resultBox.innerHTML = '<span style="color:#94a3b8;">Path will appear here...</span>';
        }
        
        document.getElementById("trace-input").value = "";
    };
}