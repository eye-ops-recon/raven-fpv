import type {State, Params, Input} from './types';
import { netForce } from './forces';

export function step(state: State, params: Params, input: Input, dt: number): State {

    const f_net = netForce(state, params, input);
    const a = f_net / params.mass

    const v_next = state.v + dt * a;
    const z_next = (state.z + v_next * dt);    //semi-implicit Euler
    return ({v: v_next, z: z_next});
}