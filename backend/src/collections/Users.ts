import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

/**
 * Admin users who can sign in to /admin and manage content.
 * The first user is created through the Payload admin UI bootstrap flow.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    group: 'System',
    defaultColumns: ['email', 'name', 'role'],
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'editor',
      options: [
        { label: 'Editor', value: 'editor' },
        { label: 'Admin', value: 'admin' },
      ],
      admin: {
        description: 'Reserved for future fine-grained permissions.',
      },
    },
  ],
}
