# Pointer position → stick

How `src/ui/pointerToStick.ts` turns the mouse position inside the stick pad into a stick value in [0, 1].

Running example: the pad's top edge is at `top = 100` px, its height is `height = 300` px, so its bottom edge is at `top + height = 400` px. Edge margin `m = 0.03`.

## 1. Two tools: `lerp` and `inverseLerp`

Both live in `src/math/remap.ts`.

| Function | Question it answers | Direction |
|---|---|---|
| `lerp(start, end, t)` | Which value is a fraction `t` of the way from `start` to `end`? | fraction → value |
| `inverseLerp(start, end, value)` | What fraction of the way from `start` to `end` is `value`? | value → fraction |

```
lerp(start, end, t)            = start + (end − start) · t
inverseLerp(start, end, value) = (value − start) / (end − start)
```

- `inverseLerp` gives 0 at `start` and 1 at `end`. **The order means direction, not size**: `start` is where the result should be 0, `end` is where it should be 1. A reversed range (`start > end`) is allowed and flips the direction.
- No `Math.abs`: the sign says on which side of the range a value lies. With absolute values, a point just below `start` would come out positive, and the stick would rise again inside the bottom margin.
- One is the inverse of the other: `inverseLerp(a, b, lerp(a, b, t)) = t`.
- `remap(value, inStart, inEnd, outStart, outEnd)` is `lerp(outStart, outEnd, inverseLerp(inStart, inEnd, value))`. The stick does not need it, because its output range is already 0–1 (`lerp(0, 1, t) = t`). Graphs will need it (metres → pixels).

## 2. Screen coordinates

- `clientY` is measured from the top of the **window**, not from the top of the pad.
- Screen y grows **downwards**; the stick grows **upwards**.

So the stick is 1 at the pad's top edge (`y = top`) and 0 at its bottom edge (`y = top + height`).

## 3. Why an edge margin

Pixel rows are numbered 0 … height − 1, so at the bottom edge `clientY` stays about one pixel short of `top + height`. Without a margin the stick bottoms out at about 0.003 and never reaches exactly 0.

Fix, as with stick endpoint calibration on a real transmitter: the bottom 3% of the pad counts as 0, the top 3% as 1, and the part in between is stretched linearly over 0–1. A final `clamp(…, 0, 1)` pins everything inside the margins to the ends.

## 4. Three equivalent ways

### Way 1: two steps

```
raw   = inverseLerp(top + height, top, y)        // 0 at the bottom edge, 1 at the top edge
stick = inverseLerp(m, 1 − m, raw)               // margin: m → 0, 1 − m → 1
```

(`raw` can also be written `1 − (y − top) / height`.)

### Way 2: one step, margin converted to pixels

The margin is `m · height = 0.03 · 300 = 9` px at each end.

- stick = 0 at 9 px above the bottom edge: `top + height − m · height = 391`
- stick = 1 at 9 px below the top edge: `top + m · height = 109`

```
stick = inverseLerp(top + height − m · height, top + m · height, y)
```

### Way 3: one step, margin points found with `lerp` (used in the code)

"Go 3% of the way from the bottom edge towards the top edge" is exactly `lerp`:

```
start = lerp(top + height, top, m)    // from the bottom edge, m inwards → 391
end   = lerp(top, top + height, m)    // from the top edge, m inwards    → 109
stick = clamp(inverseLerp(start, end, y), 0, 1)
```

## 5. Why the ways agree

Write `B = top + height` (bottom edge). Way 1:

```
raw   = (B − y) / height
stick = (raw − m) / (1 − 2m)
      = (B − m·height − y) / (height · (1 − 2m))
```

Way 2:

```
stick = (y − (B − m·height)) / ((top + m·height) − (B − m·height))
      = (y − B + m·height) / (−height + 2m·height)
      = (B − m·height − y) / (height · (1 − 2m))
```

Same expression. In general: two linear maps in a row are again a linear map, so the two `inverseLerp` calls of Way 1 can always be merged into one, as long as its `start` and `end` are the points where the final result is 0 and 1.

## 6. Check

Before the clamp, all three ways give (checked in Node):

| `y` (px) | position | before clamp | stick |
|---|---|---|---|
| 400 | bottom edge | −0.0319 | 0 |
| 391 | bottom margin limit | 0 | 0 |
| 320.5 | a quarter of the way up | 0.25 | 0.25 |
| 250 | middle | 0.5 | 0.5 |
| 109 | top margin limit | 1 | 1 |
| 100 | top edge | 1.0319 | 1 |

Without the clamp the stick would leave [0, 1] at the edges (−0.03 and 1.03), and these values would end up in recorded samples.