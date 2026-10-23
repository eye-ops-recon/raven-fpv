import type { Input, Sample } from "./types";

export function resampleInputs(samples: readonly Sample[], seconds: number, dt: number) : Input[]{
    const inputs: Input[] = [];

    if(seconds < 0 || dt <= 0){
        throw new Error("Duration cant be negative and dt can't be 0 or negative");
    }
    
    if(samples.length == 0){
        throw new Error("Sample list can't be empty");
    }

    if(samples[0].time !== 0){
        throw new Error("Sample time must start at 0");
    }

    let t: number;

    for(let i = 0; i < Math.round(seconds / dt); i++){
        let j = 0; 
        t = i * dt;
        while(j + 1 < samples.length && samples[j + 1].time <= t){
            j++;
        }
        inputs[i] = samples[j].input;
    }
    return inputs;
}