# References

Every formula and default value in Raven, and where it comes from.

Each entry has a **status**, so it is clear how much trust it deserves:

| Status | Meaning |
|---|---|
| **Measured** | Taken from a published measurement |
| **Standard** | Textbook physics or mathematics, or an official standard |
| **Derived** | Worked out in this project from the entries above; see the linked derivation or decision |
| **Modelled on** | Imitates real-world software, not guaranteed to be identical |
| **Assumption** | A reasonable value chosen for now; to be checked against real hardware |

---

## Default values (`defaultParams`)

| Parameter | Value | Status | Source / reasoning | Decision |
|---|---|---|---|---|
| `gravity` | 9.81 m/s² | Standard | Standard gravity is 9.80665 m/s²; rounded to two decimals | A5 |
| `mass` | 0.6 kg | Assumption | Typical 5" freestyle quad with battery. To be replaced by the weight of a real build | — |
| `maxThrust` | 4 × 1500 gf ≈ 58.86 N | Assumption | Typical full-throttle thrust of a 5" motor and prop. Gives TWR = 10. To be checked against a motor datasheet or thrust stand data | A5, F4 |
| `rho` | 1.225 kg/m³ | Standard | International Standard Atmosphere, sea level, 15 °C | F5 |
| `cd` | 1.0 | Assumption | Order of magnitude for a bluff body moving vertically. Not measured | F2 |
| `area` | 0.02 m² | Assumption | Rough area of a 5" quad seen from above. Not measured | F2 |
| `mid` | 0.5 | Modelled on | Betaflight throttle mid default (50). Verify in Betaflight Configurator | C2 |
| `expo` | 0 | Modelled on | Betaflight throttle expo default (0). Verify in Betaflight Configurator | C2 |
| `motorTau` | 0.033 s | Measured | NeuroBEM: 5" racing quad, Hobbywing XRotor 2306 motors, 5" three-blade props | M3 |
| `dt` (not a param) | 0.01 s | Assumption | Numerical choice, not a property of the drone | N2, A7 |

---

## Formulas

### Motion

| Formula | Status | Source | Where |
|---|---|---|---|
| `a = F / m` | Standard | Newton's second law | `step.ts` |
| `v_next = v + a·dt`, `z_next = z + v_next·dt` | Standard | Semi-implicit (symplectic) Euler | `step.ts`, N1 |
| Energy factor `(1 + dt²)` per step for explicit Euler on a spring | Derived | Spring experiment (Euler Lab) | N1 |

### Forces

| Formula | Status | Source | Where |
|---|---|---|---|
| `drag = ½·ρ·Cd·A·v·|v|` | Standard | The drag equation (quadratic drag); `v·|v|` keeps the sign | `forces.ts`, F2 |
| `v_t = sign(F)·√(|F| / k)`, `k = ½ρ·Cd·A` | Derived | Set net force to zero and solve for v | `analysis.ts`, F3 |
| `T = maxThrust · u²` | Standard | Propeller thrust grows with rpm²; momentum theory and the thrust coefficient `T = C_T·ρ·n²·D⁴` | `forces.ts`, F4 |
| `u_hover = √(weight / maxThrust) = √(1 / TWR)` | Derived | Set `T = weight` in the line above | `analysis.ts`, F4 |
| `maxThrust = gf / 1000 · g` | Standard | Gram-force to newton conversion | `defaultParams.ts`, A5 |

### Throttle curve

| Formula | Status | Source | Where |
|---|---|---|---|
| `u = mid + (1 − e)·t + e·t³/y²` | Modelled on | Betaflight throttle mid/expo | `throttleCurve.ts`, C2 |
| Inverse by bisection | Standard | Bisection method for increasing functions | `math/solve.ts`, C3 |

### Motor

| Formula | Status | Source | Where |
|---|---|---|---|
| `next = target + (current − target) · e^(−dt/τ)` | Derived | Exact solution of the first-order lag `du/dt = (target − u) / τ`. Same equation as the PT1 filter used in flight controllers | `math/firstOrderLag.ts`, M2, [derivation](derivations/first-order-lag.md) |
| `(1 − 1/n)ⁿ → 1/e` | Standard | Limit definition of e | [derivation](derivations/first-order-lag.md) |
| 63.2% of the gap closed after one τ | Derived | `1 − e⁻¹` | M1 |

### Ground

| Formula | Status | Source | Where |
|---|---|---|---|
| `N = −airForce` when resting and pushed down, else 0 | Standard | Normal force of a rigid, one-sided contact | `ground.ts`, G1 |
| On landing `z = 0`, `v = 0` | Assumption | Perfectly inelastic contact (no bounce) | `ground.ts`, G2 |
| `t = −τ · ln(1 − (u_hover − u₀) / (target − u₀))` | Derived | Solve the lag formula for the moment `u = u_hover` | `analysis.ts`, G4 |

---

## Deferred formulas

| Formula | Status | Source | Decision |
|---|---|---|---|
| Ground effect `T_IGE / T_OGE = 1 / (1 − (R / 4z)²)` | Standard (single rotor) | Cheeseman, I. C. and Bennett, W. E. (1955), *The Effect of the Ground on a Helicopter Rotor in Forward Flight*, ARC R&M 3021 | Deferred |
| Bounce `v = −e·v` | Standard | Coefficient of restitution | Deferred, G2 |

---

## Sources

1. **NeuroBEM.** Bauersfeld, L., Kaufmann, E., Foehn, P., Sun, S. and Scaramuzza, D. (2021). *NeuroBEM: Hybrid Aerodynamic Quadrotor Model.* Robotics: Science and Systems. https://arxiv.org/abs/2106.08015. Used for: `motorTau`.
2. **Betaflight.** Open-source flight controller firmware. https://github.com/betaflight/betaflight. Used for: throttle mid/expo behaviour and defaults, motor idle, PT1 filter.
3. **International Standard Atmosphere** (ICAO / ISO 2533). Used for: `rho`.
4. **Cheeseman and Bennett (1955).** See Deferred formulas. Used for: ground effect, later.

---

## To verify against real hardware

These are the weakest links of the model. Each one can be replaced by a measurement:

- [ ] `mass`: weigh a real build with battery
- [ ] `maxThrust`: motor datasheet or thrust stand data for the chosen motor and prop
- [ ] `cd` and `area`: estimate from a free-fall or descent test (terminal velocity gives `k` directly)
- [ ] `motorTau`: RPM telemetry from a Betaflight blackbox log
- [ ] `mid`, `expo` defaults: Betaflight Configurator