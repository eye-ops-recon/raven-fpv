import {describe, it, assert} from 'vitest';
import { simulate } from './simulate';
import { defaultParams } from './defaultParams';
import { motorCommand } from './throttleCurve';
import { createConstantInputArray } from './createConstantInputArray'
import type { Input, State } from './types'



describe('step: motor lag', () => {
    it('Motor closes ~%63 of diff after τ time', () => {
        let state = {v: 10, z: 10, motor: 0};
        const params = defaultParams;
        const dt = defaultParams.motorTau / 100;

        const sticks0: Input[] = createConstantInputArray({stick: 0}, 10, dt);
        const sticks07: Input[] = createConstantInputArray({stick: 0.7}, params.motorTau, dt);

        let states1: State[] = [];
        let states2: State[] = [];
        

        states1 = simulate(state, params, sticks0, dt);
        states2 = simulate(state, params, sticks07, dt);
        const motorDesired = motorCommand(params, {stick: 0.7});
        const diff = ((states2[states2.length -1].motor - states1[states1.length -1].motor)
         / (motorDesired - states1[states1.length -1].motor));
        assert(Math.abs(diff - (1 - 1/Math.E)) <  1e-6, 
        `Closed Difference: ${diff}, 
        stage 1 speed, height, motor: ${states1[states1.length -1].v},
         ${states1[states1.length -1].z}, ${states1[states1.length -1].motor}
        end speed, height, motor: ${states2[states2.length -1].v},
         ${states2[states2.length -1].z}, ${states2[states2.length -1].motor}`);
    });
});