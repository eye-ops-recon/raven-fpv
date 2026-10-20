import {describe, it, assert} from 'vitest';
import { simulate } from './simulate';
import { defaultParams } from './defaultParams';
import { motorCommand } from './throttleCurve';



describe('step: motor lag', () => {
    it('Motor closes ~%63 of diff after τ time', () => {
        let state = {v: 10, z: 10, motor: 0};
        const params = defaultParams;
        const dt = defaultParams.motorTau / 100;


        state = simulate(state, params, {stick: 0}, 10, dt);
        const stage1 = state;
        state = simulate(state, params, {stick: 0.7}, params.motorTau, dt);
        const motorDesired = motorCommand(params, {stick: 0.7});
        const diff = ((state.motor - stage1.motor) / (motorDesired - stage1.motor));
        assert(Math.abs(diff - (1 - 1/Math.E)) <  1e-6, 
        `Closed Difference: ${diff}, 
        stage 1 speed, height, motor: ${stage1.v}, ${stage1.z}, ${stage1.motor}
        end speed, height, motor: ${state.v}, ${state.z}, ${state.motor}`);
    });
});