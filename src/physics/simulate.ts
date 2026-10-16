import { step } from "./step";
import type {State, Input, Params} from "./types"


export function simulate(start: State, params: Params, input: Input, duration: number, dt = 0.01): State{
    let state = start;
    const steps = duration / dt;

    for(let i = 0; i < steps; i++){
        state = step(state, params, input, dt);
    }

    return state;
}