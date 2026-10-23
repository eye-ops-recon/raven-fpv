# Design Decisions

This file records the engineering decisions behind Raven's physics engine.
Entries are short on purpose.

**IDs:** Each section has its own prefix (A, N, F, C, M, G, T). A new decision is added to the end of its section with the next number. IDs are never reused or renumbered, so references like "see C3" always stay valid. When a decision changes, the old entry stays and is marked **Superseded by <ID>**.

Each entry: **Decision** · **Why** · **Alternatives** · **Evidence**.

| Prefix | Section |
|---|---|
| A | Architecture |
| N | Numerical method |
| F | Forces |
| C | Throttle curve |
| M | Motor |
| G | Ground |
| T | Testing |

Formulas, default values and their sources are listed in [docs/references.md](docs/references.md).

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
  - `State`: what changes every step (`z`, `v`, `motor`: the actual motor output, 0..1).
  - `Params`: properties of the drone and the world, constant during a run (mass, max thrust, drag, curve settings).
  - `Input`: what the pilot does (`stick`).
- **Why:** Every quantity has one clear home. Rule for new quantities: *does it change during flight?* → `State`. *Is it a property of the drone or the world?* → `Params`. *Does the pilot control it?* → `Input`.

### A4. Folder structure: `physics/`, `math/`, `scripts/`, `ui/`
- **Decision:** `math/` holds general tools with no physical meaning (`bisect`, `firstOrderLag`). `physics/` holds the model. `scripts/` holds small runnable tools (`hoverTable.ts`). Tests sit next to the file they test (`x.ts` ↔ `x.test.ts`).
- **Why:** A reader can find the code for any concept by name, and `math/` can be reused anywhere.
- **Dependency rule:** `physics/` may import from `math/`, never the other way around. A file in `math/` that needs `Params` or `Input` belongs in `physics/` (this is why `motorCommand` lives in `physics/throttleCurve.ts`).

### A5. SI units inside, datasheet units only at the edge
- **Decision:** Motor datasheets give thrust in gram-force per motor. It is converted once, in `defaultParams`: `maxThrust = 4 * 1500 / 1000 * GRAVITY` (N). Everything inside the engine is kg, m, s, N.
- **Why:** One conversion point, no mixed units inside formulas.

### A6. One default parameter set, overridden with spread
- **Decision:** `defaultParams` is the single source of truth. Experiments override only what they change: `{ ...defaultParams, expo: 0.5 }`. `GRAVITY` is an exported constant.
- **Why:** A test shows exactly which parameter it is about, with no copy-pasted parameter blocks drifting apart.

### A7. The timestep is not a drone parameter
- **Decision:** `dt` is passed to `step` and `simulate`, not stored in `Params`.
- **Why:** `Params` holds things that exist on the real drone (mass, thrust, τ). The real drone has no timestep; `dt` belongs to the numerical method. Keeping them apart lets the same drone be simulated at different `dt` (used in tests).
- **Later:** The flight controller's loop rate (PID stage) is a real property of the controller and will live in its own settings, separate from the physics `dt`.

### A8. Record the input, not the result
- **Decision:** A recording stores what the pilot did (the stick over time). The flight is recomputed from it on every playback.
- **Why:** The same hand movement can be replayed with different settings (expo 0 vs 0.5, later wind on vs off), so a reader sees the effect of one setting on their own movement. This is the core of an interactive lesson.
- **Cost:** Playback only reproduces the flight if the simulation is deterministic (N5).
- **Alternatives:** Storing the resulting states: always plays back the same flight, and cannot be replayed with other settings.

### A9. `simulate` takes a list of inputs and returns every state
- **Decision:** `simulate(start, params, inputs: readonly Input[], dt) → State[]`. One step per input. The result has `inputs.length + 1` states and starts with `start`. There is no `duration` parameter.
- **Why:**
  - The stick changes during a flight (recordings, lessons), so one fixed input is not enough.
  - The step count comes from the list itself. A separate `duration` could disagree with the list: 600 steps over 500 inputs reads `inputs[500]`, which is `undefined`, and the step throws a `TypeError`.
  - Every state is needed by the determinism test (N5), the graphs and the playback cursor (K9). Callers that only need the end take the last element.
- **Alternatives:**
  - A function `(k) => Input`: more general, but every constant-stick test becomes a lambda.
  - Two functions (end state only, full trajectory): the same loop in two places drifts apart (see C5).
- **Memory:** 5 s at `dt = 0.01` is 501 states, about 25 KB. Not a concern.
- **Detail:** `readonly` turns `shift()` or `sort()` on the list into a compile error, like `const std::vector<Input>&`. `states[0]` is the caller's `start` object itself, not a copy; this is safe because nothing mutates a state (A2).
- **Evidence:** `simulate.test.ts`: length is `inputs.length + 1`; first element equals `start`; determinism (N5). All older tests were migrated to the new signature.

### A10. Input lists are built from small pieces
- **Decision:** `createConstantInputArray(input, seconds, dt)` returns `Math.round(seconds / dt)` copies of `input`. Longer sequences are joined with the language itself: `[...a, ...b]` or `[a, b].flat()`. There is no wrapper function for joining.
- **Why:** One small function with no modes covers constant-stick tests, multi-stage lessons (`[...ground, ...hover, ...fullThrottle]`) and "keep flying after the recording ends" (`[...recorded, ...hold]`). New shapes (e.g. a ramp) become new pieces that join the same way. A join wrapper would add a name to learn and no behaviour.
- **Location:** `physics/`, not `math/`, because it knows `Input` (A4).
- **Rules:**
  - `seconds = 0` → empty list. A lesson slider set to 0 is a valid request.
  - `seconds < 0` or `dt <= 0` → throws. Without the `dt` check, `dt = 0` loops forever: `5 / 0` is `Infinity` in JS, not an error.
  - Step count by rounding, as in N2: `0.29 / 0.01` is `28.999999999999996`.
- **Note:** Join long lists with array spread, not `arr.push(...big)`. Spread *arguments* hit the engine's argument limit (around 100k).
- **Evidence:** `createConstantInputArray.test.ts`: 0.29 s → 29 elements (catches `floor`); values copied; 0 s → empty; `dt = 0`, `dt < 0` and `seconds < 0` throw (T6).

### A11. `dt` is not stored with the input list
- **Decision:** An input list is a plain `Input[]`. The caller passes the same `dt` to the list builder and to `simulate`.
- **Why:** Keeps `dt` flexible: the same drone and the same pieces can be simulated at different `dt` in tests (A7).
- **Alternatives:** A list that carries its own `dt` (`{ dt, inputs }`), like a WAV file that stores its sample rate; `simulate` would read `dt` from it, so a mismatch would be impossible. Rejected for now.
- **Risk:** A mismatch is silent. A 5 s list built at `dt = 0.01` (500 inputs) and simulated at `dt = 0.001` flies for 0.5 s, with the stick movements 10 times faster. Rule: one `const dt` per test, used in both calls.
- **Evidence of the risk:** Lessons learned, "a signature change moved the meaning of an argument".

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
**Partly superseded by A9 and A10:** `simulate` now runs one step per input; the rounding moved to `createConstantInputArray`. The fixed timestep still holds.
- **Decision:** `dt = 0.01 s` by default; `simulate` runs `Math.round(duration / dt)` steps.
- **Why:** A fixed `dt` keeps runs deterministic. Rounding protects against floating-point division results like 99.99999 turning into an off-by-one step count.
- **Alternatives:** Variable `dt` from frame time: different results on different computers. The future render loop will consume fixed physics steps instead.

### N3. Order inside one step: command → motor → force → velocity → position → ground
- **Decision:** `step` first computes the motor command from the stick, then updates the motor with the lag, then computes the air force **with the updated motor** and adds the ground's normal force (G1), then velocity, then position, and finally applies the ground constraint (G1).
- **Why:** Same idea as N1: always use the freshest value. Computing the force with the old motor would add an artificial one-step delay (10 ms) on top of the real lag (τ = 33 ms). With τ = 0 this order reproduces the K5 behaviour exactly, so the older tests stay valid.
- **Alternatives:** Force first, motor after: one extra step of delay, and τ = 0 would still lag by one step.
- **Detail:** The force is computed from `{ ...state, motor: next }`, so `airForce` only ever sees one motor value.

### N4. Recorded input is resampled by sample-and-hold
- **Decision:** Step `k` uses the last recorded sample with `t ≤ k·dt` (zero-order hold). The step time is computed as `k * dt`, never accumulated with `t += dt`.
- **Why:**
  - A real flight controller does the same: RC packets arrive at their own rate and the FC holds the last value.
  - It never looks ahead, so the same rule works for live input.
  - `k * dt` stays on the grid; `t += dt` drifts. Adding `0.01` ten times gives `0.09999999999999999`, so a sample at exactly 0.1 s would be picked up one step late. After 100 additions the sum is `1.0000000000000007`.
- **Alternatives:**
  - Linear interpolation between samples: smoother, but step `k` would use a sample from after `k·dt`, i.e. look into the future. Possible for playback, impossible live.
  - Smoothing, if needed, becomes a separate link in the chain, like Betaflight's RC smoothing (C1), not something hidden in the recorder.
- **Detail:** A movement shorter than one step can be lost: a sample that arrives and is replaced between two steps is never used. The real FC has the same limit.
- **Evidence:** Added with the resampling function. Expected values come from a hand-calculated table: samples at 0, 0.017, 0.032, 0.038 and 0.052 s with sticks 0, 0.2, 0.5, 0.6, 0.8 give steps 0–5 the sticks 0, 0, 0.2, 0.2, 0.6, 0.6 (0.5 is never used). Tests passed.

### N5. Determinism: bit-identical within one JS engine
- **Decision:** The same `start`, `params`, input list and `dt` give the same states, compared with exact equality, not a tolerance.
- **Why:** Recording and playback (A8) only work if replaying an input list reproduces the flight. JS arithmetic (`+ − × ÷`) is fixed by IEEE 754, and `step` is pure (A2).
- **Scope:** The JS standard only requires `Math.exp` (motor lag, M2) and `**` (throttle curve, C2) to be approximately correct, so different engines (Chrome, Firefox, Safari) may differ in the last digit. The guarantee is bit-identical results within one JS engine. The difference is invisible in graphs, and tests run in Node.
- **What would break it:** hidden state (a module-level counter, consuming the input list with `shift()`), choosing the input by wall-clock time instead of the step index, unseeded randomness (`Math.random()`).
- **Evidence:** `simulate.test.ts`: an input list of four stick levels (40 s at `dt = 1 ms`), simulated twice; all 40 001 states are equal (`toEqual`). Mutation: a module-level call counter that adds `calls · 1e-12` to the stick turns the test red.
- **Known cost:** A failing run takes about 10 s, because Vitest builds a diff of every differing state. Accepted: it only happens when the test fails.

---

## Forces

### F1. Air forces are computed in exactly one place
- **Decision:** `airForce(state, params) = thrust − weight − drag`: every force except ground contact. Both `step` and the analysis functions call it. (Until K6 it also took `input`, see F6. Until K7 it was called `netForce`, see G3.)
- **Why:** Analysis code reuses the model instead of re-deriving it, so the two can never disagree.

### F2. Quadratic drag written as `v · |v|`
- **Decision:** `drag = ½ · ρ · Cd · A · v · |v|`
- **Why:** `v²` loses the sign, but drag must always oppose motion. `v · |v|` keeps the sign without an `if`.
- **Alternatives:** `Math.sign(v) · v²` (same result, less direct). Linear drag (applies to very slow, very small objects, not drones).
- **Evidence:** Terminal velocity tests for climbing, free fall, and starting from −40 m/s all converge to the analytic value.

### F3. Terminal velocity has an analytic function
- **Decision:** `v_t = sign(F) · √(|F| / k)`, where `F = airForce` of the state `{ v: 0, motor: command }` and `k = ½ρ·Cd·A`.
- **Why:** It gives simulation tests an expected value that does not come from the simulation itself.
- **Detail:** `v = 0` switches drag off, so `airForce` returns thrust − weight. `motor = command` because at terminal velocity the motor has long since caught up with its command (seconds vs. τ = 33 ms).

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

### F6. Forces depend on the state, not on the stick
- **Decision:** `airForce` (then `netForce`) no longer takes `input`. Thrust is computed from `state.motor`.
- **Why:** Since K6 the stick reaches the physics only through the motor, just like on the real drone. The pilot is not part of the physics (A3); `input` is used only in `step`, to compute the motor command.

---

## Throttle curve

### C1. Two-stage chain: stick → curve → motor output → thrust
- **Decision:** The throttle curve (a flight controller setting) and thrust (physics) are separate functions in separate files. The stick is clamped to [0, 1] before the curve (see C5). Since K6 the chain has one more link: stick → curve → **command** → lag → motor output → thrust (M1).
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

### C5. Stick → command in one function
- **Decision:** `motorCommand(params, input)` clamps the stick and applies the curve. `step` and `terminalVelocity` both call it.
- **Why:** The rule "how a stick becomes a motor command" lives in one place. Future additions (motor idle, PID correction) change it once, and simulation and analysis can never disagree.
- **Alternatives:** Repeating the two lines in each caller. Works today, but the copies drift apart the first time one of them changes.
- **Recomputed every step:** The command is not cached. It costs nanoseconds, it is always up to date, and once PID exists it changes every step anyway. Real flight controllers do the same.

---

## Motor

### M1. The motor follows its command with a first-order lag
- **Decision:** The curve output is the motor's *command*. The *actual* motor output moves toward it with time constant τ: after one τ it has closed 63.2% of the gap. Thrust is computed from the actual output.
- **Why:** A real motor and propeller have inertia and cannot change rpm instantly. Without lag, a PID tuned in the simulator would not work on a real drone.
- **Where things live (A3):** The actual output changes every step → `State`. τ is a property of the motor → `Params`. The command is derived from `Input` and `Params`, so it is not stored.
- **Alternatives:** No lag (thrust follows the stick instantly; unrealistic). A full motor model with rotor inertia, torque and battery voltage (possible later, needs real motor data).
- **Evidence:** `step.test.ts`: in a full simulation, after one τ the motor has closed 0.6321205588285554 of the gap (1 − 1/e = 0.6321205588285577).

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

## Ground

### G1. The ground is a normal force while resting, plus a constraint on landing
- **Decision:** `physics/ground.ts` has three functions:
  - `isOnGround(state)`: `z <= 0`.
  - `normalForce(state, airForce)`: on the ground and pushed down (`airForce < 0`) → returns `−airForce`; otherwise 0.
  - `applyGroundConstraint(state)`: at the end of `step`, if the drone is at or below the ground → returns a new state with `z = 0`, `v = 0`; otherwise the state unchanged.
- **Why:** Acceleration is never "set to zero"; the ground is just another force. It pushes exactly as much as needed and never pulls, so Newton's law holds and takeoff happens by itself once thrust exceeds weight. The constraint handles the other case: a falling drone crosses the ground during a step, which is only visible at the end of that step. Every state returned by `step` is physically valid.
- **Alternatives:**
  - Clamp only `z`: `v` keeps growing negative while the drone rests, so takeoff is late.
  - Correct at the start of the *next* step: every returned state sits ~1 mm below the ground with `v = −0.098`, and the last state of a simulation stays below the ground.
  - Spring-damper ground: realistic landing gear, but needs a much smaller dt and jitters (see the spring in N1).
- **Evidence:** `ground.test.ts`: a drop from 10 m never goes below the ground and ends at exactly `z = 0, v = 0`; 10 s at rest at zero throttle stays exactly 0; clean takeoff (G4).

### G2. Landing does not bounce
- **Decision:** On contact `v = 0` (perfectly inelastic).
- **Why:** FPV quads barely bounce, and it is the simplest correct behaviour. The impact energy goes into heat, sound and deformation in reality.
- **Alternatives:** Restitution `v = −e·v` with 0 ≤ e ≤ 1 (deferred).

### G3. Ground logic is kept apart from the air forces
- **Decision:** `airForce` contains no ground logic; the ground lives in `ground.ts` and is combined in `step`. `netForce` was renamed `airForce`.
- **Why:** `terminalVelocity` builds a helper state with `z = 0`. If the air force included the ground, that state would count as "on the ground" and the free-fall terminal velocity would come out as 0 instead of −21.9 m/s. The new name is true everywhere: in the air the air force *is* the net force, on the ground the net force is `airForce + normalForce`.

### G4. Takeoff delay has an analytic function
- **Decision:** `takeoffDelay(state, params, input)` in `analysis.ts`: `t = −τ · ln(1 − (u_hover − u₀) / (target − u₀))`, with `u₀ = state.motor`. Returns 0 if the motor is already at or above hover output, `Infinity` if the target is at or below it. Assumes the drone rests on the ground (`v = 0`).
- **Why:** It gives the takeoff test an independent expected value (T1), and it is a number worth showing in the motor lag lesson: at full throttle from a stopped motor the drone waits ≈ 12.5 ms before it lifts.
- **Evidence:** Simulated with dt = 1 ms the drone lifts at 13 ms; the formula gives 12.544 ms. Within one dt, never earlier (T5).

---

## Testing

### T1. Expected values come from an independent source
- **Decision:** Expected values come from analytic solutions, hand calculations or physical laws, never from the same formula as the code under test.
- **Why:** A test that repeats the code's formula passes even when the formula is wrong. Example: the hover output test checks `maxThrust · u² = weight` rather than recomputing `√(mg / maxThrust)`.

### T2. Tolerances chosen by physical meaning
- **Decision:** Plain `|actual − expected| < tol`, with `tol` chosen per quantity.
- **Why:** The square root amplifies tiny errors. At hover, net force is checked to 1e-9, but terminal velocity only to 1e-5: a leftover force of ~1e-14 N becomes ~1e-6 m/s after the square root.

### T3. A test must be able to fail
- **Decision:** Always compare with `Math.abs(actual − expected) < tol`. When a test is new, break the code on purpose (e.g. `return current;`) and check that the test fails.
- **Why:** `actual − expected < tol` without `Math.abs` passes for every value below the target, even if nothing moves. A test that cannot fail tests nothing.

### T4. One test, one thing; each test builds its own state
- **Decision:** Parts a test is not about are set up in their simplest form (e.g. terminal velocity tests start the motor at its command). State is created inside each `it`, never shared at file level.
- **Why:** A failing test should point to one cause. Shared mutable state makes results depend on test order.

### T5. Events are detected within one step
- **Decision:** When a test measures *when* something happens (e.g. takeoff), it checks `measured ≥ expected` and `measured − expected ≤ dt`, not a tiny tolerance.
- **Why:** The simulation only sees the world at the end of each step. An event between two steps is first seen at the next step: never early, at most one dt late.
- **Exact zeros:** Where the code writes an exact value (the ground constraint writes `z = 0`, `v = 0`), the test uses `===`. "No jitter" is then checked in its strongest form.

### T6. Error tests match the message
- **Decision:** A test that expects an error also checks its message: `expect(fn).toThrow("dt")`.
- **Why:** `throws` passes for any error. With the `dt <= 0` check removed, the `dt = 0` test still passed: the endless loop made V8 throw its own `RangeError`.

---

## Deferred

- **Wind:** vertical gusts with the PID stage; horizontal wind in 3D, as relative airspeed (`v − v_wind`) inside the drag formula. Wind is an input of the world, not part of `State`. It keeps the simulation deterministic (N5) if it is recorded or generated from a fixed seed; then the same recording can be replayed with wind on and off (A8).
- **RK4 integrator:** only if 3D needs more accuracy.
- **Real propeller model:** only if real flight data shows the u² model is not enough.
- **Ground effect:** near the ground, the same motor output gives more thrust (air cushion under the props; strong on ducted cinewhoops like the Cinelog35). Single-rotor model: `T_IGE / T_OGE = 1 / (1 − (R / 4z)²)` (Cheeseman–Bennett, 1955), noticeable below about one prop diameter. Deferred to 3D: the realistic version is per motor, since a tilted drone has each motor at a different height, which also creates a torque.
- **Bouncing on landing:** restitution coefficient (G2). Until 3D.
- **Motor idle:** armed motors spin at a small idle output even at zero stick (Betaflight motor idle). Deferred to 2D. `takeoffDelay` already supports a non-zero starting motor.

---

## Lessons learned

Bugs that changed how the code is written:

- **Drone climbed to 151 m in a hover test.** The hover stick was computed with one parameter set and simulated with another. Rule: derive test inputs from the exact `params` object being simulated.
- **`^` is XOR in TypeScript, not power.** The curve returned nonsense until `t^3` became `t**3`.
- **`simulate` looped `i < duration`** (seconds) instead of the number of steps. Fixed by N2.
- **Stick vs. motor output (K6).** A hover test started the motor at the hover *stick* (0.22) instead of the hover *output* (0.32). It only showed up with expo ≠ 0, where the two differ. Rule: keep the two links of the chain apart, and test with curved params.
- **A test kept passing after it lost its purpose (K6).** While updating the tests, "slowing down from −40 m/s" was changed to start at `v = 0` and became a copy of the free-fall test. Still green, testing nothing new. Rule: when editing a test, re-read its name.
- **Ratio vs. value (K6).** `1 − 1/e` is the fraction of the gap closed, not the motor value. With target 0.9 the motor is at `0.9 · (1 − 1/e)`.
- **Inverted conditions (K7).** The first `normalForce` had its two branches swapped (the ground pulled the drone down at takeoff), and a test asserted `z < 0` instead of `z >= 0`. Rule: check every condition against one concrete number before running.
- **`const copy = state` is not a copy (K7).** Objects are held by reference, like `State&` in C++. Changing the "copy" would change the caller's state and break A2. Rule: use spread, `{ ...state, z: 0 }`.
- **Fixing it later leaks bad states (K7).** Correcting "below the ground" at the start of the next step left every returned state 1 mm under the ground. Rule: a function returns only valid states; fix things in the same step.
- **Wrong guard variable (K7).** `takeoffDelay` checked `target > uHover` instead of `state.motor >= uHover`, so it always returned 0. The takeoff test caught it.
- **`assert(x = 5)` always passes (K8).** `assert(result.length = 49000)` assigns instead of comparing; the assignment returns 49000, which is truthy, so the test could never fail. Rule: use `expect(actual).toBe(expected)`, which keeps the two values apart.
- **Copy-pasted tests (K8).** Three new tests were named for `dt < 0`, `seconds < 0` and `seconds = 0` but still ran with the old values. A field check read `state.v === states[0].v && state.v === states[0].v` and never checked `z`. A list named `sticks07` held stick 0. Rule: after copying a test, change the values its name promises; compare whole objects with `toEqual` instead of field by field.
- **`throws` passed for the wrong error (K8).** See T6.
- **A signature change moved the meaning of an argument (K8).** `simulate(start, params, input, duration, dt)` became `simulate(start, params, inputs, dt)`, and an old `30` (seconds) silently became `dt = 30`. Both are numbers, so `tsc` could not catch it. Rule: when a signature changes, re-read every argument at every call site, not just the ones the compiler flags.