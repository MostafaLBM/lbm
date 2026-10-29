# Vapor-compression refrigeration - browser applet

Part of the Thermodynamics II course website. All applets share
`../../assets/applet.css`; this applet adds only refrigeration-specific styling.

## Features

- All 15 original refrigerants, including predefined pseudo-pure blends.
- All 30 original application presets, assumptions and explanations.
- Temperature or absolute-pressure controls with preserved cycle conditions.
- Numeric entry alongside every slider; bounds adapt to fluid and scenario.
- Superheat, subcooling, compressor efficiency and cooling load.
- Live T-s and logarithmic p-h diagrams, ideal compression reference,
  matching four-state schematic and full state table.
- COP, energy quantities, duty, mass/volume flow and refrigerant metadata.
- CO2 remains a subcritical cascade low-stage teaching model.

## Hosting and preview

Upload the complete course website to ONE GitHub Pages repository, retaining
the folder structure and vendor/coolprop.wasm. No backend or build is needed.
The browser loads CoolProp locally from this same repository; no external CDN
or computation service is used.

Unlike the simple Rankine applet, WebAssembly modules/workers require HTTP(S)
hosting in browsers. For a local preview run `Start-local-preview.cmd` at the
course root (requires Python), or `python -m http.server 8766 --bind 127.0.0.1`
from the course root, then open http://127.0.0.1:8766/ . This preview server only
serves files; all thermodynamic calculations still run in the browser worker.

## Numerical checks

390 independent MATLAB cycle references (360 operating cases + 30 presets)
passed using the same CoolProp 7.2.0 version. Maximum COP difference was
1.22e-12 and maximum state-enthalpy difference 3.54e-11 kJ/kg.
All 30 presets passed pressure/temperature equivalence and cooling-load scaling.
Complete process curves passed for all 15 fluids, including blend glide.
Energy balances, isenthalpic throttling and rejection of transcritical CO2
were checked. Validation code and reports are in the adjacent
Vapor-Compression-Web-Validation directory in D:\Simulations\MATLAB.

See THIRD-PARTY-NOTICES.txt for attribution and property-engine provenance.
