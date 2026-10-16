import {step} from './physics/step';
import type { State} from './physics/types';
import { defaultParams } from './physics/defaultParams';

const dt = 0.1;
const params = defaultParams;

const weight = params.gravity * params.mass;
const throttle = 2* weight / params.maxThrust;
let state: State = {v: 0, z: 10};



for(let i = 0; i < 2 / dt; i++){
    state = step(state, params, {stick: throttle}, dt);
}   

const ok = Math.abs(state.z - 10) < 1e-9 && Math.abs(state.v - 0) < 1e-9;

console.log("Throttle Test", state.v, state.z, throttle);


