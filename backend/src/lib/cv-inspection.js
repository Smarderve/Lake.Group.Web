import yauzl from 'yauzl';
import { formError } from './public-form-security.js';

export const MAX_CV_BYTES = 5 * 1024 * 1024;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const BAD_ENTRY = /(?:vbaProject\.bin|\.exe$|\.dll$|\.js$|\.vbs$|\.ole$|embeddings\/|activex\/|\.zip$|\.jar$)/iu;

async function inspectDocx(buffer) {
  await new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (openError, zip) => {
      if (openError || !zip) return reject(formError('UNSUPPORTED_FILE_TYPE'));
      const seen = new Set();
      let count = 0; let total = 0; let settled = false;
      const finish = (error) => { if (settled) return; settled = true; zip.close(); error ? reject(error) : resolve(); };
      const timer = setTimeout(() => finish(formError('UNSUPPORTED_FILE_TYPE')), 3000);
      const originalFinish = finish;
      const done = (error) => { clearTimeout(timer); originalFinish(error); };
      zip.on('error', () => done(formError('UNSUPPORTED_FILE_TYPE')));
      zip.on('entry', (entry) => {
        count += 1; total += entry.uncompressedSize;
        if (count > 2000 || total > 30 * 1024 * 1024 || entry.uncompressedSize > 15 * 1024 * 1024
          || (entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > 100)
          || (entry.generalPurposeBitFlag & 1) !== 0 || ![0, 8].includes(entry.compressionMethod)
          || BAD_ENTRY.test(entry.fileName) || entry.fileName.includes('..') || entry.fileName.startsWith('/')) {
          done(formError('UNSUPPORTED_FILE_TYPE')); return;
        }
        seen.add(entry.fileName);
        zip.readEntry();
      });
      zip.on('end', () => done(seen.has('[Content_Types].xml') && seen.has('word/document.xml')
        ? null : formError('UNSUPPORTED_FILE_TYPE')));
      zip.readEntry();
    });
  });
}

export async function inspectCv(file) {
  if (!file?.buffer?.length) throw formError('CV_REQUIRED');
  if (file.buffer.length > MAX_CV_BYTES) throw formError('FILE_TOO_LARGE', 413);
  const filename = file.originalname;
  if (typeof filename !== 'string' || filename.length > 160 || !/^[\p{L}\p{N}][\p{L}\p{N} _().-]*\.(pdf|docx)$/iu.test(filename)
    || filename.includes('..') || /[\u202a-\u202e\u2066-\u2069]/u.test(filename)
    || filename.split('.').length !== 2) throw formError('UNSUPPORTED_FILE_TYPE');
  const extension = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
  const mimeType = extension === 'pdf' ? 'application/pdf' : DOCX_MIME;
  if (file.mimetype !== mimeType) throw formError('UNSUPPORTED_FILE_TYPE');
  if (extension === 'pdf') {
    const raw = file.buffer.toString('latin1');
    if (!raw.startsWith('%PDF-') || !/%%EOF\s*$/u.test(raw)
      || !/\d+\s+\d+\s+obj/u.test(raw) || !/\/Root\s+\d+\s+\d+\s+R/u.test(raw)
      || !/startxref\s+\d+\s+%%EOF\s*$/u.test(raw)
      || /\/(?:JavaScript|JS|Launch|OpenAction|AA|EmbeddedFiles|RichMedia)\b/iu.test(raw)) {
      throw formError('UNSUPPORTED_FILE_TYPE');
    }
  } else await inspectDocx(file.buffer);
  return { filename, mimeType, buffer: file.buffer };
}
