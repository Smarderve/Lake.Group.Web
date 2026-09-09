# Aceternity source record

These files are the exact registry UI payloads returned by the required
`@aceternity/globe-demo` and `@aceternity/3d-globe-demo` commands. The homepage
is a static React island, so the Next/Tailwind demo shells are not mounted as a
second canvas. Their ThreeGlobe arc pipeline, marker projection, bump/terrain
configuration and Fresnel atmosphere are adapted into the single Lake renderer.
