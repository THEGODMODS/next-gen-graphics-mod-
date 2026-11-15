# GOD NATURAL — production brief

## Product intent
A premium low-processing colour option for PES 2017 match presentation. It prioritises natural grass, faithful kit whites, believable skin tones and readable gameplay over cinematic effects.

## Source deliverables
- Six original 33³ Adobe `.cube` transforms: Neutral Reference, Daylight Balanced, Soft Overcast, Grass Faithful, Skin & Kit Neutral and Broadcast Natural.
- Custom 24-patch SVG visual comparison chart (not a certified colour target).
- Five scene-validation checks, profile index, deterministic generator and SHA-256 manifest.

## Integration gate
Adobe `.cube` does not specify input/output colour space. Verify the consuming host's primaries and transfer function. No PES 2017/YosfX loader, shader callback or in-game compatibility is claimed until an adapter and matched captures are verified.

## Non-destructive policy
Source library only. No original game, patch, CPK, executable, option file, stadium, kit or face assets are modified. Load one LUT at a time; disable the host reference to roll back.

## Acceptance
Validate daylight, overcast, grass/touchline, player close-up and broadcast-camera captures. Reject green/orange casts, shifted kit colours, crushed shadows, clipped highlights and any loss of ball/player readability.
