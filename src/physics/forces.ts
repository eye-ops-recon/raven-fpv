import type {State, Params, Input} from './types';
import { applyThrottleCurve } from './throttleCurve';

export function netForce(state: State, params: Params, input: Input): number{
    
    const stick = Math.min(1, Math.max(0, input.stick))

    const motorOutput = applyThrottleCurve(stick, params.mid, params.expo);
    const T = params.maxThrust * motorOutput**2;
    const weight = params.gravity * params.mass;

    const AR = calculateAirResistance(state.v, params);
    
    return T - weight - AR;
}

function calculateAirResistance(v: number, params: Params): number{
    const air_resistance = 1/2 * params.rho * params.cd * params.area * v * Math.abs(v);

    return air_resistance;
}

