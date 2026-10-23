import { step } from "./step";
import type {State, Input, Params} from "./types"


export function simulate(start: State, params: Params, inputArray: readonly Input[], dt = 0.01): State[]{
    let state = start;
    const steps = inputArray.length;
    const states: State[] = [];
    states[0] = state;
    
    for(let i = 0; i < steps; i++){
        state = step(state, params, inputArray[i], dt);
        states[i+1] = state;
    }
    return states;
}