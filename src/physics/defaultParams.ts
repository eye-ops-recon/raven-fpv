import type { Params } from "./types";

export const GRAVITY = 9.81;

export const defaultParams: Params = {
    mass: 0.6,                                      //kg
    gravity: GRAVITY,
    maxThrust: (4 * 1500) / 1000 * GRAVITY,         //4 motors x 1500 gf -> Newton
    rho: 1.225,                                     //kg/m^2, see level
    cd: 1.0,
    area: 0.02,                                     //meter square
    expo: 0,
    mid: 0.5,
    motorTau: 0.033,
};