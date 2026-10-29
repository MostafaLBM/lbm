# Joule–Thomson throttling

Standalone browser UI within the Thermodynamics II course site. Serve the course folder over HTTP (Start-local-preview.cmd); opening index.html as a file cannot load the module worker. No MATLAB or server calculations required.

## Model

Shared unmodified CoolProp 7.2.0 WebAssembly at ../vapor-compression/vendor/, with its MIT license and SOURCE.txt. No new property engine download is needed. Keep that folder when uploading the site. model.js evaluates h1(T1,p1), then solves T2(p2,h1). It computes mu = (T alpha - 1)/(rho cp) in single phase, expressed in K/MPa. Pressures in the interface are MPa absolute, temperature K, and table h/s are kJ/kg and kJ/(kg K).

The model assumes steady adiabatic flow, no shaft work, and negligible changes of bulk kinetic and potential energy. The ideal-gas comparison is analytical: T2=T1 and mu=0. It does not use real-fluid cp for a fictitious ideal gas. Quality is a vapor mass fraction, shown only at two-phase or saturated states. Hydrogen is normal hydrogen with no ortho–para conversion.

Inversion points are single-phase sign changes of mu on a pressure/temperature grid, refined by bisection and a residual check. Only the selected teaching range is searched; no claim of a complete inversion envelope is made. Property failures produce gaps or explicit errors. Curves show equilibrium states along an isenthalp, not the process inside the valve.

## Teaching

Seven fluids and seven presets connect Chapter 12 sections 12–4 and 12–5 to observable behavior. Controls and results scroll independently on desktop. Below 701px, shared Inputs/Results tabs preserve values and scroll positions. Native MathML displays equations without a network math dependency. Animated dots indicate flow direction only and respect reduced-motion settings.
