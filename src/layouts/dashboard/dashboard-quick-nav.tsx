import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';

import { paths } from 'src/routes/paths';

import { Box } from 'src/shared/ui';
import { Iconify } from 'src/shared/components/iconify';

import { usePermissions } from 'src/auth/hooks/use-permissions';

// ----------------------------------------------------------------------

const linkClass =
  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground/90 transition-colors hover:bg-primary/12 hover:text-foreground sm:text-sm';

const activeClass = 'bg-primary/15 text-foreground shadow-sm ring-1 ring-primary/25';

export function DashboardQuickNav() {
  const { t } = useTranslation('nav');
  const { can } = usePermissions();

  const items = [
    {
      to: paths.dashboard.products,
      label: t('products'),
      icon: 'solar:box-minimalistic-bold-duotone',
      permission: 'product.view',
    },
    {
      to: paths.dashboard.orders,
      label: t('orders'),
      icon: 'solar:cart-large-2-bold-duotone',
      permission: 'order.view',
    },
    {
      to: paths.dashboard.settings,
      label: t('settings'),
      icon: 'solar:settings-bold-duotone',
      permission: 'setting.view',
    },
    {
      to: paths.dashboard.driver,
      label: t('driver'),
      icon: 'solar:delivery-bold-duotone',
      permission: 'driver.view',
    },
  ] as const;

  const visibleItems = items.filter((item) => can(item.permission));
  if (!visibleItems.length) return null;

  return (
    <Box className="sticky top-[var(--layout-header-mobile-height)] z-20 shrink-0 border-b border-border/50 bg-card/95 px-3 py-2 shadow-sm backdrop-blur-md md:top-[var(--layout-header-desktop-height)] sm:px-4 md:px-6">
      <nav
        className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-1 sm:gap-2"
        aria-label={t('quickNavAria')}
      >
        {visibleItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${linkClass} ${isActive ? activeClass : 'text-muted-foreground hover:text-foreground'}`
            }
          >
            <Iconify icon={icon} width={18} className="shrink-0 opacity-90" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </Box>
  );
}
