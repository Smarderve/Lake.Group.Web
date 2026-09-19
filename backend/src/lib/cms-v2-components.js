import { z } from 'zod';

const componentTypes = [
  'section', 'container', 'stack', 'grid', 'columns',
  'heading', 'paragraph', 'rich-text', 'image', 'video', 'button', 'link', 'icon', 'list',
  'corporate-hero', 'company-hero', 'image-text', 'text-image', 'stat-grid', 'stat-card',
  'company-card', 'service-card', 'image-card', 'cta', 'gallery', 'logo-group',
  'timeline-item', 'contact-block', 'business-vertical-card',
];

const layoutChildren = componentTypes.filter((type) => !['corporate-hero', 'company-hero'].includes(type));
const leaf = [];
export const CMS_V2_COMPONENT_REGISTRY = Object.freeze({
  section: { category: 'layout', children: layoutChildren, protected: false },
  container: { category: 'layout', children: layoutChildren, protected: false },
  stack: { category: 'layout', children: layoutChildren, protected: false },
  grid: { category: 'layout', children: layoutChildren, protected: false },
  columns: { category: 'layout', children: layoutChildren, protected: false },
  heading: { category: 'content', children: leaf }, paragraph: { category: 'content', children: leaf },
  'rich-text': { category: 'content', children: leaf }, image: { category: 'media', children: leaf },
  video: { category: 'media', children: leaf }, button: { category: 'content', children: leaf },
  link: { category: 'content', children: leaf }, icon: { category: 'content', children: leaf }, list: { category: 'content', children: leaf },
  'corporate-hero': { category: 'lake', children: ['heading', 'paragraph', 'button'], protected: true },
  'company-hero': { category: 'lake', children: ['heading', 'paragraph', 'button'], protected: true },
  'image-text': { category: 'lake', children: ['heading', 'paragraph', 'image', 'button'] },
  'text-image': { category: 'lake', children: ['heading', 'paragraph', 'image', 'button'] },
  'stat-grid': { category: 'lake', children: ['stat-card'] }, 'stat-card': { category: 'lake', children: leaf },
  'company-card': { category: 'lake', children: leaf }, 'service-card': { category: 'lake', children: leaf },
  'image-card': { category: 'lake', children: leaf }, cta: { category: 'lake', children: ['heading', 'paragraph', 'button'] },
  gallery: { category: 'lake', children: ['image'] }, 'logo-group': { category: 'lake', children: ['image', 'link'] },
  'timeline-item': { category: 'lake', children: leaf }, 'contact-block': { category: 'lake', children: leaf },
  'business-vertical-card': { category: 'lake', children: leaf },
});

const span = z.number().int().min(1).max(12);
const partialLayout = z.object({
  span: span.optional(), columns: z.number().int().min(1).max(12).optional(), gap: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl']).optional(),
  padding: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl']).optional(), height: z.enum(['fit', 'small', 'medium', 'large', 'viewport', 'custom']).optional(),
  minHeight: z.number().int().min(0).max(2000).optional(), container: z.enum(['narrow', 'standard', 'wide', 'full']).optional(),
  align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
}).strict();
const style = z.object({
  background: z.enum(['none', 'white', 'light', 'deep-blue', 'light-blue', 'yellow', 'brand-gradient', 'image']).default('none'),
  backgroundImage: z.string().max(1000).optional(), overlay: z.number().min(0).max(1).optional(),
  radius: z.enum(['none', 'sm', 'md', 'lg']).default('none'), fit: z.enum(['cover', 'contain']).optional(),
  focalX: z.number().min(0).max(100).optional(), focalY: z.number().min(0).max(100).optional(),
}).strict();
const responsive = z.object({
  tablet: z.object({ layout: partialLayout.optional(), hidden: z.boolean().optional() }).strict().optional(),
  mobile: z.object({ layout: partialLayout.optional(), hidden: z.boolean().optional() }).strict().optional(),
}).strict();
const content = z.object({
  text: z.string().max(20000).optional(), heading: z.string().max(500).optional(), body: z.string().max(20000).optional(),
  label: z.string().max(160).optional(), src: z.string().max(1000).optional(), alt: z.string().max(500).optional(),
  href: z.string().max(1000).optional(), action: z.enum(['internal', 'external', 'email', 'telephone', 'anchor', 'file']).optional(),
  target: z.enum(['same', 'new']).optional(), variant: z.enum(['primary', 'secondary', 'outline', 'text']).optional(),
  size: z.enum(['small', 'medium', 'large']).optional(), icon: z.string().max(120).optional(),
  items: z.array(z.string().max(1000)).max(100).optional(), value: z.string().max(200).optional(), prefix: z.string().max(100).optional(), suffix: z.string().max(100).optional(),
  reference: z.object({ key: z.string().max(160), state: z.enum(['linked', 'override', 'detached', 'broken']), snapshot: z.string().max(1000).optional() }).strict().optional(),
}).strict();

export const cmsV2ComponentSchema = z.lazy(() => z.object({
  id: z.string().min(1).max(120), key: z.string().min(1).max(120), type: z.enum(componentTypes), name: z.string().min(1).max(160),
  visible: z.boolean().default(true), locked: z.boolean().default(false), reusableKey: z.string().max(160).optional(),
  content: content.default({}), layout: partialLayout.default({ span: 12 }), style: style.default({ background: 'none', radius: 'none' }),
  responsive: responsive.default({}), children: z.array(cmsV2ComponentSchema).max(120).default([]),
}).strict().superRefine((node, context) => {
  const definition = CMS_V2_COMPONENT_REGISTRY[node.type];
  for (const [index, child] of node.children.entries()) if (!definition.children.includes(child.type)) {
    context.addIssue({ code: 'custom', path: ['children', index, 'type'], message: `${child.type} is not allowed inside ${node.type}` });
  }
  if (definition.protected && !node.locked) context.addIssue({ code: 'custom', path: ['locked'], message: `${node.type} must remain protected` });
}));

export const cmsV2CompositionSchema = z.object({
  version: z.literal(1), root: z.object({
    id: z.literal('page'), key: z.literal('page'), type: z.literal('page'), name: z.string().min(1).max(160),
    children: z.array(cmsV2ComponentSchema).max(80),
  }).strict(),
}).strict();

export function validateCmsV2Composition(value) { return cmsV2CompositionSchema.safeParse(value); }

const key = (value) => String(value || 'component').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'component';
const legacyNode = (type, id, name, content, locked = false) => ({ id, key: id, type, name, visible: true, locked, content, layout: { span: 12 }, style: { background: type.includes('hero') || type === 'cta' ? 'deep-blue' : 'none', radius: type === 'cta' ? 'md' : 'none' }, responsive: {}, children: [] });
export function createDefaultComposition(name, data) {
  return { version: 1, root: { id: 'page', key: 'page', type: 'page', name, children: [
    legacyNode('company-hero', 'hero', 'Hero', { heading: data.hero.heading, body: data.hero.description, src: data.hero.image, alt: data.hero.alt }, true),
    legacyNode('image-text', 'introduction', 'Introduction', { heading: data.introduction.heading, body: data.introduction.body }),
    ...(data.sections || []).map((section, index) => legacyNode(index === 0 ? 'service-card' : 'section', `section-${key(section.key)}`, section.heading, { heading: section.heading, body: section.body })),
    legacyNode('cta', 'cta', 'Call to action', { heading: 'Ready to learn more?', label: data.cta.label, href: data.cta.href, action: 'internal', target: 'same', variant: 'primary', size: 'medium' }),
  ] } };
}
