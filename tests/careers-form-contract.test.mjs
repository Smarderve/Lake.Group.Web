import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../cms/src/careers-file-upload.tsx', import.meta.url), 'utf8');
const component = await readFile(new URL('../cms/src/components/ui/file-upload.tsx', import.meta.url), 'utf8');
assert.match(source, /inputName="cv"/u, 'Careers upload must provide the backend multipart field name.');
assert.match(component, /name=\{inputName\}/u, 'The upload component must render the supplied multipart field name.');
console.log('CAREERS FORM MULTIPART CONTRACT: PASS');
