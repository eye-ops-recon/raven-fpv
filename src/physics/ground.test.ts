import { describe, it, assert } from "vitest";
import { defaultParams } from "./defaultParams";
import { step } from "./step";
import { takeoffDelay } from "./analysis";


describe("ground", () => {
    it("Never goes below the ground", () => {
        const dt = 0.001;
        const duration = 10;
        let state = {v: 0, z: 10, motor: 0};
        const input = {stick: 0};
        for(let i = 0; i < Math.round(duration / dt); i++){
            state = step(state, defaultParams, input, dt);
            assert(state.z >= 0, `z: ${state.z}`);
        }
        assert(state.v === 0 && state.z === 0, `v = ${state.v}, z = ${state.z}`);
    })
    it("Does not vibrate at ground", () => {
        const dt = 0.001;
        const duration = 10;
        let state = {v: 0, z: 0, motor: 0};
        const input = {stick: 0};
        for(let i = 0; i < Math.round(duration / dt); i++){
            state = step(state, defaultParams, input, dt);
            assert(state.z === 0 && state.v === 0, `z: ${state.z}, v: ${state.v}`);
        }
    })
    it("Clean Takeoff", () => {
        const dt = 0.001;
        const duration = 10;
        let state = {v: 0, z: 0, motor: 0};
        const input = {stick: 1};
        let result = Infinity;
        const delay = takeoffDelay(state, defaultParams, input);

        for(let i = 0; i < Math.round(duration / dt); i++){
            state = step(state, defaultParams, input, dt);
            if(state.z > 0){
                result = (i + 1) * dt;
                break;
            }
        }
        assert(delay - result < 0 && delay - result <= dt, 
        `Delay calculated ${result} vs True Delay ${delay}`);
    })
})