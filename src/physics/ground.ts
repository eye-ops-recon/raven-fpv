import type { State } from "./types";

export function isOnGround(state: State): boolean{
    return state.z <= 0;
}

export function normalForce(state: State, airForce: number): number{
    if(airForce < 0 && isOnGround(state)){
        return -airForce;
    }
    return 0;
}

export function applyGroundConstraint(state: State): State{
    if(isOnGround(state)){
        return { ...state, z: 0, v: 0 };
    }
    return state;
}