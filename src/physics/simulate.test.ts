import { describe, it, assert, expect } from "vitest";
import { defaultParams } from "./defaultParams";
import { createConstantInputArray } from './createConstantInputArray'
import type { Input, State } from './types'
import { simulate } from "./simulate";

const params = defaultParams;
const dt = 0.001;



describe("simulation", () => {
    it("state number = input +1", () => {
        let state = {v: 0, z: 10, motor: 0};
        let states: State[] = [];
        const sticks: Input[] = createConstantInputArray({stick: 0.64}, 10, dt);

        states = simulate(state, params, sticks, dt);
        assert(states.length === sticks.length + 1, 
        `Length of States = ${states.length}, Length of Sticks = ${sticks.length}`);
    })
    it("first element equals initial state", () => {
        let state = {v: 0, z: 10, motor: 0};
        let states: State[] = [];
        const sticks: Input[] = createConstantInputArray({stick: 0.64}, 10, dt);
        states = simulate(state, params, sticks, dt);

        assert(state.v === states[0].v && state.z === states[0].z && state.motor === states[0].motor, 
            `v = ${state.v}, z = ${state.z}, motor = ${state.motor}`);
    })
    it("determinism", () => {
        let state = {v: 0, z: 10, motor: 0};
        let states1: State[] = [];
        let states2: State[] = [];

        const sticks: Input[] = createConstantInputArray({stick: 0.92135}, 5, dt);
        const sticks1: Input[] = createConstantInputArray({stick: 0.1}, 10, dt);
        const sticks2: Input[] = createConstantInputArray({stick: 0.2}, 10, dt);
        const sticks3: Input[] = createConstantInputArray({stick: 0.63}, 15, dt);

        sticks.push(...sticks1);
        sticks.push(...sticks2);
        sticks.push(...sticks3);
        

        states1 = simulate(state, params, sticks, dt);
        states2 = simulate(state, params, sticks, dt);

        expect(states1).toEqual(states2);
    })
})