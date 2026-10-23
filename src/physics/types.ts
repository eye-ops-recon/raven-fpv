export type State = {
    readonly z: number;                        // height
    readonly v: number;                        // velocity
    readonly motor: number;                    // motor output
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
    stick: number,                             // between 0-1
}

export type Sample = {
    time: number,                              // seconds since recording start
    input: Input
}

