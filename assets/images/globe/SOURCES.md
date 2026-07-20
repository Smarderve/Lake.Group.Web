# Globe textures — source attribution

Local equirectangular Earth maps used by `assets/hero-globe/`
(`TEX_BASE = assets/images/globe/`). No CDN at runtime.

## Loader filenames (required)

| File | Approx size | Source |
|------|-------------|--------|
| `earth_day.jpg` | 2048×1024 · ~380 KB | NASA Visible Earth Blue Marble topo+bathymetry (Dec 2004), resized from prior `assets/images/planet/earth_color_2048.jpg` |
| `earth_topology.png` | topology / bump · ~370 KB | three-globe example `earth-topology.png` (NASA-derived elevation for bump mapping) |
| `earth_clouds.jpg` | 1024×512 · ~140 KB | Spare cloud layer (current `react-globe.gl` / `three-globe` has no clouds API; kept for future use) |
| `earth_bump.jpg` | 1024×512 · ~69 KB | Spare normal map (not loaded; topology used for `bumpImageUrl`) |

## Download / provenance URLs (build-time only)

- Color (NASA Visible Earth):  
  https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg  
  Record: [Blue Marble](https://visibleearth.nasa.gov/images/73909)
- Topology (bump): https://unpkg.com/three-globe/example/img/earth-topology.png
- Clouds: https://threejs.org/examples/textures/planets/earth_clouds_1024.png

Raw downloads may be cached under `scripts/_planet_src/` (gitignored).

## License note

NASA Visible Earth imagery is generally not copyrighted (U.S. government work).
The three.js / three-globe example planet maps are the long-standing NASA-derived
set redistributed for educational/demo use.
