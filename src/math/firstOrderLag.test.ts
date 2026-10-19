import { firstOrderLag } from "./firstOrderLag";
import { describe, it, assert } from "vitest";

const tau = 0.05;
const dt = 0.01;

describe("firstOrderLag", () => {
    it("Closed Diff reaches .63.. at dt = tau", () => {
        const o = firstOrderLag(0, 0.9, tau, tau);
        assert(Math.abs(o - (0.9 * (1 - 1/Math.E))) < 1e-9, `output = ${o}`);
    })
    it("Working backwards current > target", () => {
        const o = firstOrderLag(0.9, 0.3, tau, dt);
        assert(o > 0.3 && o < 0.9, `output = ${o}`);
    })
    it("dt bigger than tau", () => {
        const o = firstOrderLag(0, 0.9, tau, tau * 108);
        assert(o <= 0.9, `output = ${o}`);
    })
    it("tau = 0 reaches the target in one step (no lag)", () => {
        const o = firstOrderLag(0, 0.9, 0, dt);
        assert(Math.abs(o - 0.9) < 1e-9, `output = ${o}`);
    })
    it("Result is not dependent to how many steps taken", () => {
        const r1 = firstOrderLag(0, 0.9, tau, dt);

        let r2 = firstOrderLag(0, 0.9, tau, dt/5);
        for(let i = 0; i < 4; i++){
            r2 = firstOrderLag(r2, 0.9, tau, dt/5);
        };
        assert(Math.abs(r1 - r2) < 1e-12, `${r1} vs ${r2}`);
    })
    
})