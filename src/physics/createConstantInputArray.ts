import type { Input } from "./types";

export function createConstantInputArray(input: Input, seconds: number, dt: number) : Input[]{
    const inputs: Input[] = [];

    if(seconds < 0 || dt <= 0){
        throw new Error("Duration cant be negative and dt can't be 0 or negative");

    } 

    for(let i = 0; i < Math.round(seconds / dt); i++){
        inputs[i] = {...input};
    }
    return inputs;
}