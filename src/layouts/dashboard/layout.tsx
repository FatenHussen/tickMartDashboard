import type { NavItemProps, NavSectionProps } from 'src/shared/components/nav-section';
import type { MainSectionProps, HeaderSectionProps, LayoutSectionProps } from '../core';

import { merge } from 'es-toolkit';
import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBoolean } from 'minimal-shared/hooks';
import { mergeClasses } from 'minimal-shared/utils';

import { Box, Alert } from 'src/shared/ui';
import { getFcmToken } from 'src/lib/firebase';
import { Logo } from 'src/shared/components/logo';
import { apiRoutes, axiosInstance } from 'src/api';
import { useMockedUser } from 'src/pages/auth/hooks';
import { useSettingsContext } from 'src/shared/components/settings';
import { useAuthContext } from 'src/pages/auth/hooks/use-auth-context';

import { can, canAny } from 'src/auth/permissions';

import { NavMobile } from './nav-mobile';
import { VerticalDivider } from './content';
import { NavVertical } from './nav-vertical';
import { NavHorizontal } from './nav-horizontal';
import { Searchbar } from '../components/searchbar';
import { getNavData } from '../nav-config-dashboard';
import { MenuButton } from '../components/menu-button';
import { DashboardQuickNav } from './dashboard-quick-nav';
import { LogoutButton } from '../components/logout-button';
import { SettingsButton } from '../components/settings-button';
import { LanguagePopover } from '../components/language-popover';
import { dashboardLayoutVars, dashboardNavColorVars } from './css-vars';
import { NotificationsDrawer } from '../components/notifications-drawer';
import { DashboardHeaderCenter } from '../components/dashboard-header-center';
import { MainSection, layoutClasses, HeaderSection, LayoutSection } from '../core';

// ----------------------------------------------------------------------

type LayoutBaseProps = Pick<LayoutSectionProps, 'className' | 'children' | 'cssVars'>;

export type DashboardLayoutProps = LayoutBaseProps & {
  layoutQuery?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  slotProps?: {
    header?: HeaderSectionProps;
    nav?: {
      data?: NavSectionProps['data'];
    };
    main?: MainSectionProps;
  };
};

export function DashboardLayout({
  className,
  cssVars,
  children,
  slotProps,
  layoutQuery = 'lg',
}: DashboardLayoutProps) {
  const { user } = useMockedUser();
  const { t } = useTranslation('nav');
  const { t: tc } = useTranslation('common');

  const settings = useSettingsContext();

  const navVars = dashboardNavColorVars(settings.state.navColor, settings.state.navLayout);

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const navData = slotProps?.nav?.data ?? getNavData(t);

  const isNavMini = settings.state.navLayout === 'mini';
  const isNavHorizontal = settings.state.navLayout === 'horizontal';
  const isNavVertical = isNavMini || settings.state.navLayout === 'vertical';

  const { permissions } = useAuthContext();

  const fcmInitialized = useRef(false);
  useEffect(() => {
    if (fcmInitialized.current) return;
    fcmInitialized.current = true;

    getFcmToken().then((fcmToken) => {
      if (fcmToken) {
        axiosInstance
          .post(apiRoutes.auth.storeToken, {
            deviceId: navigator.userAgent.slice(0, 50),
            fcmToken,
          })
          .catch(() => {});
      }
    });
  }, []);

  // Legacy role-based check (for backward compatibility)
  const canDisplayItemByRole = (allowedRoles: NavItemProps['allowedRoles']): boolean =>
    !allowedRoles?.includes(user?.role);

  // Permission-based check (Spatie permission strings from login/profile)
  const canDisplayItemByPermission = (requiredPermission?: string): boolean => {
    if (!requiredPermission) return true;
    return can(permissions, requiredPermission);
  };

  const canDisplayItemByPermissionAny = (requiredPermissions: string[]): boolean => {
    if (!requiredPermissions?.length) return true;
    return canAny(permissions, requiredPermissions);
  };

  const renderHeader = () => {
    const headerSlotProps: HeaderSectionProps['slotProps'] = {
      container: {
        className: mergeClasses([
          'flex w-full min-w-0 items-center justify-between gap-2',
          'relative z-10',
          'px-4 md:px-6 lg:px-8',
          isNavVertical ? 'lg:pl-8 lg:pr-8' : '',
          isNavHorizontal
            ? 'bg-[var(--layout-nav-bg)] lg:h-[var(--layout-nav-horizontal-height)]'
            : '',
        ]),
      },
    };

    const headerSlots: HeaderSectionProps['slots'] = {
      topArea: (
        <Alert severity="info" className="hidden rounded-none">
          {tc('infoAlertSample')}
        </Alert>
      ),
      bottomArea: isNavHorizontal ? (
        <NavHorizontal
          data={navData}
          layoutQuery={layoutQuery}
          cssVars={navVars.section}
          checkPermissions={canDisplayItemByRole}
          checkPermission={canDisplayItemByPermission}
          checkPermissionAny={canDisplayItemByPermissionAny}
        />
      ) : null,
      leftArea: (
        <Box className="flex items-center gap-2 md:gap-4 relative z-10">
          {/** @slot Nav mobile */}
          <MenuButton onClick={onOpen} className="me-2 -ms-2 lg:hidden" />
          <NavMobile
            data={navData}
            open={open}
            onClose={onClose}
            cssVars={navVars.section}
            checkPermissions={canDisplayItemByRole}
            checkPermission={canDisplayItemByPermission}
            checkPermissionAny={canDisplayItemByPermissionAny}
          />

          {/** @slot Logo */}
          {isNavHorizontal && (
            <Box className="hidden lg:inline-flex items-center gap-3">
              <Logo href="/" />
              <Box className="h-6 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
            </Box>
          )}

          {/** @slot Divider */}
          {isNavHorizontal && <VerticalDivider className="hidden lg:flex" />}

          {/** @slot Workspace popover */}
          {/* <Box className="flex items-center gap-2">
            <WorkspacesPopover
              data={_workspaces}
              className={mergeClasses([
                isNavHorizontal ? 'text-[var(--layout-nav-text-primary-color)]' : '',
                'transition-all duration-200 hover:scale-105',
              ])}
            />
          </Box> */}
        </Box>
      ),
      centerArea: isNavVertical ? <DashboardHeaderCenter navData={navData} /> : undefined,
      rightArea: (
        <Box className="flex items-center gap-1.5 sm:gap-2 relative z-10">
          {/** @slot Searchbar — own floating capsule */}
          <Box className="hidden sm:flex items-center rounded-full border border-border/50 bg-background/60 px-2 py-1 shadow-sm hover:border-primary/30 hover:bg-background transition-colors duration-200">
            <Searchbar data={navData} />
          </Box>

          {/** Separator */}
          <div className="hidden sm:block h-5 w-px bg-border/60 mx-0.5" />

          {/** @slot Action cluster — notifications + settings + logout in a tight pill */}
          <Box className="flex items-center gap-0 rounded-xl border border-border/40 bg-muted/40 px-0.5 py-0.5">
            <Box className="flex items-center">
              <NotificationsDrawer />
            </Box>
            <div className="h-4 w-px bg-border/50" />
            <Box className="flex items-center">
              <SettingsButton />
            </Box>
            <div className="h-4 w-px bg-border/50" />
            <Box className="flex items-center">
              <LogoutButton />
            </Box>
          </Box>

          {/** Separator */}
          <div className="h-5 w-px bg-border/60 mx-0.5" />

          {/** @slot Language — standalone accent capsule */}
          <Box className="flex items-center rounded-full border border-border/50 bg-background/60 shadow-sm hover:border-primary/30 hover:bg-background transition-colors duration-200">
            <LanguagePopover
              data={[
                { value: 'en', label: tc('languageEnglish'), countryCode: 'GB' },
                { value: 'ar', label: tc('languageArabic'), countryCode: 'SA' },
              ]}
            />
          </Box>
        </Box>
      ),
    };

    return (
      <HeaderSection
        layoutQuery={layoutQuery}
        disableElevation={isNavVertical}
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={merge(headerSlotProps, slotProps?.header?.slotProps || {})}
        className={mergeClasses([slotProps?.header?.className])}
      />
    );
  };

  const renderSidebar = () => (
    <NavVertical
      data={navData}
      isNavMini={isNavMini}
      layoutQuery={layoutQuery}
      cssVars={navVars.section}
      checkPermissions={canDisplayItemByRole}
      checkPermission={canDisplayItemByPermission}
      checkPermissionAny={canDisplayItemByPermissionAny}
      onToggleNav={() =>
        settings.setField(
          'navLayout',
          settings.state.navLayout === 'vertical' ? 'mini' : 'vertical'
        )
      }
    />
  );

  const renderFooter = () => null;

  const renderMain = () => (
    <MainSection className="overflow-visible" {...slotProps?.main}>
      <DashboardQuickNav />
      {children}
    </MainSection>
  );

  return (
    <LayoutSection
      headerSection={renderHeader()}
      sidebarSection={isNavHorizontal ? null : renderSidebar()}
      footerSection={renderFooter()}
      cssVars={
        {
          ...dashboardLayoutVars(),
          ...navVars.layout,
          // Set current sidebar width variable for dynamic margin calculation
          '--layout-nav-current-width': isNavMini
            ? 'var(--layout-nav-mini-width)'
            : 'var(--layout-nav-vertical-width)',
          ...cssVars,
        } as any
      }
      className={mergeClasses([
        className,
        `[&_.${layoutClasses.sidebarContainer}]:lg:ps-[var(--layout-nav-${isNavMini ? 'mini' : 'vertical'}-width)]`,
        `[&_.${layoutClasses.sidebarContainer}]:transition-[padding-inline-start]`,
        `[&_.${layoutClasses.sidebarContainer}]:duration-[var(--layout-transition-duration)]`,
        `[&_.${layoutClasses.sidebarContainer}]:ease-[var(--layout-transition-easing)]`,
      ])}
    >
      {renderMain()}
    </LayoutSection>
  );
}
