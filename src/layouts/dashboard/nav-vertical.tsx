import type { NavSectionProps } from 'src/shared/components/nav-section';

import { mergeClasses } from 'minimal-shared/utils';

import { RouterLink } from 'src/routes/components';

import { Box } from 'src/shared/ui';
import { Scrollbar } from 'src/shared/components/scrollbar';
import { NavSectionMini, NavSectionVertical } from 'src/shared/components/nav-section';

import { layoutClasses } from '../core';
import { NavToggleButton } from '../components/nav-toggle-button';

// ----------------------------------------------------------------------

export type NavVerticalProps = React.ComponentProps<'div'> &
  NavSectionProps & {
    isNavMini: boolean;
    layoutQuery?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    onToggleNav: () => void;
    slots?: {
      topArea?: React.ReactNode;
      bottomArea?: React.ReactNode;
    };
    className?: string;
    style?: React.CSSProperties;
  };

export function NavVertical({
  data,
  slots,
  cssVars,
  className,
  isNavMini,
  onToggleNav,
  checkPermissions,
  checkPermission,
  checkPermissionAny,
  layoutQuery = 'md',
  style,
  ...other
}: NavVerticalProps) {
  const renderNavVertical = () => (
    <>
      {slots?.topArea ?? (
        <Box className="flex flex-col pt-5 pb-3 relative z-10 shrink-0">
          {/* Logo — framed like a small “card” to anchor the rail */}
          <Box className="flex justify-center items-center px-4">
            <RouterLink href="/" className="block w-full max-w-[200px]">
              <img src="/logo/logo.jpg" alt="Logo" className="h-16 w-full object-contain" />
            </RouterLink>
          </Box>
          <Box className="mt-4 mx-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </Box>
      )}

      <Scrollbar fillContent className="relative z-10 py-1 flex-1 min-h-0">
        <NavSectionVertical
          data={data}
          cssVars={cssVars}
          checkPermissions={checkPermissions}
          checkPermission={checkPermission}
          checkPermissionAny={checkPermissionAny}
          className="px-2.5 pb-4 flex-auto"
        />
      </Scrollbar>

      {/* Bottom fade */}
      <Box className="pointer-events-none absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-card/45 to-transparent z-20" />
    </>
  );

  const renderNavMini = () => (
    <>
      {slots?.topArea ?? (
        <Box className="flex justify-center px-2 py-4 relative z-10 shrink-0 border-b border-[var(--chrome-edge)]">
          <RouterLink href="/" className="block h-9 w-9">
            <img src="/logo/logo.jpg" alt="Logo" className="h-full w-full object-contain" />
          </RouterLink>
        </Box>
      )}

      <NavSectionMini
        data={data}
        cssVars={cssVars}
        checkPermissions={checkPermissions}
        checkPermission={checkPermission}
        checkPermissionAny={checkPermissionAny}
        enabledRootRedirect
        className="flex w-full min-w-0 flex-col items-stretch pb-6 pt-2 px-2 flex-auto overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative z-10"
      />

      {slots?.bottomArea}
    </>
  );

  return (
    <div
      className={mergeClasses([
        layoutClasses.nav.root,
        layoutClasses.nav.vertical,
        'top-0 start-0 h-full hidden fixed flex-col z-[var(--layout-nav-zIndex)]',
        'sidebar-gradient border-e border-[var(--chrome-edge)] shadow-[var(--chrome-shadow-sidebar)]',
        /* L-junction with main header: matching radius + RTL */
        'rounded-tr-none',
        isNavMini ? 'w-[var(--layout-nav-mini-width)]' : 'w-[var(--layout-nav-vertical-width)]',
        `${layoutQuery}:flex`,
        className,
      ])}
      style={{ ...style }}
      {...other}
    >
      {/* Ambient depth — soft brand wash */}
      <div
        className="pointer-events-none absolute -top-16 -end-12 size-[min(220px,50vw)]  blur-3xl opacity-50 z-0"
        style={{
          background: 'radial-gradient(circle, rgb(var(--primary) / 0.1) 0%, transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 -start-8 size-[min(180px,42vw)]  blur-3xl opacity-35 z-0"
        style={{
          background: 'radial-gradient(circle, rgb(var(--accent-amber) / 0.28) 0%, transparent 70%)',
        }}
      />

      {/* Top accent — matches header chrome-top-accent */}
      <div className="chrome-top-accent pointer-events-none absolute inset-x-0 top-0 z-30 shrink-0" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        {isNavMini ? renderNavMini() : renderNavVertical()}
      </div>

      <NavToggleButton
        isNavMini={isNavMini}
        onClick={onToggleNav}
        className="hidden lg:inline-flex"
      />
    </div>
  );
}
