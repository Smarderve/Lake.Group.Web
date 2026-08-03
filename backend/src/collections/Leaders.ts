import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access'

/**
 * Leadership profiles — mirrors the leadership-*.html pages:
 * photo, role, unit, lede, bio paragraphs, quote, mandate list,
 * fact grid and the featured Executive Chairman slot.
 */
export const Leaders: CollectionConfig = {
  slug: 'leaders',
  labels: { singular: 'Leader', plural: 'Leaders' },
  admin: {
    useAsTitle: 'name',
    group: 'Content',
    defaultColumns: ['name', 'role', 'featured', 'sortOrder'],
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
      name: 'role',
      type: 'text',
      required: true,
      admin: {
        description: 'Job title — e.g. Executive Chairman & Owner',
      },
    },
    {
      name: 'unit',
      type: 'text',
      admin: {
        description: 'Division label — e.g. Group Leadership',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'URL slug — e.g. ally-edha-awadh',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 100,
      admin: { position: 'sidebar' },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'isLogo',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Render the company logo instead of a photo on directory cards.',
      },
    },
    {
      name: 'lede',
      type: 'textarea',
      admin: {
        description: 'One-line summary shown at the top of the profile.',
      },
    },
    {
      name: 'bio',
      type: 'richText',
    },
    {
      name: 'quote',
      type: 'textarea',
    },
    {
      name: 'mandate',
      type: 'array',
      labels: { singular: 'Responsibility', plural: 'Responsibilities' },
      fields: [
        {
          name: 'item',
          type: 'text',
        },
      ],
    },
    {
      name: 'facts',
      type: 'array',
      labels: { singular: 'Fact', plural: 'Facts' },
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
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
      admin: {
        description: 'Optional link to the leader’s subsidiary.',
      },
    },
  ],
}
