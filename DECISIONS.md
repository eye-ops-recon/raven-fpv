# Design Decisions

This file records the engineering decisions behind Raven's physics engine.
Entries are short on purpose.

**IDs:** Each section has its own prefix (A, N, F, C, M, T). A new decision is added to the end of its section with the next number. IDs are never reused or renumbered, so references like "see C3" always stay valid. When a decision changes, the old entry stays and is marked **Superseded by <ID>**.

Each entry: **Decision** · **Why** · **Alternatives** · **Evidence**.

| Prefix | Section |
|---|---|
| A | Architecture |
| N | Numerical method |
| F | Forces |
| C | Throttle curve |
| M | Motor |
| T | Testing |

---

## Architecture

### A1. Physics is a pure library, separate from the UI
- **Decision:** `src/physics` contains no DOM, canvas or browser code.
- **Why:** The engine can be tested in Node without a browser, and the same code can drive lessons, graphs and scripts.
- **Alternatives:** Running the simulation inside the render loop. Faster to start, but hard to test and hard to reuse.
- **Evidence:** Every physics test runs under Vitest with no browser.

### A2. One pure step function: `step(state, params, input, dt) → newState`
- **Decision:** `step` returns a new `State` and never modifies its arguments.
- **Why:** Same inputs always give the same output. This makes the simulation deterministic (needed for recording and playback in K8) and lets each step be tested on its own.
- **Alternatives:** A class with mutable fields (`drone.update(dt)`). Familiar from C++ game engines, but hidden state makes tests harder to reason about.

### A3. `State`, `Params` and `Input` are separate types
- **Decision:**
  - `State`: what changes every step (`z`, `v`).
  - `Params`: properties of the drone and the world, constant during a run (mass, max thrust, drag, curve settings).
  - `Input`: what the pilot does (`stick`).
- **Why:** Every quantity has one clear home. Rule for new quantities: *does it change during flight?* → `State`. *Is it a property of the drone or the world?* → `Params`. *Does the pilot control it?* → `Input`.

### A4. Folder structure: `physics/`, `math/`, `scripts/`, `ui/`
- **Decision:** `math/` holds general tools with no physical meaning (`bisect`, `firstOrderLag`). `physics/` holds the model. `scripts/` holds small runnable tools (`hoverTable.ts`). Tests sit next to the file they test (`x.ts` ↔ `x.test.ts`).
- **Why:** A reader can find the code for any concept by name, and `math/` can be reused anywhere.

### A5. SI units inside, datasheet units only at the edge
- **Decision:** Motor datasheets give thrust in gram-force per motor. It is converted once, in `defaultParams`: `maxThrust = 4 * 1500 / 1000 * GRAVITY` (N). Everything inside the engine is kg, m, s, N.
- **Why:** One conversion point, no mixed units inside formulas.

### A6. One default parameter set, overridden with spread
- **Decision:** `defaultParams` is the single source of truth. Experiments override only what they change: `{ ...defaultParams, expo: 0.5 }`. `GRAVITY` is an exported constant.
- **Why:** A test shows exactly which parameter it is about, with no copy-pasted parameter blocks drifting apart.

---

## Numerical method

### N1. Semi-implicit (symplectic) Euler instead of explicit Euler
- **Decision:** `v_next = v + a·dt`, then `z_next = z + v_next·dt` (velocity first, position uses the *new* velocity).
- **Why:** In a spring test (k = m = 1), explicit Euler multiplies the energy by (1 + dt²) every step, so the oscillation grows forever. Semi-implicit Euler keeps the energy bounded (it exactly conserves a slightly modified energy). Same cost, one line different.
- **Alternatives:**
  - Explicit Euler: unstable for oscillators.
  - RK4: more accurate, but four force evaluations per step and more code. Revisit in 3D if accuracy becomes a problem.
- **Evidence:** Spring experiment (Euler Lab); free-fall test against `z = z0 − ½·g·t²`, whose first-order error (≈ ½·g·t·dt) sets the test tolerance.

### N2. Fixed timestep; step count by rounding
- **Decision:** `dt = 0.01 s` by default; `simulate` runs `Math.round(duration / dt)` steps.
- **Why:** A fixed `dt` keeps runs deterministic. Rounding protects against floating-point division results like 99.99999 turning into an off-by-one step count.
- **Alternatives:** Variable `dt` from frame time: different results on different computers. The future render loop will consume fixed physics steps instead.

---

## Forces

### F1. Net force is computed in exactly one place
- **Decision:** `netForce(state, params, input) = thrust − weight − drag`. Both `step` and the analysis functions call it.
- **Why:** Analysis code reuses the model instead of re-deriving it, so the two can never disagree.

### F2. Quadratic drag written as `v · |v|`
- **Decision:** `drag = ½ · ρ · Cd · A · v · |v|`
- **Why:** `v²` loses the sign, but drag must always oppose motion. `v · |v|` keeps the sign without an `if`.
- **Alternatives:** `Math.sign(v) · v²` (same result, less direct). Linear drag (applies to very slow, very small objects, not drones).
- **Evidence:** Terminal velocity tests for climbing, free fall, and starting from −40 m/s all converge to the analytic value.

### F3. Terminal velocity has an analytic function
- **Decision:** `v_t = sign(F) · √(|F| / k)`, where `F = netForce` at `v = 0` and `k = ½ρ·Cd·A`.
- **Why:** It gives simulation tests an expected value that does not come from the simulation itself.

### F4. Thrust grows with the square of motor output
- **Decision:** `T = maxThrust · u²` (u = motor output, 0..1).
- **Why:** Propeller thrust scales with rpm²: both the mass of air moved per second and its speed grow with rpm. A linear model put hover at u = 0.1 for TWR = 10; the quadratic model gives `u = √(1/TWR) ≈ 0.316`, in the range FPV pilots actually see.
- **Alternatives:** Linear thrust (simpler, wrong shape). Full propeller model `T = C_T·ρ·n²·D⁴` (needs rpm and prop data; possible later).
- **Evidence:** Tests: net force is zero at hover output; `maxThrust · u²` equals weight at hover output.

### F5. Air density is the standard sea-level value
- **Decision:** `rho = 1.225 kg/m³` in `defaultParams`.
- **Why:** This is the International Standard Atmosphere value at sea level, 15 °C. Most FPV flying happens near sea level, and a standard value makes results comparable with other sources.
- **Alternatives:** `rho = 1` (a round number that made early hand calculations easy, used until K5). Altitude- and temperature-dependent density (possible later; air at 1000 m is about 10% thinner).
- **Effect:** Only drag depends on rho. Hover output does not change (drag is zero at v = 0). Terminal velocities change by a factor of √(1/1.225) ≈ 0.90, since `v_t ∝ 1/√ρ`.

---

## Throttle curve

### C1. Two-stage chain: stick → curve → motor output → thrust
- **Decision:** The throttle curve (a flight controller setting) and thrust (physics) are separate functions in separate files. The stick is clamped to [0, 1] before the curve.
- **Why:** A lesson can show each stage on its own, and changing the curve never touches the physics.

### C2. Betaflight-style mid/expo curve
- **Decision:** `t = x − mid`, `y = mid` (left of mid) or `1 − mid` (right of mid), `u = mid + (1 − e)·t + e·t³/y²`.
- **Why:** For any expo the curve passes through (0, 0), (mid, mid) and (1, 1). It is a blend of a straight line and a cubic, weighted by expo. Slope at mid is `1 − expo`. Expo is limited to [0, 1]: above 1 the curve stops being increasing, which breaks both the stick feel and the inverse in C3.
- **Note:** Modelled on Betaflight's throttle mid/expo; not guaranteed to be identical to the firmware.
- **Evidence:** Curve tests: endpoints, mid point, slope at mid, increasing everywhere, hand-calculated value 0.2875.

### C3. Inverse by bisection, not by Cardano's formula
- **Decision:** `findStickForOutput` uses a general `bisect(f, target, lo, hi)` from `src/math`.
- **Why:** Bisection works for *any* increasing function, so the curve can change without rewriting the inverse. 50 iterations narrow the interval to ~1e-15. It costs microseconds and only runs in analysis. Cardano's closed form was checked and gives the same answers, but it has many branches and only fits this exact cubic.
- **Detail:** The range check allows a tiny tolerance (1e-12), because `f(0)` can come out as ±1e-17 instead of exactly 0.
- **Evidence:** Tests: `bisect` finds √2; throws for out-of-range targets; round trip `curve(findStickForOutput(u)) = u`.

### C4. The simulation only runs the chain forward
- **Decision:** The inverse is used only for analysis (hover stick, tables). The simulation never inverts anything.
- **Why:** The real drone works forward too: the pilot moves the stick, the motors respond.

---

## Motor

### M1. The motor follows its command with a first-order lag
- **Decision:** The curve output is the motor's *command*. The *actual* motor output moves toward it with time constant τ: after one τ it has closed 63.2% of the gap. Thrust is computed from the actual output.
- **Why:** A real motor and propeller have inertia and cannot change rpm instantly. Without lag, a PID tuned in the simulator would not work on a real drone.
- **Where things live (A3):** The actual output changes every step → `State`. τ is a property of the motor → `Params`. The command is derived from `Input` and `Params`, so it is not stored.
- **Alternatives:** No lag (thrust follows the stick instantly; unrealistic). A full motor model with rotor inertia, torque and battery voltage (possible later, needs real motor data).

### M2. Exact solution instead of Euler for the lag
- **Decision:** `next = target + (current − target) · e^(−dt/τ)`, in `src/math/firstOrderLag.ts`.
- **Why:** The command is held constant during one step, so the lag equation has an exact solution.
  - It never overshoots, for any dt. Explicit Euler overshoots once dt > τ, which is realistic for fast FPV motors at dt = 10 ms.
  - The result does not depend on dt: five steps of 0.01 s equal one step of 0.05 s.
  - τ = 0 gives no lag (`e^(−∞) = 0`), with no special case in the code.
- **Alternatives:** Explicit Euler (overshoots, dt-dependent). Implicit Euler (never overshoots, but still dt-dependent).
- **Performance:** `Math.exp` is called every step. Measured with `src/scripts/benchFirstOrderLag.ts`: ~10 ns per call vs ~4 ns with a precomputed factor (≈ 0.003 ms per simulated second with 4 motors). Not worth caching: the gain is negligible, and a cached factor could go stale when τ changes from the UI.
- **Evidence:** `firstOrderLag.test.ts`: 1 − e⁻¹ after one τ; dt-independence; correct in both directions; no overshoot with dt ≫ τ; τ = 0 reaches the target in one step.
- **Derivation:** [docs/derivations/first-order-lag.md](docs/derivations/first-order-lag.md)

### M3. Default motor time constant: 33 ms
- **Decision:** `motorTau = 0.033` s in `defaultParams`.
- **Why:** Measured value for a 5-inch racing quad (Hobbywing XRotor 2306 motors, 5" three-blade props) in the NeuroBEM study (Bauersfeld et al., 2021). This is the class of drone Raven models.
- **Alternatives:** 0.05 s (measured on the small Crazyflie Brushless; too slow for a 5" racer). Values below ~0.015 s would be more agile than real hardware.
- **Not modelled yet:** Real motors spin up and spin down at different rates. One shared τ for now.
- **Source:** https://arxiv.org/abs/2106.08015
- **Later:** Can be checked against my own drone with RPM telemetry from a Betaflight blackbox log.

---

## Testing

### T1. Expected values come from an independent source
- **Decision:** Expected values come from analytic solutions, hand calculations or physical laws, never from the same formula as the code under test.
- **Why:** A test that repeats the code's formula passes even when the formula is wrong. Example: the hover output test checks `maxThrust · u² = weight` rather than recomputing `√(mg / maxThrust)`.

### T2. Tolerances chosen by physical meaning
- **Decision:** Plain `|actual − expected| < tol`, with `tol` chosen per quantity.
- **Why:** The square root amplifies tiny errors. At hover, net force is checked to 1e-9, but terminal velocity only to 1e-5: a leftover force of ~1e-14 N becomes ~1e-6 m/s after the square root.

---

## Deferred

- **Wind:** vertical gusts with the PID stage; horizontal wind in 3D, as relative airspeed (`v − v_wind`) inside the drag formula. Wind is an input of the world, not part of `State`.
- **RK4 integrator:** only if 3D needs more accuracy.
- **Real propeller model:** only if real flight data shows the u² model is not enough.

---

## Lessons learned

Bugs that changed how the code is written:

- **Drone climbed to 151 m in a hover test.** The hover stick was computed with one parameter set and simulated with another. Rule: derive test inputs from the exact `params` object being simulated.
- **`^` is XOR in TypeScript, not power.** The curve returned nonsense until `t^3` became `t**3`.
- **`simulate` looped `i < duration`** (seconds) instead of the number of steps. Fixed by N2.