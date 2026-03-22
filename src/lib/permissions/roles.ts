export const ROLES = ['owner', 'admin', 'member', 'viewer', 'guest'] as const;
export type Role = (typeof ROLES)[number];

// Higher index = lower privilege
const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 0,
  admin: 1,
  member: 2,
  viewer: 3,
  guest: 4,
};

export function hasAtLeastRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] <= ROLE_HIERARCHY[requiredRole];
}
