import { motorCommand } from '../physics/throttleCurve';
import { airForce } from './forces';
import type {State, Params, Input} from './types';
 

export function terminalVelocity(params : Params, input: Input): number{
    const uTarget = motorCommand(params, input);
    const F = airForce({v: 0, z: 0, motor: uTarget}, params);
    const k = 1/2 * params.cd * params.area * params.rho;
    return Math.sign(F) * Math.sqrt(Math.abs(F) / k);
}

export function motorOutputAtHover(params: Params): number{
    // TWR =  Thrust Weight Ratio : Max Thrust / Weight
    // For hover: mg = T
    // T = Max Thrust * u^2
    // Equalize T:     mg = Max Thrust * u^2   devide both sides with Max Thrust =>  mg / Max Thrust = u^2
    // 1 / TWR = u^2
    // u = √(mg / Max Thrust)

    const weight: number = params.mass * params.gravity;
    const u: number = Math.sqrt(weight / params.maxThrust);
    return u;
}

export function takeoffDelay(state: State, params: Params, input: Input): number{
    // Time required for takeoff
    // Velocity in state must be 0 check

    // The exact motor output required for take off is hover motor output
    // f(u) = current + (target - current) * (1 - e^(-t/τ))
    // 1 - (u - current) / (target - current)  = e^(-t/τ)
    // t = -τ * ln(1 - (u - current) / (target - current))

    const uHover = motorOutputAtHover(params);
    const target = motorCommand(params, input);
    const body = 1 - (uHover - state.motor) / (target - state.motor);

    if(target <= uHover){
        return Infinity;
    }
    if(state.motor > uHover){
        return 0;
    }
    return -params.motorTau * Math.log(body);
}
