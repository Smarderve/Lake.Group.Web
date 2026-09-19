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
