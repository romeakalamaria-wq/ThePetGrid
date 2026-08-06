# Atlas Phase 2 Runtime Fix

This patch fixes the browser startup failure by:

- removing the second, incompatible global Three.js build;
- allowing the standalone Globe.GL bundle to use its own matching Three.js runtime;
- removing unavailable `is_lost` and `is_memorial` fields from the base pets query;
- preserving Lost and Memorial UI modes for the next data-layer integration.

Deploy the three World Experience files and hard-refresh the page.
