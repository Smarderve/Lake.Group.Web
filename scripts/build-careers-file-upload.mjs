import { build } from 'esbuild';

await build({
  entryPoints: ['cms/src/careers-file-upload.tsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  jsx: 'automatic',
  target: ['es2020'],
  outfile: 'assets/careers-file-upload.js',
  loader: { '.css': 'text' },
});
