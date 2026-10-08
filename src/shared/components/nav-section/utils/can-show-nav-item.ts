import type { NavItemDataProps } from '../types';

// ----------------------------------------------------------------------

/**
 * Permission gate for a nav item.
 * Fail closed: if a permission is required but the checker was not wired, hide the item.
 */
export function isNavItemPermissionAllowed(
  item: Pick<NavItemDataProps, 'requiredPermission' | 'requiredPermissionAny'>,
  checkPermission?: (permission?: string) => boolean,
  checkPermissionAny?: (permissions: string[]) => boolean
): boolean {
  if (item.requiredPermissionAny?.length) {
    return Boolean(checkPermissionAny?.(item.requiredPermissionAny));
  }
  if (item.requiredPermission) {
    return Boolean(checkPermission?.(item.requiredPermission));
  }
  return true;
}

/** Check if item should be visible (mirrors NavList permission logic) */
export function canShowNavItem(
  item: NavItemDataProps,
  checkPermissions?: (allowedRoles?: NavItemDataProps['allowedRoles']) => boolean,
  checkPermission?: (permission?: string) => boolean,
  checkPermissionAny?: (permissions: string[]) => boolean
): boolean {
  if (item.allowedRoles && checkPermissions && checkPermissions(item.allowedRoles)) return false;
  if (!isNavItemPermissionAllowed(item, checkPermission, checkPermissionAny)) return false;
  if (item.children) {
    return item.children.some((child) =>
      canShowNavItem(child, checkPermissions, checkPermission, checkPermissionAny)
    );
  }
  return true;
}
