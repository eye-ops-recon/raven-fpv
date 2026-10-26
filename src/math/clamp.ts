export function clamp(value: number, min: number, max: number): number{
    if(max < min){
        throw new Error("Min value can't be bigger than max");
    }
    return Math.min(max, Math.max(min, value));
}

