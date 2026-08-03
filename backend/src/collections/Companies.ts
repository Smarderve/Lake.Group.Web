import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access'

/**
 * Lake Group subsidiaries — mirrors the megamenu divisions
 * (energies, manufacturing, logistics, realestate, agro) and the
 * company pages (lake-oil.html, lake-steel.html, …).
 */
export const Companies: CollectionConfig = {
  slug: 'companies',
  labels: { singular: 'Company', plural: 'Companies' },
  admin: {
    useAsTitle: 'name',
    group: 'Company Data',
    defaultColumns: ['name', 'division', 'sortOrder'],
  },
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: 'name',
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
        description: 'URL slug — e.g. lake-oil, lake-steel',
      },
    },
    {
      name: 'division',
      type: 'select',
      required: true,
      options: [
        { label: 'Lake Energies', value: 'energies' },
        { label: 'Manufacturing', value: 'manufacturing' },
        { label: 'Logistics', value: 'logistics' },
        { label: 'Real Estate', value: 'realestate' },
        { label: 'Agro Processing', value: 'agro' },
      ],
    },
    {
      name: 'tagline',
      type: 'text',
      admin: { description: 'Short strap line under the company name.' },
    },
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'pageUrl',
      type: 'text',
      admin: {
        description: 'Legacy static page — e.g. lake-oil.html',
      },
    },
    {
      name: 'founded',
      type: 'text',
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 100,
      admin: { position: 'sidebar' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'headquarters',
      type: 'relationship',
      relationTo: 'countries',
      admin: { description: 'Country of headquarters.' },
    },
    {
      name: 'countries',
      type: 'relationship',
      relationTo: 'countries',
      hasMany: true,
    },
    {
      name: 'keyStats',
      type: 'array',
      labels: { singular: 'Key stat', plural: 'Key stats' },
      fields: [
        {
          name: 'label',
          type: 'text',
        },
        {
          name: 'value',
          type: 'text',
        },
      ],
    },
  ],
}
