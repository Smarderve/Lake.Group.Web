const fs=require('fs');
const s=fs.readFileSync('assets/assistant.js','utf8');
console.log('pointerdown', s.includes('onDocumentPointerDown'));
console.log('Escape doc', s.includes('onDocumentKeydown'));
console.log('logoHeight', fs.readFileSync('assets/components/logo-loop-mount.js','utf8').match(/logoHeight: \d+/));
const m=fs.readFileSync('index.html','utf8').match(/marquee-wrap \{[\s\S]*?padding:[^;]+/);
console.log('marquee pad', m ? m[0] : null);
