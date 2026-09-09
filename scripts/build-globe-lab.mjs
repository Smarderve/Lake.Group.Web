import { build } from 'esbuild';
import path from 'node:path';
await build({ entryPoints: ['globe-lab/entry.tsx'], bundle: true, minify: true, format: 'iife', platform: 'browser', jsx: 'automatic', target: ['es2020'], outfile: 'assets/globe-lab.bundle.js', loader: { '.json': 'json' }, alias: { '@': path.resolve('globe-lab') } });
