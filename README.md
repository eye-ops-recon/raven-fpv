# Raven

**Learn FPV drone flight physics with interactivity.**

![tests](https://github.com/eye-ops-recon/raven-fpv/actions/workflows/test.yml/badge.svg)

Raven is an open-source, interactive tutorial site that explains *why and how* an FPV drone flies: hover throttle, throttle mid and expo, drag, motor lag. Behind every lesson is a small physics engine written from scratch in TypeScript.

## Status

Work in progress. Phase 1 (vertical motion) is being built. The first public release will include all 1D lessons.

| Stage | Topic | Status |
|---|---|---|
| K0 | Project setup | ✅ |
| K1 | Free fall (Euler integration) | ✅ |
| K2 | Integrator error: explicit vs semi-implicit | ✅ |
| K3 | Thrust and hover | ✅ |
| K4 | Drag and terminal velocity | ✅ |
| K5 | Stick → throttle curve → thrust | ✅ |
| K6 | Motor lag | ✅ |
| K7 | Ground contact | ✅ |
| K8 | Input recording and playback | ✅ |
| K9 | Visualization | ⏳ |
| K10 | First lesson | ⏳ |

After Phase 1: 2D, then full 3D with attitude, motor mixing and PID.

## Quick start

Requires Node.js 20 or newer.

```bash
git clone https://github.com/eye-ops-recon/raven-fpv.git
cd raven-fpv
npm install
npm test                            # run all tests once
npm run dev                         # start the dev server
npx tsx src/scripts/hoverTable.ts   # hover stick for different curve settings
```

## Project structure

```
docs/
  derivations/   step-by-step math behind the formulas
  references.md  every formula and default value, with its source
src/
  physics/       the model: types, params, forces, ground, step, simulate, throttle curve, analysis
  math/          general math tools (bisection solver, first-order lag)
  scripts/       small runnable tools
  ui/            browser side (coming in K9)
DECISIONS.md     every design decision and why
```

Physics never imports UI code (see [DECISIONS.md](DECISIONS.md), A1).

## The model so far

Vertical axis only.

```
command   = throttleCurve(stick, mid, expo)    commanded motor output (0..1)
u         → command, time constant τ           actual motor output, first-order lag
thrust    = maxThrust · u²
drag      = ½ · ρ · Cd · A · v · |v|            ρ = 1.225 kg/m³ (sea level)

air force = thrust − weight − drag
ground    = pushes back exactly as much as needed while resting, never pulls
net force = air force + ground
```

Integrated with semi-implicit Euler at a fixed `dt = 0.01 s`. The motor lag uses its exact solution instead of Euler. A landing drone stops on the ground without bouncing.

## Design decisions

Every non-obvious choice, and the alternatives that were rejected, is recorded in [DECISIONS.md](DECISIONS.md).
The math behind the formulas is derived step by step in [docs/derivations](docs/derivations), and every formula and default value is traced to its source in [docs/references.md](docs/references.md).

## Contributing

Not open for code contributions yet. Questions and ideas are welcome as issues.

## License

To be decided before the first release.