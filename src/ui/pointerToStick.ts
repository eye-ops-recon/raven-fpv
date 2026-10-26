import { clamp } from "../math/clamp";
import { inverseLerp, lerp } from "../math/remap";


export function pointerToStick(top: number, height: number, y: number, margin: number): number{
    // inverseLerp gets a value and find its ratio between top and the bottom
    // lerp calculates the new top and bottom with the difference ratio of margin
    // y is the pixel of the pointer and top and bottom cause screen y points down

    // Derivation: docs/derivations/pointer-to-stick.md
    
    const unclampedStick = inverseLerp(
        lerp(top + height, top, margin),
        lerp(top, top + height, margin), 
        y
    );

    return clamp(unclampedStick, 0, 1);
}