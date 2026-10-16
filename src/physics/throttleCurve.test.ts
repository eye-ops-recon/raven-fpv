import { describe, it, assert } from "vitest";
import { defaultParams } from "./defaultParams";
import { applyThrottleCurve } from "./throttleCurve";

const params = defaultParams;

describe('throttleCurvePoint', () => {
    it('Stick at 0 with 0 expo', () => {
        const r = applyThrottleCurve(0, params.mid, params.expo);
        assert(Math.abs(r - 0) < 1e-9, `r = ${r}`);
    });
    it('Stick at 1 with 0 expo', () => {
        const r = applyThrottleCurve(1, params.mid, params.expo);
        assert(Math.abs(r - 1) < 1e-9, `r = ${r}`);
    });
    it('Stick at mid with 0 expo', () => {
        const r = applyThrottleCurve(params.mid, params.mid, params.expo);
        assert(Math.abs(r - params.mid) < 1e-9, `r = ${r}`);
    });
    it('Stick at random location with 0 expo', () => {
        const r = applyThrottleCurve(0.82, params.mid, 0);
        assert(Math.abs(r - 0.82) < 1e-9, `r = ${r}`);
    });
    it('Stick at 0 with expo', () => {
        const r = applyThrottleCurve(0, 0.3, 0.6);
        assert(Math.abs(r - 0) < 1e-9, `r = ${r}`);
    });
    it('Stick at 1 with expo', () => {
        const r = applyThrottleCurve(1, 0.3, 0.6);
        assert(Math.abs(r - 1) < 1e-9, `r = ${r}`);
    });
    it('Stick at mid with expo', () => {
        const r = applyThrottleCurve(0.3, 0.3, 0.6);
        assert(Math.abs(r - 0.3) < 1e-9, `r = ${r}`);
    });
    it('Stick at random location with expo', () => {
        const r = applyThrottleCurve(0.25, 0.5, 0.2);
        assert(Math.abs(r - 0.2875) < 1e-9, `r = ${r}`);
    });
})


