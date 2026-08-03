import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access'

/**
 * Countries of operation — mirrors assets/africa-network-map.js
 * (COUNTRY_META + OPS_ISO) plus the flag assets/images/flags/*.svg.
 */
export const Countries: CollectionConfig = {
  slug: 'countries',
  labels: { singular: 'Country', plural: 'Countries' },
  admin: {
    useAsTitle: 'name',
    group: 'Company Data',
    defaultColumns: ['name', 'code', 'isOperational', 'isHeadquarters'],
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
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'ISO 3166-1 alpha-2 — e.g. TZ, KE, ZM',
      },
    },
    {
      name: 'isOperational',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'isHeadquarters',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'flag',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'summary',
      type: 'textarea',
      admin: {
        description: 'Shown on the operations map country panel.',
      },
    },
    {
      name: 'lat',
      type: 'number',
      admin: { description: 'Map center latitude.' },
    },
    {
      name: 'lng',
      type: 'number',
      admin: { description: 'Map center longitude.' },
    },
    {
      name: 'defaultZoom',
      type: 'number',
      defaultValue: 6,
    },
    {
      name: 'subsidiaryCount',
      type: 'number',
      admin: { description: 'Number of Lake Group subsidiaries in this country.' },
    },
  ],
}
