# Application presets

Each row has two selectable scenarios. Values below are **evaporator dew C /
condenser bubble C / cooling load kW**. Superheat, subcooling and compressor
efficiency are specified in the app's scenario details and
`vapor_compression_scenarios.m`. These are representative teaching cases,
not manufacturer-certified ratings or instructions to substitute refrigerants.

| Refrigerant | Scenario 1 | Scenario 2 |
|---|---|---|
| R134a | Chilled-water plant: 2 / 40 / 100 | Legacy vehicle AC: 5 / 50 / 5 |
| R717 | Industrial brine cooler: -10 / 35 / 200 | Industrial cold store: -15 / 35 / 100 |
| R22 | Legacy comfort AC: 7 / 45 / 7 | Legacy cold room: -10 / 40 / 10 |
| R600a | Household refrigerator: -15 / 40 / 0.10 | Household freezer: -28 / 40 / 0.18 |
| R290 | Beverage cabinet: -5 / 40 / 0.5 | Commercial freezer: -25 / 40 / 1 |
| R32 | Room AC, moderate ambient: 7 / 40 / 3.5 | Room AC, hot ambient: 7 / 55 / 3.5 |
| R1234yf | Vehicle AC: 5 / 50 / 5 | Vehicle AC, hot ambient: 5 / 60 / 6 |
| R1234ze(E) | Chilled-water plant: 2 / 40 / 100 | Process chiller: 10 / 45 / 200 |
| R152a | Indirect brine cooler: -10 / 40 / 20 | Indirect chilled-water comparison: 2 / 40 / 30 |
| R410A | Installed split AC: 7 / 45 / 3.5 | Installed rooftop AC: 5 / 50 / 30 |
| R407C | Legacy R22-alternative DX AC: 7 / 45 / 10 | Installed water chiller: 2 / 40 / 80 |
| R404A | Existing medium-temperature DX: -6 / 40 / 100 | Existing freezer room: -30 / 40 / 10 |
| R507A | Existing cold room: -10 / 40 / 10 | Existing frozen-food store: -30 / 40 / 15 |
| R744 | Cascade freezer, low stage only: -35 / -5 / 25 | Cascade food cooling, low stage only: -10 / 10 / 40 |
| R12 | Historical refrigerator: -15 / 40 / 0.10 | Historical vehicle AC: 5 / 50 / 4 |

Changing the two saturation temperatures changes the thermodynamic lift.
Changing cooling load alone scales mass flow and powers without changing COP.
No compressor performance map, motor efficiency, piping losses or auxiliary
plant power is modeled. This is especially important for the cascade CO2
presets: their condensing temperature is maintained by another refrigeration
stage, not directly by warm outdoor air. The displayed COP is the low-stage COP.

## References used for application choices

- [Danfoss: applications and refrigerant types](https://www.danfoss.com/en-gb/about-danfoss/our-businesses/cooling/refrigerants-and-energy-efficiency/main-applications-and-refrigerant-types/)
- [Danfoss: refrigeration application selection](https://assets.danfoss.com/documents/latest/151244/AF189286419730en-040201.pdf)
- [Danfoss: ammonia and CO2 industrial handbook](https://assets.danfoss.com/documents/latest/470491/AB137786416217en-000801.pdf)
- [Danfoss: R1234ze(E) application guide](https://assets.danfoss.com/documents/latest/585425/AB395145937071en-000301.pdf)
- [INTARCON: indirect refrigeration, R152a and comparison operating points](https://www.intarcon.com/pdfs/EN/ce-Low-GWP-hfc-and-natural-refrigerant-applications-in-indirect-refrigeration-systems.pdf)
- [Arkema: R507A applications](https://www.arkema.com/global/en/products/product-finder/product/fluorochemicals/forane507a/)
- [Copeland: commercial CO2 handbook](https://www.copeland.com/documents/commercial-co2-handbook-en-us-5127714.pdf)
- [Honeywell: R1234yf automotive use](https://ess.honeywell.com/us/en/about-ess/newsroom/press-release/2024/09/honeywell-launches-program-to-reduce-environmental-impact-of-older-cars-enable-transition-to-low-global-warming-potential-refrigerants)
- [USDA: historical refrigerant applications](https://www.fs.usda.gov/t-d/pubs/pdfpubs/pdf98712835/pdf98712835.pdf)
- [NIST: International Table Btu definition](https://nvlpubs.nist.gov/nistpubs/Legacy/IR/nbsir81-2401.pdf)

Sources support application categories and refrigerant tradeoffs; numerical
defaults are illustrative unless a source happens to use the same point.
Current legal eligibility for an actual installation depends on its location
and equipment design and is not inferred by these presets.
