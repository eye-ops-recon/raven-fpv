import { describe, it, assert } from "vitest";
import { createConstantInputArray } from "./createConstantInputArray";

describe("createConstantInputArray", () => {
    it("True Array size ", () => {
        const dt = 0.01;
        const duration = 0.29;
        const input = {stick: 0.46};
        const result = createConstantInputArray(input, duration, dt);
        assert(result.length === 29, `Array size deviated ${result.length}`);
    });
    it("Elements has right value ", () => {
        const dt = 0.01;
        const duration = 0.29;
        const input = {stick: 0.46};
        const result = createConstantInputArray(input, duration, dt);
        result.forEach(e => {
             assert(e.stick === input.stick, `Not every element has the right value`);
        });
    });
    it("dt can't be 0", () => {
        const dt = 0;
        const duration = 0.29;
        const input = {stick: 0.46};
        assert.throws(() => createConstantInputArray(input, duration, dt));
    });
    it("dt can't be negative", () => {
        const dt = -0.01;
        const duration = 0.29;
        const input = {stick: 0.46};
        assert.throws(() => createConstantInputArray(input, duration, dt));
    });
    it("Duration can't be negative", () => {
        const dt = 0.01;
        const duration = -0.29;
        const input = {stick: 0.46};
        assert.throws(() => createConstantInputArray(input, duration, dt));
    });
    it("Duration zero means empty array", () => {
        const dt = 0.01;
        const duration = 0;
        const input = {stick: 0.46};
        const result = createConstantInputArray(input, duration, dt);
        assert(result.length === 0, `Array size deviated ${result.length}`);
    });
})  