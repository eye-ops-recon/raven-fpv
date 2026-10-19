import type {State, Params, Input} from './types';
import { netForce } from './forces';
import { firstOrderLag } from '../math/firstOrderLag';
import { motorCommand } from '../physics/throttleCurve';

export function step(state: State, params: Params, input: Input, dt: number): State {
    
    const uTarget = motorCommand(params, input);
    const uNext = firstOrderLag(state.motor, uTarget, params.motorTau, dt); // exact first-order lag (M2)

    const motorUpdatedState = {...state, motor: uNext}; // force uses the updated motor (same idea as semi-implicit Euler)
    const fNet = netForce(motorUpdatedState, params);
    const a = fNet / params.mass;

    const vNext = state.v + dt * a;
    const zNext = (state.z + vNext * dt);    //semi-implicit Euler
    return {v: vNext, z: zNext, motor: uNext};
}