import { describe, it, assert } from "vitest";
import { clamp } from "./clamp";

describe("clamp", () => {
    it("value > max", () => {
        const value = 2;
        const min = 1;
        const max = 1.5;
        assert(clamp(value, min, max) == max, `${value} vs ${max}`);
    })
    it("value < min", () => {
        const value = 2;
        const min = 3;
        const max = 6;
        assert(clamp(value, min, max) == min, `${value} vs ${min}`);
    })
        it("min > max", () => {
        const value = 2;
        const min = 8;
        const max = 6;
        assert.throws(() => clamp(value, min, max), "Min");
    })
        it("true call", () => {
        const value = 2;
        const min = 1;
        const max = 6;
        assert(clamp(value, min, max) == value, `output = ${value}`);
    })
})