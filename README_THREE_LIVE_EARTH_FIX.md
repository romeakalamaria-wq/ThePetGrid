ThePetGrid — THREE / Live Earth Fix

Root cause:
The page loaded globe.gl, but did not expose THREE as window.THREE.
Because the Atlas JavaScript checks `window.THREE`, these systems exited early:
- clouds
- custom lighting
- day/night shader

This patch:
- imports Three.js as an ES module
- exposes it as `window.THREE`
- loads world-experience.js only after Three.js is ready
- keeps the manual High/Lite quality fix

Replace:
pages/world-experience.html
js/world-experience.js

Then press Ctrl + Shift + R.
