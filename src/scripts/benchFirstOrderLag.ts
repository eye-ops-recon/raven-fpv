import { firstOrderLag } from "../math/firstOrderLag";

const N = 1_000_000;
const tau = 0.05;
const dt = 0.01;
const k = Math.exp(-dt / tau);

const lagPrecomputed = (current: number, target: number, k: number) =>
    target + (current - target) * k;

function calculateTime(label: string, run: () => number){
    run();

    const startPoint = performance.now();
    const result = run();
    const ms = performance.now() - startPoint;
    const nsPerCall = (ms * 1e6) / N;
    console.log(`${label}: ${nsPerCall.toFixed(4)} ns/call (result: ${result.toFixed(5)})`);
}


calculateTime("Math.exp in every call", () => {
    let x = 0.2;
    for(let i = 0; i < N; i++){
        x = firstOrderLag(x, 0.8, tau + (i & 1) * 1e-9, dt)
    };
    return x;
})


calculateTime("Expo precaculated", () => {
    let x = 0.2;
    for(let i = 0; i < N; i++){
        x = lagPrecomputed(x, 0.8, k)
    };
    return x;
})