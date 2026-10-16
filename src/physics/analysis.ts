import { netForce } from './forces';
import type {Params, Input} from './types';
 

export function terminalVelocity(params : Params, input: Input): number{
    const F = netForce({v: 0, z: 0}, params, input);
    const k= 1/2 * params.cd * params.area * params.rho
    return Math.sign(F) * Math.sqrt(Math.abs(F) / k);
}

export function motorHoverOutput(params: Params): number{
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

