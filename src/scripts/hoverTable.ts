import { motorOutputAtHover } from "../physics/analysis";
import { defaultParams } from "../physics/defaultParams";
import { findStickForOutput } from "../physics/throttleCurve";

const hoverOutput = motorOutputAtHover(defaultParams);

const settings: [number, number][] = [
    [0.5, 0],
    [0.5, 0.5],
    [0.5, 1],
    [0.3, 0.6],
    [0.32, 0.5],
]

const rows = settings.map(([mid, expo]) => {
    const hoverStick = findStickForOutput(hoverOutput, mid, expo);
    return{
        mid,
        expo,
        hoverStick: hoverStick.toFixed(3),
    };
});

console.log(`Motor output required for hover: ${hoverOutput.toFixed(4)}`);
console.table(rows);