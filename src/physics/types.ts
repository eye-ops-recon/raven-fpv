export type State = {
    z: number;                        // height
    v: number;                        // velocity
    motor: number;                    // motor output
};

export type Params = {
    readonly mass: number;                     // kg
    readonly gravity: number;
    readonly maxThrust: number;                // Unit: Newton
    readonly rho: number;                      // air density
    readonly cd: number;                       // drag coefficient
    readonly area: number;                     // Unit: Meter Square   Cross-sectional area perpendicular to the direction of motion
    readonly expo: number;                     // Ratio of mixture density at throttle curve     
    readonly mid: number;                      // Imaginary midpoint of the throttle curve
    readonly motorTau: number;                 // Time value of motors changing speed
}

export type Input = {
    stick: number,                   // between 0-1
}


