import type { NavListProps, NavSubListProps } from '../types';

import { usePopoverHover } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';
import { isActiveLink, isExternalLink } from 'minimal-shared/utils';

import { usePathname } from 'src/routes/hooks';

import { NavItem } from './nav-item';
import { navSectionClasses } from '../styles';
import { isNavItemPermissionAllowed } from '../utils';
import { NavUl, NavLi, NavDropdown, NavDropdownPaper } from '../components';

// ----------------------------------------------------------------------

export function NavList({
  data,
  depth,
  render,
  cssVars,
  slotProps,
  checkPermissions,
  checkPermission,
  checkPermissionAny,
  enabledRootRedirect,
}: NavListProps) {
  const [isRtl, setIsRtl] = useState(false);

  useEffect(() => {
    setIsRtl(document.documentElement.dir === 'rtl');
  }, []);

  const pathname = usePathname();

  const isActive = isActiveLink(pathname, data.path, data.deepMatch ?? !!data.children);

  const {
    open,
    onOpen,
    onClose,
    anchorEl,
    elementRef: navItemRef,
  } = usePopoverHover<HTMLButtonElement>();

  const id = open ? `${data.title}-popover` : undefined;

  useEffect(() => {
    // If the pathname changes, close the menu
    if (open) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleOpenMenu = useCallback(() => {
    if (data.children) {
      onOpen();
    }
  }, [data.children, onOpen]);

  const handleToggleMenu = useCallback(() => {
    if (data.children) {
      if (open) {
        onClose();
      } else {
        onOpen();
      }
    }
  }, [data.children, open, onOpen, onClose]);

  const renderNavItem = () => (
    <NavItem
      ref={navItemRef}
      aria-describedby={id}
      // slots
      title={data.title}
      path={data.path}
      icon={data.icon}
      info={data.info}
      caption={data.caption}
      // state
      active={isActive}
      open={open}
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
      onMouseEnter={handleOpenMenu}
      onMouseLeave={onClose}
    />
  );

  const renderDropdown = () =>
    !!data.children && (
      <NavDropdown
        disableScrollLock
        aria-hidden={!open}
        id={id}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={
          depth === 1
            ? { vertical: 'bottom', horizontal: isRtl ? 'right' : 'left' }
            : { vertical: 'center', horizontal: isRtl ? 'left' : 'right' }
        }
        transformOrigin={
          depth === 1
            ? { vertical: 'top', horizontal: isRtl ? 'right' : 'left' }
            : { vertical: 'center', horizontal: isRtl ? 'right' : 'left' }
        }
        slotProps={{
          paper: {
            onMouseEnter: handleOpenMenu,
            onMouseLeave: onClose,
            className: navSectionClasses.dropdown.root,
            style: depth === 1 ? { paddingTop: '8px', marginLeft: '-6px' } : undefined,
          },
        }}
        style={cssVars}
      >
        <NavDropdownPaper
          className={navSectionClasses.dropdown.paper}
          {...slotProps?.dropdown?.paper}
        >
          <NavSubList
            data={data.children}
            depth={depth}
            render={render}
            cssVars={cssVars}
            slotProps={slotProps}
            checkPermissions={checkPermissions}
            checkPermission={checkPermission}
            checkPermissionAny={checkPermissionAny}
            enabledRootRedirect={enabledRootRedirect}
          />
        </NavDropdownPaper>
      </NavDropdown>
    );

  // Hidden item by role (legacy support)
  if (data.allowedRoles && checkPermissions && checkPermissions(data.allowedRoles)) {
    return null;
  }

  if (!isNavItemPermissionAllowed(data, checkPermission, checkPermissionAny)) {
    return null;
  }

  return (
    <NavLi disabled={data.disabled}>
      {renderNavItem()}
      {renderDropdown()}
    </NavLi>
  );
}

// ----------------------------------------------------------------------

function NavSubList({
  data,
  render,
  cssVars,
  depth = 0,
  slotProps,
  checkPermissions,
  checkPermission,
  checkPermissionAny,
  enabledRootRedirect,
}: NavSubListProps) {
  return (
    <NavUl className="gap-2">
      {data.map((list) => (
        <NavList
          key={list.title}
          data={list}
          render={render}
          depth={depth + 1}
          cssVars={cssVars}
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
