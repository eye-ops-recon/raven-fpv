# How motor output lag calculated

This file records my own perspective and undestanding about How motor output lag is calculated, understanding, timestep, approaches, written.

---

- diff = u - target   =>  u = target + diff
- diff_end = diff_start x e^(-t/τ)

- e^(-t/τ) comes from => Motors close the diff by the rate of (1 - dt/τ)^n, n: how many slices in that period of time
- lets pick a small timestap count aproaches infinity dt and overall time t (which will be the real dt of the simulation) 
- n(general) = t/dt => (1 - dt/τ)^(t/dt)
- t/dt = t/τ * τ/dt  =>   (1 - dt/τ)^(t/τ * τ/dt) => ((1 - dt/τ)^(τ/dt))^(t/τ)
- Now it's similar to the limit of 1/e: (1 - 1/n)^n aproaches 1/e when n aproaches infinity 
- n = τ/dt => ((1 - 1/n)^n)^(t/τ)  =>  (1/e)^(t/τ) = e^(-t/τ)

- u_end = target + diff_start x e^(-t/τ)
- diff_start can be writen as: current - target
- u_end = target + (current - target) x e^(-t/τ)
- In code, t is the simulation step:  target + (current - target) * Math.exp(-dt / tau)



# How motor output lag is calculated

This file records my own perspective and understanding of how the motor output lag is calculated: where the formula in `src/math/firstOrderLag.ts` comes from, step by step.

Related decision: [M2 in DECISIONS.md](../../DECISIONS.md)

---

## Symbols

| Symbol | Meaning |
|---|---|
| `u` | Motor output (0-1) |
| `target` | The output the motor is commanded to reach |
| `diff` | How far the motor is from the target: `u - target` |
| `τ` | Time constant: how slow the motor is. After one `τ`, 63.2% of the diff is closed |
| `t` | The time we wait. **In code, this is the simulation step `dt`** |
| `dt` | An imaginary thin slice of time, used only in this derivation. It goes to 0 |
| `n` | Number of slices in one `τ`: `τ/dt` |

---

## 1. Write the motor output using the diff

```
diff = u - target    =>    u = target + diff
```

If we know how the diff shrinks, we know where the motor is.

## 2. Cut the time into thin slices

In one thin slice the motor closes `dt/τ` of the diff, so `(1 - dt/τ)` of it remains.
In time `t` there are `t/dt` slices:

```
diff_end = diff_start * (1 - dt/τ)^(t/dt)
```

The thinner the slice, the more accurate the result. The exact answer is the limit as `dt → 0`.

## 3. Split the exponent

```
t/dt = (τ/dt) * (t/τ)

(1 - dt/τ)^(t/dt) = ((1 - dt/τ)^(τ/dt))^(t/τ)
```

The inner part is one `τ` worth of slices. The outer exponent `t/τ` is how many `τ`s we waited, and it does not depend on `dt`.

## 4. Recognize the limit of 1/e

With `n = τ/dt`, we get `dt/τ = 1/n`:

```
((1 - dt/τ)^(τ/dt))^(t/τ) = ((1 - 1/n)^n)^(t/τ)
```

As `dt → 0`, the slice count `n → ∞`, and `(1 - 1/n)^n → 1/e` (the definition of e):

```
((1 - 1/n)^n)^(t/τ)  →  (1/e)^(t/τ) = e^(-t/τ)
```

So after waiting `t`, the diff has shrunk by a factor of `e^(-t/τ)`:

```
diff_end = diff_start * e^(-t/τ)
```

## 5. Back to the motor output

```
u_end = target + diff_end
      = target + diff_start * e^(-t/τ)

diff_start = current - target

u_end = target + (current - target) * e^(-t/τ)
```

## 6. In code

`t` is the simulation step `dt`:

```ts
return target + (current - target) * Math.exp(-dt / tau);
```

---

## Check with numbers

`current = 0.2`, `target = 0.8`, `τ = 0.05 s`, one simulation step of `0.01 s`:

```
diff_start = 0.2 - 0.8              = -0.6
factor     = e^(-0.01 / 0.05)       = e^(-0.2) = 0.8187
diff_end   = -0.6 * 0.8187          = -0.4912
u_end      = 0.8 + (-0.4912)        = 0.3088
```