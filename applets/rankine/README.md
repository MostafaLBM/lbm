# Rankine cycle - browser version

Open `index.html` in a current browser. No MATLAB Runtime, installation, server,
external fonts, CDN scripts, or network connection is required for calculations.

## Controls

Every slider has a numeric box. Type a value and press Enter or leave the field
to apply it. Pressure units are shown beside each box. Both controls share the
same bounds; optional pressures are constrained by the current cycle topology.
The boiler temperature cannot fall below its saturation temperature. Reset
restores the original 10 kPa / 8 MPa / 480 C ideal-device cycle.

Includes simple and reheated cycles, open and closed feedwater heaters,
trap/pump drain arrangements, a T-s diagram, flow schematic, state properties,
extraction fractions, heat and work. State IDs retain the original MATLAB
conventions. On small screens, swipe the diagram/table panels sideways.

## GitHub Pages

Upload the contents of the supplied ZIP to a separate public repository, with
`index.html` at its root. Keep `vendor/` intact. Enable Settings > Pages >
Deploy from a branch > main > / (root). No build command is needed.

This is a standalone course app; the research recruitment website is unchanged.

## Numerical validation

The D:\Simulations\MATLAB\Rankine-Web project also contains `validate.cjs`
and `validation/generate_reference.m`. The latter uses the original models
in the adjacent RankineApplet_Source folder to produce independent reference
data. Run `node validate.cjs validation/matlab-reference.json` for comparison.

493 MATLAB reference cases passed, covering simple cycles, reheat, both heater
choices, both drain choices, efficiencies and pressure ranges. Maximum absolute
differences in that set:

- Thermal efficiency: 0.000074953 (0.00750 percentage points).
- Net work: 0.2361 kJ/kg.
- State temperature: 0.0668 C.
- State enthalpy: 0.2104 kJ/kg.

Forward-EOS inversions in this version differ slightly from XSteam's backward
equations. Results are not claimed to be bit-identical. Energy, drain-throttle,
mixing and state-ID checks passed. A further 72 reheat-pressure boundary cases
passed heat/work and energy-balance checks. The test suite also includes two
standard IF97 property check points.

Chrome desktop and touch/mobile emulation checks cover numeric/slider sync,
range clamping, reheat, both heater controls, drain switching, Reset, and page
overflow. This does not replace testing on a physical phone.

See THIRD-PARTY-NOTICES.txt for steam-property attribution and modifications.

## Supercritical boiler extension

Boiler pressure now spans 0.5-30 MPa in both slider and numeric input. At and
above 22.064 MPa the minimum outlet temperature is 374 C; saturation-based
temperature limits are used only below critical pressure. Heater extraction
pressures stay below critical pressure. The original MATLAB files are unchanged.

Added continuous dense-fluid inversion, stable density-branch selection, and
near-critical coexistence handling. The original 493 MATLAB cases still pass.
168 further simple/reheat cases and 48 heater/drain configurations were checked
with finite process curves and energy balances. Published IF97 region-3
check points were reproduced within 3e-7 kJ/kg in enthalpy.

Comparison with CoolProp IF97 backward-equation results over the new cases
shows a maximum efficiency difference of 0.0498 percentage points, located
within 0.054 C of the critical temperature. Near criticality, small differences
in backward density approximations amplify strongly; this version refines the
fundamental pressure equation. Away from that narrow critical-temperature
neighborhood the comparison is substantially closer. See the validation report
in D:\Simulations\MATLAB\Rankine-Web\validation for exact residuals.
