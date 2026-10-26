function reverseLerp(inMin: number, inMax: number, value: number): number{
    return value / (inMax - inMin);
}

function lerp(outMin: number, outMax: number, reversedValue: number){
    return outMin + (outMax - outMin) * reversedValue;
}

export function remap(
    value: number, inMin: number, inMax: number, 
    outMin: number, outMax: number): number{

    return reverseLerp(inMin, inMax, value);
    const reverse = reverseLerp(inMin, inMax, value);
}