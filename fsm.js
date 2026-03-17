class DFA{
  constructor(Q,S,d,Q0 = null,F = null){
    this.Q = Q;
    this.S = S;
    this.Q0 = Q0 || Q[0];
    this.d = d;
    this.F = F || [...Q];
  };
  // currState = null;

  _nextState(state, input){
    if(!this.S.includes(input)) throw new Error(`DFA VIOLATION: input was not defined in S: ${input}`);
    if(!this.Q.includes(state)) throw new Error(`DFA VIOLATION: state was not defined in Q: ${state}`);

    const row = this.Q.indexOf(state);
    const col = this.S.indexOf(input)
    const next = this.d[row][col];
    return next;
  }

  _evaluate(word){
    let currState = this.Q0;
    for(let i = 0; i<word.length; i++)
      currState = this._nextState(currState, word[i]); 
    return {
      final: currState, 
      isAccepted: this.F.includes(currState)
    };
  }

  getFinalStateOf(word){
    return this._evaluate(word).final;
  }
}

class MonotonicDFA extends DFA {
  constructor(Q, S_map, Q0 = 0, F = null) {
    super(Q, Object.keys(S_map), null, Q0, F);
    this.S_map = S_map;
  }

  static WithFeatures(features, S_map, Q0 = 0, F = null) {
    const Q = [];
    const n = features.length;
    for (let i = 0; i < (1 << n); i++) Q.push(i);
    return new this(Q, S_map, Q0, F);
  }

  // Override to use bitwise logic instead of the matrix in base DFA
  _nextState(state, input) {
    // Use the array S (from base class) to validate input
    if (!this.S.includes(input)) {
        throw new Error(`symbol ${input} not in alphabet`);
    }
    return state | this.S_map[input];
  }
  
  // Static helpers remain the same...
  static encodeFEATURES(features){
    const FEATURES = {};
    for(let i = 0; i < features.length; i++)
      FEATURES[features[i]] = 1<<i;
    return FEATURES;
  }

  // ENSURE THIS METHOD IS HERE
  static decodeFEATURES(state, FT) {
    return Object.keys(FT).filter(f => state & FT[f]);
  }
}
