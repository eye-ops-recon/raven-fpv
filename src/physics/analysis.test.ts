import { describe, it, assert } from 'vitest';
import { motorOutputAtHover, terminalVelocity } from './analysis';     
import { defaultParams } from './defaultParams';
import { simulate } from './simulate';
import { findStickForOutput, motorCommand } from './throttleCurve';
import { airForce } from './forces';
import type { Input } from '../physics/types'
import { createConstantInputArray } from './createConstantInputArray';

const params = defaultParams;

const hoverStick = findStickForOutput(motorOutputAtHover(params), params.mid, params.expo);


describe('terminalVelocity', () => {
    it('Terminal velocity is ~0 at hover stick', () => {
        const v = terminalVelocity(params, { stick: hoverStick });
        assert(Math.abs(v) < 1e-5, `v = ${v}`);
    });
    it('Net force is 0 at hover stick', () => {
        const motorWhenStickAtHover = motorCommand(params, {stick: hoverStick});
        const F = airForce({z: 0, v: 0, motor: motorWhenStickAtHover}, params);
        assert(Math.abs(F) < 1e-9, `F = ${F}`);
    });
});

describe('Simulation approaches terminal Velocity', () => {

    const sticks0: Input[] = createConstantInputArray({stick: 0}, 30, 0.01);
    const sticks1: Input[] = createConstantInputArray({stick: 1}, 30, 0.01);

    it('Climbing full throttle', () => {
        const input = sticks1[0];
        const motorAtStick = motorCommand(params, input)
        const expected = terminalVelocity(params, input);
        const end = simulate({z: 1000, v: 0, motor: motorAtStick}, params, sticks1, 0.01);
        assert(Math.abs(end[end.length - 1].v - expected) < 1e-6, `v = ${end[end.length - 1].v}, expected = ${expected}`);
    });
    it('Free fall at 0 throttle', () => {
        const input = sticks0[0];
        const motorAtStick = motorCommand(params, input)
        const expected = terminalVelocity(params, input);
        const end = simulate({z: 1000, v: 0, motor: motorAtStick}, params, sticks0, 0.01);
        assert(Math.abs(end[end.length - 1].v - expected) < 1e-6, `v = ${end[end.length - 1].v}, expected = ${expected}`);
    });
    it('Slowing down while falling faster than the limit', () => {
        const input = sticks0[0];
        const motorAtStick = motorCommand(params, input)
        const expected = terminalVelocity(params, input);
        const end = simulate({z: 1000, v: -40, motor: motorAtStick}, params, sticks0, 0.01);
        assert(Math.abs(end[end.length - 1].v - expected) < 1e-6, `v = ${end[end.length - 1].v}, expected = ${expected}`);
    });
});




describe('hoverControl', () => {
    it('Thrust at hover output equals weight', () => {
    const u = motorOutputAtHover(params);
    const thrust = params.maxThrust * u ** 2;
    const weight = params.mass * params.gravity;
    assert(Math.abs(thrust - weight) < 1e-9, `thrust = ${thrust}, weight = ${weight}`);
    });
    it('Hover simulation', () => {

        const curvedParams = {...defaultParams, mid: 0.5, expo: 0.5};
        const sticksHover: Input[] = createConstantInputArray(
            {stick: findStickForOutput(motorOutputAtHover(curvedParams), curvedParams.mid, curvedParams.expo)}, 
            10, 0.01
        );

        const expected = {z: 10, v:0};
        const end = simulate({z: 10, v:0, motor: motorOutputAtHover(curvedParams)}, curvedParams, sticksHover, 0.01);

        end.forEach(e => {
            assert(Math.abs(e.z - expected.z) < 1e-9 && Math.abs(e.v - expected.v) < 1e-9,
            `v = ${e.v}, expected = ${expected.v}   -   h = ${e.z}, expected = ${expected.z}`);
        });
    });
});