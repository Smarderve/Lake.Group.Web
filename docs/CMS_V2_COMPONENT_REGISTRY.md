# CMS V2 component registry

`backend/src/lib/cms-v2-components.js` is the server authority and `cms/src/features/control-center/composition.ts` is the typed editor registry. Both define the same production component vocabulary, allowed children, defaults, protection rules, content, layout, style and responsive contracts.

Registered families are layout (`section`, `container`, `stack`, `grid`, `columns`), content (`heading`, `paragraph`, `rich-text`, `image`, `video`, `button`, `link`, `icon`, `list`) and Lake components (`corporate-hero`, `company-hero`, `image-text`, `text-image`, `stat-grid`, `stat-card`, `company-card`, `service-card`, `image-card`, `cta`, `gallery`, `logo-group`, `timeline-item`, `contact-block`, `business-vertical-card`). Heroes are protected from deletion. Invalid nesting, spans outside 1–12 and unlocked protected components fail server validation.
