const PREVIEW_BASE = 'https://lakegroup.invalid/';

function safeDestination(value, { allowContact = false } = {}) {
  if (typeof value !== 'string' || !value.trim() || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const url = new URL(value, PREVIEW_BASE);
    return url.protocol === 'https:' || (allowContact && (url.protocol === 'mailto:' || url.protocol === 'tel:'));
  } catch { return false; }
}

function leaves(value, path = '', output = {}) {
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) leaves(child, path ? `${path}.${key}` : key, output);
  } else {
    output[path] = value;
  }
  return output;
}

function display(value) {
  if (value === undefined) return '(empty)';
  const text = String(value);
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

export function reviewContentRelease({ definition, draft, published }) {
  const before = leaves(published ?? {});
  const after = leaves(draft);
  const allPaths = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  const changed = allPaths.filter((path) => before[path] !== after[path]);
  const issues = [];
  if (definition.kind === 'page') {
    if (!safeDestination(draft.hero.image)) issues.push({ severity: 'error', field: 'hero.image', message: 'Hero image must use an internal path or HTTPS URL.' });
    if (!safeDestination(draft.cta.href, { allowContact: true })) issues.push({ severity: 'error', field: 'cta.href', message: 'Button destination must use an internal path, HTTPS, mailto, or tel URL.' });
    if (draft.seo.canonical && !safeDestination(draft.seo.canonical)) issues.push({ severity: 'error', field: 'seo.canonical', message: 'Canonical URL must use an internal path or HTTPS URL.' });
    if (draft.seo.socialImage && !safeDestination(draft.seo.socialImage)) issues.push({ severity: 'error', field: 'seo.socialImage', message: 'Social image must use an internal path or HTTPS URL.' });
    if (draft.seo.index === false) issues.push({ severity: definition.route === 'index.html' ? 'error' : 'warning', field: 'seo.index', message: definition.route === 'index.html' ? 'The Home page must remain indexable.' : 'This page will be excluded from search engines.' });
    if (!draft.hero.alt?.trim()) issues.push({ severity: 'warning', field: 'hero.alt', message: 'Hero image has no alternative text.' });
    const keys = new Set();
    draft.sections.forEach((section, index) => {
      if (keys.has(section.key)) issues.push({ severity: 'error', field: `sections.${index}.key`, message: 'Section keys must be unique.' });
      keys.add(section.key);
    });
    draft.media.forEach((item, index) => {
      if (!safeDestination(item.src)) issues.push({ severity: 'error', field: `media.${index}.src`, message: 'Media source must use an internal path or HTTPS URL.' });
      if (!item.alt.trim()) issues.push({ severity: 'warning', field: `media.${index}.alt`, message: 'Media item has no alternative text.' });
    });
    const inspectComponents = (nodes = [], path = 'composition.root.children') => nodes.forEach((node, index) => {
      const field = `${path}.${index}`;
      if (node.content?.href && !safeDestination(node.content.href, { allowContact: true })) issues.push({ severity: 'error', field: `${field}.content.href`, message: 'Component destination is unsafe.' });
      if (node.content?.src && !safeDestination(node.content.src)) issues.push({ severity: 'error', field: `${field}.content.src`, message: 'Component media source is unsafe.' });
      if (node.style?.backgroundImage && !safeDestination(node.style.backgroundImage)) issues.push({ severity: 'error', field: `${field}.style.backgroundImage`, message: 'Component background image is unsafe.' });
      inspectComponents(node.children, `${field}.children`);
    });
    inspectComponents(draft.composition?.root?.children);
  }
  if (definition.kind === 'global') {
    const inspectNavigation = (items = [], path = 'navigation') => items.forEach((item, index) => {
      if (item.type !== 'parent' && !safeDestination(item.destination)) issues.push({ severity: 'error', field: `${path}.${index}.destination`, message: 'Navigation destination must use an internal path or HTTPS URL.' });
      inspectNavigation(item.children, `${path}.${index}.children`);
    });
    inspectNavigation(draft.navigation);
    draft.dataFields?.forEach((item, index) => { if (item.type === 'url' && !safeDestination(item.value)) issues.push({ severity: 'error', field: `dataFields.${index}.value`, message: 'Global URL is unsafe.' }); });
  }
  if (!changed.length) issues.push({ severity: 'warning', field: '', message: 'This revision has no changes from the currently published content.' });
  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
    changedFields: changed.length,
    changes: changed.slice(0, 80).map((field) => ({ field, before: display(before[field]), after: display(after[field]) })),
    truncated: changed.length > 80,
  };
}
