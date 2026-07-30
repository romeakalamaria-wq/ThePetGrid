(() => {
  "use strict";

  // A complete road map for MapLibre using OpenStreetMap raster tiles.
  // This keeps all maps visually consistent without an API key.
  window.ThePetGridMapStyle = {
    create() {
      return {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          "openstreetmap": {
            type: "raster",
            tiles: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
            maxzoom: 19
          }
        },
        layers: [
          {
            id: "openstreetmap-base",
            type: "raster",
            source: "openstreetmap",
            minzoom: 0,
            maxzoom: 19,
            paint: {
              "raster-opacity": 1,
              "raster-saturation": -0.08,
              "raster-contrast": 0.04,
              "raster-brightness-min": 0.04,
              "raster-brightness-max": 0.98
            }
          }
        ]
      };
    }
  };
})();
