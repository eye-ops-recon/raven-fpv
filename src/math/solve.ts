
// For an increasing function solves the f(x) = target equation at [lo, hi] interval.

export function bisect(
    f: (x: number) => number, 
    target: number, 
    lo: number,
    hi: number,
    iterations = 50
): number{

    const eps = 1e-12;

    if (target < f(lo) - eps || target > f(hi) + eps) {
        throw new Error(`Target ${target} out of range, [${f(lo)} - ${f(hi)}]`);

    }

    for(let i = 0; i < iterations; i++){
        const mid = (lo + hi) / 2;
        const value = f(mid);

        target > value ? lo = mid : hi = mid; 
    }
    
    return (lo + hi) / 2;
}
