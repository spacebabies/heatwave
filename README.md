# Heatwave

A minimal, fast browser-based acoustic heatmap simulator built with Vite, TypeScript, and Canvas 2D.

## Overview

Heatwave is designed to simulate and visualize acoustic fields in a 2D room environment. The current prototype renders a fixed 40x20 meter room onto an 800x400 pixel HTML canvas (using a direct 20 pixels-per-meter scale) which is rendered twice (browser and PNG export).

We have evolved from a simple scalar distance-attenuation prototype to a fully interactive, fixed-frequency complex pressure solver (currently running at 63 Hz) with support for boundary reflections and real-time UI controls.

## Current Features

*   **Minimal Stack:** Built without any UI or CSS frameworks. Just pure TypeScript and standard HTML DOM + Canvas APIs.
*   **Acoustic Simulation (Complex Pressure Solver):**
    *   Evaluates a fixed frequency of 63 Hz (assuming 343 m/s speed of sound).
    *   Models sound propagation using full complex pressure summation: `p = (A / r) * exp(j * (-k * r + phaseOffset))`.
    *   Accounts for constructive and destructive interference (comb filtering).
    *   Calculates relative SPL in dB, normalized dynamically against the maximum value in the room.
    *   Uses 3D path distances to account for source height and listener plane height.
*   **Boundary Reflections:**
    *   First-order wall reflections via an image-source approach (plan view).
    *   First-order floor reflection (vertical image source).
    *   Adjustable reflection coefficients for different boundary materials.
*   **Interactive Control Panel:**
    *   Unstyled HTML UI allowing live updates to the simulation.
    *   Two editable subwoofers (Sub 1 and Sub 2) with X/Y coordinate controls.
    *   Cardioid direction control for each subwoofer (0° = Up, 90° = Right, etc.).
    *   Adjust listener height, subwoofer height, and dynamic range of the heatmap.
    *   Toggle wall and floor reflections on/off and edit their amplitude coefficients.
*   **Cardioid Directivity:**
    *   Uses a horizontal 2D directional cardioid approximation in the simulator: `gain = 0.5 * (1 + cos(delta))`.
    *   Does not model full manufacturer-specific internal enclosure geometry or delay offsets.
*   **Heatmap Rendering:**
    *   Maps the computed dynamic range to an HSL color gradient: `0 dB` (peak) maps to red, and `-XX dB` maps to blue.

## Notable Things

Maintain the web and PNG renderings in parallel, so they keep exact feature parity.

Never use inline CSS, put all CSS in the stylesheet.

Use rich, semantic HTML. Do not use a `<div>` when a `<fieldset>` would be more appropriate. Correctly apply autocomplete hints and aria-helpers when a11y cannot be achieved using semantic HTML.

## Where We Came From

1. **V1:** A simple `-20 * log10(d)` distance-only model that just visualized a single hotspot.
2. **V2:** A hardcoded complex pressure solver that demonstrated interference patterns (lobes and nulls) between two separated subwoofers.
3. **V3:** An interactive state-driven application with UI controls separated cleanly from a pure acoustic calculation module.

## To Do

- Refactor UI to use data-driven generation (config arrays rather than manual HTML strings).
- Allow Z-axis per sub
- Support absolute calibrated SPL.
- Frequency-agnostic solver (allow changing the frequency dynamically).
- Add ceiling reflection.
- Enhance the UI styling (if deemed necessary).
- **Vertical Stacking & Arrays:** Explore support for vertically stacked subwoofers (explicit array visualization or full Z-coordinate inputs in the UI) at a later stage.

## Why the project is being built this way

The project is being built in very small, inspectable steps.

Each significant change is meant to be:
1. visible in the browser
2. manually checked
3. committed separately

This keeps the math, rendering, and future acoustic changes easy to verify.

## Development

To run the development server:

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.
