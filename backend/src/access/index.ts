import type { Access } from 'payload'

/**
 * Content collections are publicly readable (the static website fetches
 * them), but only signed-in admin users may create / update / delete.
 */
export const isAuthenticated: Access = ({ req: { user } }) => Boolean(user)

export const isAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  return user.collection === 'users'
}
