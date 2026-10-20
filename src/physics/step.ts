import type {State, Params, Input} from './types';
import { airForce } from './forces';
import { firstOrderLag } from '../math/firstOrderLag';
import { motorCommand } from './throttleCurve';
import { applyGroundConstraint, normalForce } from './ground';

export function step(state: State, params: Params, input: Input, dt: number): State {
    
    const uTarget = motorCommand(params, input);
    const uNext = firstOrderLag(state.motor, uTarget, params.motorTau, dt); // exact first-order lag (M2)

    const motorUpdatedState = {...state, motor: uNext}; // force uses the updated motor (same idea as semi-implicit Euler)
    const fAir = airForce(motorUpdatedState, params);
    const N = normalForce(motorUpdatedState, fAir);
    const a = (fAir + N) / params.mass;

    const vNext = state.v + dt * a;
    const zNext = (state.z + vNext * dt);    //semi-implicit Euler
    return applyGroundConstraint({v: vNext, z: zNext, motor: uNext});
}
