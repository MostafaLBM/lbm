# LBM website and six browser demos

This folder is the complete static website for a single GitHub Pages repository.
There is no build step or backend. Keep the directory structure intact.

## Files

- `index.html`: main menu and the six-demo launch page (`#play`).
- `how.html`, `research.html`, `research-ideas.html`, `gallery.html`: existing site pages.
- `demos/lid.html`: lid-driven cavity, including mouse/touch stirring.
- `demos/square.html`: flow over a square obstacle.
- `demos/porous.html`: random porous material with editable rock and tracers.
- `demos/droplet.html`: droplet impact, contact-angle and Weber controls, 100:1 density ratio and gas tracers; optimized for 24-fps rendering.
- `demos/invasion.html`: capillary invasion, pressure reservoirs, grain wetting, saturation and isolated-pocket readouts.
- `demos/convection.html`: natural convection with a D2Q5 temperature population, Rayleigh/Prandtl controls, heating reversal, warm/cool pulses and Nusselt diagnostics.
- `assets/`: shared styles and all existing gallery media.
- `.nojekyll`: publishes the static files directly.

All demo links are relative, so this works under any repository name. The six
simulations run on separate pages; visiting the menu does not run six solvers
at once. Each demo has links to the other demos and back to the main site.

## Publish in your existing GitHub Pages repository

1. Unzip the bundle if needed.
2. Upload the CONTENTS of this folder into the root of your existing website
   repository: the root must contain `index.html`, `assets/`, and `demos/`.
   Preserve the entire `assets/` folder. Do not upload only the ZIP or nest this
   folder beneath the existing root.
3. Commit the files to the branch used by GitHub Pages.
4. If publishing from a branch, use that branch and `/(root)` in Settings > Pages.
   If Pages is already configured for the root, keep that setting.
5. Visit the existing site and open Play. The demo URLs will be
   `<site-url>/demos/lid.html`, `square.html`, `porous.html`, `droplet.html`, `invasion.html`, and `convection.html`.

The separate demo repositories are no longer needed for the main site's launch
links. They can remain online for people who have bookmarked the old addresses.
This local bundle does not change or publish any remote GitHub repository.

## Preview locally

Open `index.html`, or serve this folder with `python -m http.server 8000` and visit
`http://localhost:8000/`. Fonts and MathJax use their existing CDN resources.

## Editing

Edit the HTML files directly. Add gallery images and videos under `assets/media/`.
Keep local links relative so deployments work under a repository subdirectory.
Videos remain on demand. Only web files are included; raw simulation output,
C++ binaries and development notes are not part of the public site.

## Capillary invasion

The fifth demo uses two immiscible fluids with equal density and viscosity on a
192x104 lattice. Surface tension is 0.008 and kinematic viscosity is 0.03 in
lattice units. The interface is rendered at phi=0.5. Nominal grain contact angles
span 35–145 degrees; the pressure difference spans 0–0.012. Reservoir pressure
changes are smoothed in simulation time. Contact-angle changes replay the same
rock; porosity and seed rebuild it. The inlet supplies invading fluid, and the
outlet extrapolates phase populations. Saturation excludes the inlet reservoir.
Pocket counts use four-neighbour connectivity of defending-fluid cells at the
phi=0.5 threshold, with a minimum of eight sample cells per pocket. They are a
visual diagnostic and do not imply permanently trapped fluid.

Validation: 12 cases passed 10,000 steps each, spanning zero/maximum pressure,
wetting extremes, porosities 56–78%, and three seeds. The default case also passed
20,000 steps, including breakthrough and subsequent displacement. Desktop and
mobile-sized browser checks passed, along with live pressure changes, replay,
all six local launch links and shared navigation. No physical-phone benchmark
or quantitative contact-angle/permeability validation is claimed.

## Natural convection

The sixth demo retains the D2Q9 shear-moment relaxation and factorized higher
moments used in the flow solver. A second, D2Q5 BGK population transports
temperature, with diffusivity alpha=(1/omega_T-0.5)/3. Buoyancy uses an
exact-difference equilibrium source that adds vertical momentum without density.
The thermal equilibrium uses the half-force-corrected physical velocity.
Buoyancy from the conductive profile is absorbed into the hydrostatic pressure;
temperature departures from that profile drive motion.

The domain is 256x64 fluid cells with periodic sides and no-slip plates.
Fixed-temperature anti-bounce-back acts at the half-link plate locations.
Ra ranges from 100 to 100,000 and Pr from 0.3 to 3. Free-fall speed is fixed at
0.07; nu=Uff*H*sqrt(Pr/Ra) and alpha=Uff*H/sqrt(Ra*Pr). Ra uses the magnitude
of the plate temperature difference. Heating direction is a separate control.
Heat pulses change only the thermal populations, and their temperature
increments are bounded. The conductive state is initialized with its
non-equilibrium heat flux plus a small deterministic temperature perturbation.
Rendering targets 24 fps with a 30 ms compute budget per frame.

Plate heat fluxes come from actual thermal-population exchange at the walls.
The visible Nusselt number averages the two normalized plate fluxes; it is an
instantaneous diagnostic. The solver also computes a volume-based convective
diagnostic. These need not agree during transients. The plots compare the
horizontal mean temperature with the conductive profile and show plate Nu.

Validation: 12 cases passed 25,000 steps each, covering low/high Ra, both Pr
extremes, both heating directions and an unperturbed conduction state.
Low-Ra disturbances decayed to Nu approximately 1, and bottom-heated cases
above onset developed convection. The largest cumulative heat-ledger residual
was below 3.5e-6 per fluid cell after 25,000 steps (single-precision populations).
Density conservation, the buoyancy momentum increment, pulse energy accounting,
and warm/cool controls were checked separately. Browser checks covered desktop,
a mobile-sized viewport, heating reversal, sliders and actual displayed code.
The model is qualitative at high Ra on this grid; no turbulence or
grid-converged high-Rayleigh-number accuracy is claimed.

Thermal setup reference:
https://openlb.gitlab.io/release/examples/thermal/rayleighBenard2d.html
