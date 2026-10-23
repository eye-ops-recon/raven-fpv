import { describe, it, assert, expect } from "vitest";
import { resampleInputs } from "./resampleInputs";
import type { Sample } from "./types";


const samples: Sample[] = [
    {time: 0, input: {stick: 0}}, {time: 0.1, input: {stick: 0.8}},
    {time: 0.15, input: {stick: 0.2}}, {time: 0.2, input: {stick: 0}},
    {time: 0.6, input: {stick: 0.3}}, {time: 1, input: {stick: 0.1}},
    {time: 1.1, input: {stick: 0.5}}, {time: 1.4, input: {stick: 0.9}},
    {time: 1.16, input: {stick: 0.4}}, {time: 1.21, input: {stick: 0.3}},
    {time: 1.26, input: {stick: 0.2}}, {time: 1.3, input: {stick: 0.12}},
    {time: 1.36, input: {stick: 0.1}}, {time: 1.48, input: {stick: 0.5}},
    {time: 1.66, input: {stick: 0.6}}, {time: 1.96, input: {stick: 0.7}},
    {time: 2, input: {stick: 0.12}}, {time: 2.1, input: {stick: 0}},
    {time: 2.8, input: {stick: 0.6}}, {time: 6.4, input: {stick: 0.3}}
]

const testSimulationInput: Sample[] = [
    {time: 0, input: {stick: 0}}, {time: 0.017, input: {stick: 0.2}},
    {time: 0.032, input: {stick: 0.5}}, {time: 0.038, input: {stick: 0.6}},
    {time: 0.052, input: {stick: 0.8}}
]
function changeSampleStart(list: Sample[], sample: Sample) : Sample[]{
    const samples = [...list];
    samples[0] = sample;
    return samples;
}

describe("resampleInputs", () => {
    it("dt cant be 0 ", () => {
        const dt = 0;
        const duration = 2;
        assert.throws(() => resampleInputs(samples, duration, dt));

    });
    it("dt cant be negative ", () => {
        const dt = -0.2;
        const duration = 2;
        assert.throws(() => resampleInputs(samples, duration, dt));

    });     
    it("duration cant be negative ", () => {
        const dt = 0.1;
        const duration = -3;
        assert.throws(() => resampleInputs(samples, duration, dt));

    });
    it("Sample list can't be empty ", () => {
        const dt = 0.1;
        const duration = 2;
        const emptyList: Sample[] = [];
        assert.throws(() => resampleInputs(emptyList, duration, dt));
        
    });
    it("Sample time starts at 0 ", () => {
        const dt = 0.01;
        const duration = 0.29;
        const firsSampleButTimeNotZero: Sample = {time: 0.0001, input: {stick: 0.9}};
        const cloneSamples = changeSampleStart(samples, firsSampleButTimeNotZero)
        assert.throws(() => resampleInputs(cloneSamples, duration, dt));
    });
    it("Input size equals duration over dt", () => {
        const dt = 0.1;
        const duration = 2;
        const result = resampleInputs(samples, duration, dt);
        assert(result.length === 20, `Array size deviated ${result.length}`);
    });
    it("Function works", () => {
        const dt = 0.01;
        const duration = 0.08;
        const result = resampleInputs(testSimulationInput, duration, dt);

        const desiredOutputs = [0, 0, 0.2, 0.2, 0.6, 0.6, 0.8, 0.8];

        for(let i = 0; i < Math.round(duration / dt); i++){
            assert(result[i].stick === desiredOutputs[i], `Sticks doesn't match
                ${result[i].stick} vs ${desiredOutputs[i]}`);
        }
    });
    it("Sample exactly at a step time is used at that step", () => {
        const dt = 0.1;
        const duration = 2;
        
        const result = resampleInputs(samples, duration, dt);
        assert(result[1].stick === 0.8);
    });

    it("Determensim", () => {
        const dt = 0.01;
        const duration = 0.08;
        const result1 = resampleInputs(testSimulationInput, duration, dt);
        const result2 = resampleInputs(testSimulationInput, duration, dt);
        expect(result1).toEqual(result2);

    });
})