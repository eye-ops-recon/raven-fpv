import { bisect } from "../math/solve";

export function applyThrottleCurve(stick: number, mid: number, expo: number): number{
    const t: number = stick - mid;                            // how far is stick from the mid
    const y: number = stick < mid ? mid : 1 - mid;            // how far is the mid from the tip

    // Throttle Curve is a mixture of a lineer and x^3 function at mixture rate of expo
    // Lineer line formula: u = mid + t
    // X^3 formula:  mid + t^3/y^2
    // Curve with expo mixture: (1-e) * (mid + t) + e * (mid + t^3/y^2)
    // After factorization: (1-e)*mid + (1-e)*t + e*mid + e * t^3/y^2   => mid(1-e+e) + (1-e)*t + e * t^3/y^2

    const u: number = mid + (1-expo) * t + expo * t**3/y**2;
    return u;
}

export function findStickForOutput(target: number, mid: number, expo: number): number{  
    // At wich stick point curve gives this output
    // Uses math/solve/bisect method to calculate approximate value;
    
    return bisect(x => applyThrottleCurve(x, mid, expo), target , 0, 1);
}