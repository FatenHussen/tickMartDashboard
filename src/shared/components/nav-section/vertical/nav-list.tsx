import type { NavListProps, NavSubListProps } from '../types';

import { useBoolean } from 'minimal-shared/hooks';
import { useRef, useEffect, useCallback } from 'react';
import { isActiveLink, isExternalLink } from 'minimal-shared/utils';

import { usePathname } from 'src/routes/hooks';

import { NavItem } from './nav-item';
import { navSectionClasses } from '../styles';
import { isNavItemPermissionAllowed } from '../utils';
import { NavUl, NavLi, NavCollapse } from '../components';

// ----------------------------------------------------------------------

export function NavList({
  data,
  depth,
  render,
  slotProps,
  checkPermissions,
  checkPermission,
  checkPermissionAny,
  enabledRootRedirect,
}: NavListProps) {
  const pathname = usePathname();
  const navItemRef = useRef<HTMLButtonElement>(null);

  const isActive = isActiveLink(pathname, data.path, data.deepMatch ?? !!data.children);

  const { value: open, onFalse: onClose, onTrue: onOpen, onToggle } = useBoolean(false);

  useEffect(() => {
    if (!data.children) {
      return;
    }
    if (isActive) {
      onOpen();
    } else {
      onClose();
    }
  }, [pathname, isActive, data.children, onOpen, onClose]);

  const handleToggleMenu = useCallback(() => {
    if (data.children) {
      onToggle();
    }
  }, [data.children, onToggle]);

  const renderNavItem = () => (
    <NavItem
      ref={navItemRef}
      // slots
      path={data.path}
      icon={data.icon}
      info={data.info}
      title={data.title}
      caption={data.caption}
      // state
      open={open}
      active={isActive}
      disabled={data.disabled}
      // options
      depth={depth}
      render={render}
      hasChild={!!data.children}
      externalLink={isExternalLink(data.path)}
      enabledRootRedirect={enabledRootRedirect}
      // styles
      slotProps={depth === 1 ? slotProps?.rootItem : slotProps?.subItem}
      // actions
      onClick={handleToggleMenu}
    />
  );

  const renderCollapse = () =>
    !!data.children && (
      <NavCollapse mountOnEnter unmountOnExit depth={depth} in={open} data-group={data.title}>
        <NavSubList
          data={data.children}
          render={render}
          depth={depth}
          slotProps={slotProps}
          checkPermissions={checkPermissions}
          checkPermission={checkPermission}
          checkPermissionAny={checkPermissionAny}
          enabledRootRedirect={enabledRootRedirect}
        />
      </NavCollapse>
    );

  // Hidden item by role (legacy support)
  if (data.allowedRoles && checkPermissions && checkPermissions(data.allowedRoles)) {
    return null;
  }

  if (!isNavItemPermissionAllowed(data, checkPermission, checkPermissionAny)) {
    return null;
  }

  return (
    <NavLi
      disabled={data.disabled}
      className={data.children ? `[&_.${navSectionClasses.li}]:first:mt-[var(--nav-item-gap)]` : ''}
    >
      {renderNavItem()}
      {renderCollapse()}
    </NavLi>
  );
}

// ----------------------------------------------------------------------

function NavSubList({
  data,
  render,
  depth = 0,
  slotProps,
  checkPermissions,
  checkPermission,
  checkPermissionAny,
  enabledRootRedirect,
}: NavSubListProps) {
  return (
    <NavUl className="gap-[var(--nav-item-gap)]">
      {data.map((list) => (
        <NavList
          key={list.title}
          data={list}
          render={render}
          depth={depth + 1}
          slotProps={slotProps}
          checkPermissions={checkPermissions}
          checkPermission={checkPermission}
          checkPermissionAny={checkPermissionAny}
          enabledRootRedirect={enabledRootRedirect}
        />
      ))}
    </NavUl>
  );
}
