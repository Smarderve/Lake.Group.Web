import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { parse } from 'parse5';
import { parse as parseJavaScript } from '@babel/parser';
import { PROTECTED_TERMS, TERMINOLOGY } from '../backend/src/lib/translation-glossary.js';

const root = process.cwd();
const publicTextTags = new Set(['a', 'button', 'caption', 'dd', 'dt', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'legend', 'li', 'option', 'p', 'span', 'strong', 'em', 'summary', 'td', 'th']);
const skipTags = new Set(['script', 'style', 'svg', 'noscript', 'template', 'code', 'pre']);
const excluded = /^(?:\d[\d\s.,%/+\-:$€£#]*|[A-Z]{2,4}|https?:\/\/\S+|mailto:\S+|tel:\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})$/;

function attrs(node) { return Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value])); }
function directText(node) { return (node.childNodes || []).filter((child) => child.nodeName === '#text').map((child) => child.value).join('').replace(/\s+/g, ' ').trim(); }
function descendantText(node) { return (node.childNodes || []).map((child) => child.nodeName === '#text' ? child.value : descendantText(child)).join('').replace(/\s+/g, ' ').trim(); }
function stableSelector(node) {
  const parts = [];
  for (let current = node; current?.tagName; current = current.parentNode) {
    const siblings = (current.parentNode?.childNodes || []).filter((child) => child.tagName === current.tagName);
    parts.unshift(`${current.tagName}:nth-of-type(${Math.max(1, siblings.indexOf(current) + 1)})`);
  }
  return parts.join(' > ');
}
function normalizeSource(text) { return String(text ?? '').replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en'); }
function visit(node, page, output, ancestry = [], covered = false, inventory = {}, suppressNestedText = false) {
  if (!node) return;
  const tag = node.tagName || '';
  if (!tag) {
    for (const child of node.childNodes || []) visit(child, page, output, ancestry, covered, inventory, suppressNestedText);
    return;
  }
  const a = attrs(node);
  const nowCovered = covered || Object.hasOwn(a, 'data-i18n');
  const route = [...ancestry, `${tag}${a.id ? `#${a.id}` : ''}${a.class ? `.${a.class.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`].slice(-5);
  if (a['data-i18n']) {
    const key = a['data-i18n'];
    inventory.keyedRefs?.push({ key, page, line: node.sourceCodeLocation?.startLine ?? null, rawText: descendantText(node), source: inventory.dictionary?.[key] ?? null });
  }
  for (const [attribute, keyAttribute] of [['placeholder', 'data-i18n-placeholder'], ['title', 'data-i18n-title'], ['alt', 'data-i18n-alt'], ['aria-label', 'data-i18n-aria']]) {
    if (a[keyAttribute]) inventory.keyedRefs?.push({ key: a[keyAttribute], page, line: node.sourceCodeLocation?.startLine ?? null, attribute, rawText: a[attribute] ?? '', source: inventory.dictionary?.[a[keyAttribute]] ?? null });
  }
  let suppressChildText = suppressNestedText;
  if (!nowCovered && !suppressNestedText && publicTextTags.has(tag) && !skipTags.has(tag)) {
    const text = descendantText(node);
    if (text.length > 1 && !excluded.test(text) && !a['aria-hidden']) {
      const before = output.length;
      addCandidate(output, page, `HTML ${tag} ${route.join(' > ')}`, text, node.sourceCodeLocation?.startLine, inventory.occurrenceCounts);
      if (output.length > before) {
        Object.assign(output.at(-1), { page, tag, route: route.join(' > '), targetSelector: stableSelector(node), renderMode: (node.childNodes || []).every((child) => child.nodeName === '#text' || child.nodeName === '#comment') ? 'text' : 'unsupported-structure' });
        suppressChildText = true;
      }
    }
  }
  if (!nowCovered && ['img', 'input', 'textarea', 'button', 'meta'].includes(tag)) {
    for (const attribute of ['alt', 'aria-label', 'placeholder', 'title', ...(tag === 'meta' && a.name === 'description' ? ['content'] : [])]) {
      const text = a[attribute]?.trim();
      if (!text || text.length < 2 || excluded.test(text)) continue;
      const before = output.length;
      addCandidate(output, page, `HTML ${tag} ${attribute} ${route.join(' > ')}`, text, node.sourceCodeLocation?.startLine, inventory.occurrenceCounts);
      if (output.length > before) Object.assign(output.at(-1), { page, tag, attribute, route: route.join(' > '), targetSelector: stableSelector(node), targetAttribute: attribute, renderMode: 'attribute' });
    }
  }
  if (skipTags.has(tag)) return;
  for (const child of node.childNodes || []) visit(child, page, output, route, nowCovered, inventory, suppressChildText);
}

const translatableAttributes = new Set(['alt', 'aria-label', 'placeholder', 'title', 'label']);
function addCandidate(output, file, context, value, line, occurrenceCounts = new Map()) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length < 2 || excluded.test(text)) return;
  const normalized = text.toLocaleLowerCase('en').replace(/[\s\u00a0]+/g, ' ');
  const brand = PROTECTED_TERMS.find((term) => normalized === term.toLocaleLowerCase('en')) || (context.includes('nav-logo') && normalized === 'lake' ? 'Lake' : null);
  const technicalTerm = TERMINOLOGY.find((term) => normalized.includes(term.source.toLocaleLowerCase('en')));
  const classification = brand ? 'protected-brand' : technicalTerm ? 'terminology-review' : file.startsWith('cms/') || file.startsWith('backend/') || file.startsWith('scripts/') ? 'cms-interface-copy' : file.endsWith('.html') ? 'public-visitor-copy' : 'runtime-ui-copy';
  const base = crypto.createHash('sha256').update(`${file}\0${context}\0${line ?? 0}`).digest('hex').slice(0, 16);
  const occurrence = occurrenceCounts.get(base) || 0;
  occurrenceCounts.set(base, occurrence + 1);
  const id = occurrence ? `auto.${base}.${occurrence + 1}` : `auto.${base}`;
  output.push({ id, file, context, line: line ?? null, source: text, sourceHash: crypto.createHash('sha256').update(text).digest('hex'), classification, status: brand ? 'protected' : 'missing' });
}

export function extractJavaScript(source, file = 'source.jsx') {
  const extension = path.extname(file).toLowerCase();
  const plugins = extension === '.tsx' ? ['jsx', 'typescript', 'decorators-legacy'] : extension === '.ts' ? ['typescript', 'decorators-legacy'] : ['jsx', 'decorators-legacy'];
  const ast = parseJavaScript(source, { sourceType: 'unambiguous', plugins });
  const entries = [];
  const occurrenceCounts = new Map();
  const unsupportedPatterns = [];
  const translationKeys = [];
  function walk(node, parents = [], parentNode = null) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXText') { const before = entries.length; addCandidate(entries, file, 'JSX text', node.value, node.loc?.start.line, occurrenceCounts); if (entries.length > before) entries.at(-1).renderMode = 'runtime-text'; }
    if (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression' && node.callee.property?.name === 't' && node.arguments?.[0]?.type === 'StringLiteral' && (node.callee.object?.name === 'LakeI18n' || node.callee.object?.property?.name === 'LakeI18n')) translationKeys.push(node.arguments[0].value);
    if (node.type === 'JSXAttribute' && translatableAttributes.has(node.name?.name)) {
      const value = node.value?.type === 'StringLiteral' ? node.value.value : node.value?.type === 'JSXExpressionContainer' && node.value.expression?.type === 'StringLiteral' ? node.value.expression.value : null;
      if (value !== null) { const before = entries.length; addCandidate(entries, file, `JSX ${node.name.name}`, value, node.loc?.start.line, occurrenceCounts); if (entries.length > before) { entries.at(-1).renderMode = 'runtime-attribute'; entries.at(-1).targetAttribute = node.name.name; } }
    }
    if (node.type === 'AssignmentExpression' && node.left?.type === 'MemberExpression') {
      const member = node.left.computed ? node.left.property?.value : node.left.property?.name;
      const value = node.right?.type === 'StringLiteral' ? node.right.value : null;
      if (value !== null && ['textContent', 'innerText', 'placeholder', 'title', 'ariaLabel'].includes(member)) { const before = entries.length; addCandidate(entries, file, `DOM ${member}`, value, node.loc?.start.line, occurrenceCounts); if (entries.length > before) { entries.at(-1).renderMode = member === 'placeholder' || member === 'title' || member === 'ariaLabel' ? 'runtime-attribute' : 'runtime-text'; entries.at(-1).targetAttribute = member === 'ariaLabel' ? 'aria-label' : member === 'textContent' || member === 'innerText' ? null : member; } }
      else if (value === null && ['textContent', 'innerText', 'placeholder', 'title', 'ariaLabel'].includes(member)) unsupportedPatterns.push({ file, line: node.loc?.start.line, status: 'unsupported-runtime-content', context: `DOM ${member}` });
    }
    if (node.type === 'JSXExpressionContainer' && !['StringLiteral', 'JSXEmptyExpression'].includes(node.expression?.type)) {
      const parentType = parents.at(-1);
      const visibleProp = parentType === 'JSXAttribute' && translatableAttributes.has(parentNode?.name?.name);
      if (parentType === 'JSXElement' || visibleProp) unsupportedPatterns.push({ file, line: node.loc?.start.line, status: 'unsupported-runtime-content', context: visibleProp ? 'dynamic visible JSX attribute' : 'dynamic JSX child' });
    }
    const next = [...parents, node.type];
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'tokens' || key === 'comments') continue;
      if (Array.isArray(value)) value.forEach((child) => walk(child, next, node));
      else if (value && typeof value === 'object') walk(value, next, node);
    }
  }
  walk(ast);
  Object.defineProperty(entries, 'unsupportedPatterns', { value: unsupportedPatterns });
  Object.defineProperty(entries, 'translationKeys', { value: translationKeys });
  return entries;
}

function sourceFiles(directory) {
  const files = [];
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    if (item.name === 'node_modules' || item.name === '.generated' || item.name.startsWith('_')) continue;
    const full = path.join(directory, item.name);
    if (item.isDirectory()) files.push(...sourceFiles(full));
    else if (/\.(?:js|jsx|ts|tsx)$/.test(item.name) && !full.includes(`${path.sep}tests${path.sep}`)) files.push(full);
  }
  return files;
}

export function extractPublicHtml(directory = root) {
  const entries = [];
  const extractionErrors = [];
  const unsupportedPatterns = [];
  const keyedRefs = [];
  const occurrenceCounts = new Map();
  const scriptFilesByPage = {};
  const dictionaryPath = path.join(directory, 'assets', 'i18n-content.json');
  const dictionary = fs.existsSync(dictionaryPath) ? JSON.parse(fs.readFileSync(dictionaryPath, 'utf8')).en || {} : {};
  const pages = fs.readdirSync(directory, { withFileTypes: true }).filter((item) => item.isFile() && item.name.endsWith('.html')).map((item) => item.name).sort();
  for (const page of pages) {
    const document = parse(fs.readFileSync(path.join(directory, page), 'utf8'), { sourceCodeLocationInfo: true });
    visit(document, page, entries, [], false, { dictionary, keyedRefs, occurrenceCounts });
    const refs = [];
    const collectScripts = (node) => {
      if (node?.tagName === 'script') {
        const source = attrs(node).src;
        if (source && !/^(?:[a-z]+:|\/\/)/i.test(source)) refs.push(source.split(/[?#]/, 1)[0].replace(/^\.\//, ''));
        else if (source?.startsWith('/')) refs.push(source.slice(1).split(/[?#]/, 1)[0]);
      }
      (node?.childNodes || []).forEach(collectScripts);
    };
    collectScripts(document);
    scriptFilesByPage[page] = [...new Set(refs)];
  }
  const scripts = ['assets', 'scripts', 'cms', 'backend/src'].map((name) => path.join(directory, name)).filter((name) => fs.existsSync(name)).flatMap(sourceFiles);
  const codeKeys = new Set();
  for (const file of scripts) {
    const relative = path.relative(directory, file).replaceAll(path.sep, '/');
    try {
      const found = extractJavaScript(fs.readFileSync(file, 'utf8'), relative);
      entries.push(...found);
      unsupportedPatterns.push(...found.unsupportedPatterns);
      found.translationKeys.forEach((key) => codeKeys.add(key));
    }
    catch (error) { extractionErrors.push({ file: relative, status: 'unsupported-syntax', reason: error.message.split('\n')[0] }); }
  }
  const groups = new Map();
  for (const entry of entries) {
    const key = `${entry.context}\0${entry.source.toLocaleLowerCase('en').replace(/\s+/g, ' ')}`;
    const group = groups.get(key) || [];
    group.push(entry.id);
    groups.set(key, group);
  }
  const duplicates = [...groups.values()].filter((ids) => ids.length > 1).map((ids) => ({ count: ids.length, ids }));
  const classifications = Object.fromEntries(entries.reduce((counts, entry) => counts.set(entry.classification, (counts.get(entry.classification) || 0) + 1), new Map()));
  const sourceDrift = keyedRefs.filter((ref) => !ref.source || (ref.rawText && normalizeSource(ref.rawText) !== normalizeSource(ref.source))).map((ref) => ({ ...ref, status: ref.source ? 'source-outdated' : 'missing-key' }));
  const referencedKeys = new Set([...keyedRefs.map((ref) => ref.key), ...codeKeys]);
  const orphanedDictionaryKeys = Object.keys(dictionary).filter((key) => !referencedKeys.has(key));
  return { schemaVersion: 2, generatedAt: new Date().toISOString(), locales: ['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'], translationStatus: 'pending-benchmark', pagesScanned: pages.length, sourceFilesScanned: scripts.length, scriptFilesByPage, entries, classifications, duplicates, unsupportedPatterns, extractionErrors, sourceDrift, orphanedDictionaryKeys };
}

export function compareExtractionSnapshots(previous, current) {
  const oldById = new Map((previous?.entries || []).map((entry) => [entry.id, entry]));
  const newById = new Map(current.entries.map((entry) => [entry.id, entry]));
  return {
    added: [...newById.keys()].filter((id) => !oldById.has(id)).length,
    changed: [...newById].filter(([id, entry]) => oldById.has(id) && oldById.get(id).sourceHash !== entry.sourceHash).length,
    removed: [...oldById.keys()].filter((id) => !newById.has(id)).length,
  };
}

/** Build-only handoff: source strings and hashes are jobs, never translations. */
export function buildTranslationManifest(extraction) {
  return {
    schemaVersion: 1,
    manifestType: 'lake-group-hardcoded-translation-jobs',
    generatedAt: extraction.generatedAt,
    sourceRevision: process.env.GIT_COMMIT || null,
    translationStatus: 'pending-engine-and-review',
    targetLanguages: extraction.locales,
    entries: extraction.entries.filter((entry) => {
      if (entry.status === 'protected' || entry.classification === 'cms-interface-copy') return false;
      if (entry.page) return ['public-visitor-copy', 'terminology-review'].includes(entry.classification);
      const applicablePages = Object.entries(extraction.scriptFilesByPage || {}).filter(([, files]) => files.includes(entry.file)).map(([page]) => page);
      if (!applicablePages.length) return false;
      return ['runtime-ui-copy', 'terminology-review'].includes(entry.classification);
    }).map((entry) => ({
      id: entry.id, file: entry.file, context: entry.context, line: entry.line, page: entry.page ?? null,
      source: entry.source, sourceHash: entry.sourceHash, classification: entry.classification,
      targetSelector: entry.targetSelector ?? null, targetAttribute: entry.targetAttribute ?? null, renderMode: entry.renderMode ?? 'source-only',
      applicablePages: entry.page ? [entry.page] : Object.entries(extraction.scriptFilesByPage || {}).filter(([, files]) => files.includes(entry.file)).map(([page]) => page),
    })),
    removedIds: extraction.changesSincePreviousLocalScan?.removedIds ?? [],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = extractPublicHtml();
  const outputArg = process.argv.indexOf('--output');
  const output = path.resolve((outputArg >= 0 && process.argv[outputArg + 1]) || 'scripts/.generated/i18n-extraction-queue.json');
  let changes = { added: result.entries.length, changed: 0, removed: 0 };
  try {
    const previous = JSON.parse(fs.readFileSync(output, 'utf8'));
    changes = compareExtractionSnapshots(previous, result);
  } catch { /* first local baseline */ }
  result.changesSincePreviousLocalScan = changes;
  const previous = (() => { try { return JSON.parse(fs.readFileSync(output, 'utf8')); } catch { return null; } })();
  result.changesSincePreviousLocalScan = { ...changes, removedIds: (previous?.entries || []).map(({ id }) => id).filter((id) => !result.entries.some((entry) => entry.id === id)) };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  const manifestOutput = path.resolve('scripts/.generated/i18n-translation-manifest.json');
  fs.writeFileSync(manifestOutput, `${JSON.stringify(buildTranslationManifest(result), null, 2)}\n`);
  console.log(`Extraction queue written to ${path.relative(root, output)}`);
  console.log(`i18n extraction: ${result.pagesScanned} HTML pages, ${result.sourceFilesScanned} JS/JSX/TS/TSX files, ${result.entries.length} candidates, ${result.duplicates.length} duplicate groups, ${result.unsupportedPatterns.length} dynamic patterns, ${result.extractionErrors.length} parser failures.`);
  console.log(`Classification: ${JSON.stringify(result.classifications)}; local source changes since previous scan: ${JSON.stringify(changes)}. All targets remain pending benchmark.`);
}
