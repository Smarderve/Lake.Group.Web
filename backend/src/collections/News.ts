import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access'

/**
 * News articles — mirrors window.LAKE_NEWS in assets/news-data.js:
 * id, title, date, category, bannerImage, description[] (paragraphs),
 * images[] and an optional video URL.
 */
export const News: CollectionConfig = {
  slug: 'news',
  labels: { singular: 'News Article', plural: 'News Articles' },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'date', 'category', 'status', 'updatedAt'],
    listSearchableFields: ['title', 'excerpt'],
  },
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: 'legacyId',
      type: 'number',
      admin: {
        description: 'ID from the legacy window.LAKE_NEWS dataset (seed migration).',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'URL slug — e.g. lake-gas-kenya-import-market',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'published',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Expansion', value: 'Expansion' },
        { label: 'LPG', value: 'LPG' },
        { label: 'Awards', value: 'Awards' },
        { label: 'Business', value: 'Business' },
        { label: 'Logistics', value: 'Logistics' },
        { label: 'Events', value: 'Events' },
        { label: 'Sports', value: 'Sports' },
        { label: 'CSR', value: 'CSR' },
        { label: 'Announcements', value: 'Announcements' },
      ],
      index: true,
    },
    {
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description: 'Short summary shown on news cards and meta descriptions.',
      },
    },
    {
      name: 'bannerImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'description',
      type: 'array',
      labels: { singular: 'Paragraph', plural: 'Paragraphs' },
      fields: [
        {
          name: 'paragraph',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'images',
      type: 'array',
      labels: { singular: 'Gallery image', plural: 'Gallery images' },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'videoUrl',
      type: 'text',
      admin: {
        description: 'Optional YouTube / external video URL.',
      },
    },
    {
      name: 'relatedCompanies',
      type: 'relationship',
      relationTo: 'companies',
      hasMany: true,
    },
    {
      name: 'countries',
      type: 'relationship',
      relationTo: 'countries',
      hasMany: true,
    },
  ],
}
