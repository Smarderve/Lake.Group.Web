# Planet textures — source attribution

Public-domain / redistributable Earth maps used by `assets/hero-3d.js`
(`TEX_BASE = assets/images/planet/`).

## Loader filenames (required)

| File | Size | Source |
|------|------|--------|
| `earth_color_2048.jpg` | 2048×1024 | Resized from NASA Visible Earth Blue Marble (topo + bathymetry), Dec 2004 |
| `earth_specular_1024.jpg` | 1024×512 | Resized from three.js examples planet specular (NASA-derived water mask) |
| `earth_normal_1024.jpg` | 1024×512 | Resized from three.js examples planet normal (NASA-derived) |

## Optional

| File | Size | Source |
|------|------|--------|
| `earth_color_4096.jpg` | 4096×2048 | Same NASA Blue Marble source (not loaded by hero-3d yet) |
| `earth_clouds_1024.jpg` | 1024×512 | Resized from three.js examples clouds (not loaded by hero-3d yet) |

## Download URLs used (2026-07-20)

- Color (NASA Visible Earth):  
  https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg  
  Record: [Blue Marble: Land Surface, Ocean Color, Sea Ice and Clouds](https://visibleearth.nasa.gov/images/73909) (topo.bathy variant).
- Specular: https://threejs.org/examples/textures/planets/earth_specular_2048.jpg
- Normal: https://threejs.org/examples/textures/planets/earth_normal_2048.jpg
- Clouds: https://threejs.org/examples/textures/planets/earth_clouds_1024.png
- Related three.js color (reference only): https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg

Raw downloads cached under `scripts/_planet_src/` (gitignored).

## License note

NASA Visible Earth imagery is generally not copyrighted (U.S. government work).
The three.js example planet maps are the long-standing NASA-derived set redistributed
with three.js examples for educational/demo use.
