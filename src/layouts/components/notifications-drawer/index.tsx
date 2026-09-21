import type { NotificationItemProps } from './notification-item';

import { m } from 'framer-motion';
import { queryKeys } from '@/api';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useBoolean } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect, useCallback } from 'react';

import { fToNow } from 'src/utils/format-time';

import { Label } from 'src/shared/components/label';
import { Iconify } from 'src/shared/components/iconify';
import { Scrollbar } from 'src/shared/components/scrollbar';
import { CustomTabs } from 'src/shared/components/custom-tabs';
import { useLocalizationStore } from 'src/store/useLocalizationStore';
import { varTap, varHover, transitionTap } from 'src/shared/components/animate';
import { Box, Tab, Badge, Drawer, Button, Tooltip, Typography, IconButton } from 'src/shared/ui';

import { NotificationItem } from './notification-item';
import { _NotificationApi, type NotificationApiItem } from './api/notification.services';
import {
  notificationIconType,
  resolveNotificationHref,
} from './utils/resolve-notification-path';

// ----------------------------------------------------------------------

function mapApiToNotification(
  item: NotificationApiItem
): NotificationItemProps['notification'] {
  const target = {
    url: item.url,
    type: item.type,
    entityId: item.entityId,
    title: item.title,
    body: item.body,
  };

  return {
    id: item.id,
    type: notificationIconType(target),
    title: item.title,
    category: item.body || '',
    isUnRead: item.read_at === null,
    avatarUrl: null,
    createdAt: item.created_at,
    url: resolveNotificationHref(target),
    entityType: item.type,
    entityId: item.entityId,
  };
}

// ----------------------------------------------------------------------

export type NotificationsDrawerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  data?: NotificationItemProps['notification'][];
};

export function NotificationsDrawer({ data = [], className, ...other }: NotificationsDrawerProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const direction = useLocalizationStore((s) => s.direction);
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const [currentTab, setCurrentTab] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState<
    NotificationItemProps['notification'] | null
  >(null);
  const [localNotifications, setLocalNotifications] = useState<
    NotificationItemProps['notification'][] | null
  >(null);

  const { data: apiResponse, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.auth.notifications(),
    queryFn: () => _NotificationApi.getList(),
  });

  useEffect(() => {
    if (open) {
      refetch();
      return;
    }
    setSelectedNotification(null);
  }, [open, refetch]);

  const notifications = useMemo(() => {
    if (localNotifications !== null) return localNotifications;
    const items = apiResponse?.data ?? [];
    return items.length > 0 ? items.map(mapApiToNotification) : data;
  }, [apiResponse?.data, localNotifications, data]);

  const totalUnRead = notifications.filter((item) => item.isUnRead === true).length;
  const totalArchived = notifications.filter((item) => !item.isUnRead).length;

  const tabs = useMemo(
    () => [
      { value: 'all', label: t('notificationsTabAll'), count: notifications.length },
      { value: 'unread', label: t('notificationsTabUnread'), count: totalUnRead },
      { value: 'archived', label: t('notificationsTabArchived'), count: totalArchived },
    ],
    [notifications.length, totalUnRead, totalArchived, t]
  );

  const filteredNotifications = useMemo(() => {
    if (currentTab === 'unread') return notifications.filter((n) => n.isUnRead);
    if (currentTab === 'archived') return notifications.filter((n) => !n.isUnRead);
    return notifications;
  }, [notifications, currentTab]);

  const handleChangeTab = useCallback((_event: React.SyntheticEvent, newValue: string | number) => {
    setCurrentTab(newValue as string);
  }, []);

  const handleMarkAllAsRead = () => {
    setLocalNotifications(
      notifications.map((notification) => ({ ...notification, isUnRead: false }))
    );
  };

  const markRead = useCallback((notification: NotificationItemProps['notification']) => {
    setLocalNotifications((current) =>
      (current ?? notifications).map((item) =>
        item.id === notification.id ? { ...item, isUnRead: false } : item
      )
    );
  }, [notifications]);

  const followNotificationLink = useCallback(
    (notification: NotificationItemProps['notification']) => {
      const href = resolveNotificationHref({
        url: notification.url,
        type: notification.entityType,
        entityId: notification.entityId,
        title: notification.title,
        body: notification.category,
      });
      if (!href) return false;

      onClose();
      setSelectedNotification(null);

      if (href.startsWith('http://') || href.startsWith('https://')) {
        window.location.assign(href);
        return true;
      }

      navigate(href);
      return true;
    },
    [navigate, onClose]
  );

  const handleOpenNotification = useCallback(
    (notification: NotificationItemProps['notification']) => {
      markRead(notification);
      const opened = followNotificationLink(notification);
      if (!opened) {
        setSelectedNotification(notification);
      }
    },
    [followNotificationLink, markRead]
  );

  const handleBellClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (open) {
      setSelectedNotification(null);
      onClose();
      return;
    }
    onOpen();
  };

  const renderHead = () => (
    <Box className="py-2 pe-1 ps-2.5 min-h-[68px] flex items-center shrink-0">
      <Typography variant="h6" className="flex-grow">
        {t('notificationsDrawerTitle')}
      </Typography>

      {!!totalUnRead && (
        <Tooltip title={t('markAllRead')}>
          <IconButton color="primary" onClick={handleMarkAllAsRead}>
            <Iconify icon="eva:done-all-fill" />
          </IconButton>
        </Tooltip>
      )}

      <IconButton
        onClick={() => {
          setSelectedNotification(null);
          onClose();
        }}
      >
        <Iconify icon="mingcute:close-line" />
      </IconButton>
    </Box>
  );

  const renderTabs = () => (
    <CustomTabs variant="fullWidth" value={currentTab} onChange={handleChangeTab}>
      {tabs.map((tab) => (
        <Tab
          key={tab.value}
          iconPosition="end"
          value={tab.value}
          label={tab.label}
          icon={
            <Label
              variant={((tab.value === 'all' || tab.value === currentTab) && 'filled') || 'soft'}
              color={
                (tab.value === 'unread' && 'info') ||
                (tab.value === 'archived' && 'success') ||
                'default'
              }
            >
              {tab.count}
            </Label>
          }
        />
      ))}
    </CustomTabs>
  );

  const renderDetail = (notification: NotificationItemProps['notification']) => {
    const formattedTime =
      notification.createdAt == null ? '' : fToNow(notification.createdAt);
    const timeLabel = formattedTime === 'Invalid date' ? String(notification.createdAt) : formattedTime;
    const body = notification.category;

    return (
      <Box className="flex min-h-0 flex-1 flex-col">
        <Box className="shrink-0 px-3 pt-2">
          <Button
            type="button"
            variant="text"
            size="small"
            onClick={() => setSelectedNotification(null)}
          >
            <Iconify icon="solar:arrow-left-line-duotone" width={18} className="me-1" />
            {t('notificationDetailBack')}
          </Button>
        </Box>
        <Scrollbar className="flex-1 min-h-0">
          <Box className="space-y-3 px-4 py-3">
            <Typography variant="subtitle1" className="font-semibold text-foreground">
              {notification.title || '—'}
            </Typography>
            {timeLabel ? (
              <Typography variant="caption" className="block text-muted-foreground">
                {timeLabel}
              </Typography>
            ) : null}
            {body ? (
              <Typography variant="body2" className="whitespace-pre-wrap text-foreground">
                {body}
              </Typography>
            ) : null}
            {notification.url ? (
              <Button
                type="button"
                variant="contained"
                onClick={() => followNotificationLink(notification)}
              >
                {t('notificationOpenLink')}
              </Button>
            ) : null}
          </Box>
        </Scrollbar>
      </Box>
    );
  };

  const renderList = () => (
    <Scrollbar className="flex-1 min-h-0">
      <Box component="ul">
        {isLoading ? (
          <Box className="flex justify-center py-8">
            <Iconify icon="svg-spinners:ring-resize" width={32} className="text-muted-foreground" />
          </Box>
        ) : isError ? (
          <Box className="flex justify-center py-8 text-sm text-destructive">
            {t('genericError')}
          </Box>
        ) : filteredNotifications.length === 0 ? (
          <Box className="flex justify-center py-8 text-sm text-muted-foreground">
            {t('notificationsEmpty')}
          </Box>
        ) : (
          filteredNotifications.map((notification) => (
            <Box component="li" key={notification.id} className="flex">
              <NotificationItem
                notification={notification}
                onOpen={handleOpenNotification}
                onOpenLink={followNotificationLink}
              />
            </Box>
          ))
        )}
      </Box>
    </Scrollbar>
  );

  return (
    <>
      <m.button
        type="button"
        whileTap={varTap(0.96)}
        whileHover={varHover(1.04)}
        transition={transitionTap()}
        aria-label={t('notificationsButton')}
        aria-expanded={open}
        className={`inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 w-9 text-foreground hover:bg-muted active:bg-muted ${className || ''}`}
        {...(other as any)}
        onClick={handleBellClick}
      >
        <Badge badgeContent={totalUnRead} color="error" invisible={totalUnRead === 0}>
          <Iconify width={24} icon="solar:bell-bing-bold-duotone" />
        </Badge>
      </m.button>

      <Drawer
        open={open}
        onClose={onClose}
        anchor={direction === 'rtl' ? 'left' : 'right'}
        width="420px"
        className="flex h-full flex-col overflow-hidden border-s border-border"
      >
        {renderHead()}
        {selectedNotification ? (
          renderDetail(selectedNotification)
        ) : (
          <>
            {renderTabs()}
            {renderList()}
          </>
        )}

        {selectedNotification ? null : (
          <Box className="p-2 shrink-0">
            <Button
              fullWidth
              size="large"
              onClick={() => {
                setCurrentTab('all');
              }}
            >
              {t('viewAll')}
            </Button>
          </Box>
        )}
      </Drawer>
    </>
  );
}