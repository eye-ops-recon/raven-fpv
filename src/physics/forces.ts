import type {State, Params} from './types';

export function netForce(state: State, params: Params): number{
    
    const T = params.maxThrust * state.motor**2;
    const weight = params.gravity * params.mass;

    const AR = calculateAirResistance(state.v, params);
    
    return T - weight - AR;
}

function calculateAirResistance(v: number, params: Params): number{
    const airResistance = 1/2 * params.rho * params.cd * params.area * v * Math.abs(v);

    return airResistance;
}

