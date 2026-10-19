export function firstOrderLag(
    current: number,
    target: number,
    tau: number,
    dt: number,
): number{

    // Moves "current" toward "target" with time constant "tau", over time "dt".
    // Exact first order lag assuming "target" stays constant during "dt".

    return target + (current - target) * Math.exp(-dt/tau);
}