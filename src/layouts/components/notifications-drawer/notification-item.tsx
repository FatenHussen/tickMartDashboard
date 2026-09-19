import { fToNow } from 'src/utils/format-time';

import { Label } from 'src/shared/components/label';
import { FileThumbnail } from 'src/shared/components/file-thumbnail';
import {
  Box,
  Button,
  Avatar,
  SvgIcon,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
} from 'src/shared/ui';

import { notificationIcons } from './icons';

// ----------------------------------------------------------------------

export type NotificationItemProps = {
  notification: {
    id: string;
    type: string;
    title: string;
    category: string;
    isUnRead: boolean;
    avatarUrl: string | null;
    createdAt: string | number | null;
    url?: string | null;
  };
  onOpen?: (notification: NotificationItemProps['notification']) => void;
  onOpenLink?: (notification: NotificationItemProps['notification']) => void;
};

const readerContent = (data: string) => {
  if (!data) return null;
  if (data.includes('<') && data.includes('>')) {
    return (
      <Box
        dangerouslySetInnerHTML={{ __html: data }}
        className="[&_p]:m-0 [&_p]:text-sm [&_a]:text-inherit [&_a]:no-underline [&_strong]:text-sm [&_strong]:font-medium"
      />
    );
  }
  return <Box className="text-sm font-medium text-foreground">{data}</Box>;
};

const renderIcon = (type: string) =>
  ({
    order: notificationIcons.order,
    chat: notificationIcons.chat,
    mail: notificationIcons.mail,
    delivery: notificationIcons.delivery,
  })[type];

export function NotificationItem({ notification, onOpen, onOpenLink }: NotificationItemProps) {
  const renderAvatar = () => (
    <ListItemAvatar>
      {notification.avatarUrl ? (
        <Avatar src={notification.avatarUrl} className="w-10 h-10 bg-muted" />
      ) : (
        <Box className="w-10 h-10 flex rounded-full items-center justify-center bg-muted">
          <SvgIcon className="w-6 h-6">{renderIcon(notification.type)}</SvgIcon>
        </Box>
      )}
    </ListItemAvatar>
  );

  const formatTime = (val: string | number | null) => {
    if (val == null) return '';
    const formatted = fToNow(val);
    return formatted === 'Invalid date' ? String(val) : formatted;
  };

  const renderText = () => (
    <ListItemText
      primary={readerContent(notification.title)}
      secondary={
        <>
          {formatTime(notification.createdAt)}
          {notification.category && (
            <>
              <Box component="span" className="w-0.5 h-0.5 rounded-full bg-current mx-1" />
              {notification.category}
            </>
          )}
        </>
      }
      slotProps={{
        primary: {
          className: 'mb-0.5',
        },
        secondary: {
          className: 'gap-0.5 flex items-center text-xs text-muted-foreground',
        },
      }}
    />
  );

  const renderUnReadBadge = () =>
    notification.isUnRead && (
      <Box className="absolute top-[26px] w-2 h-2 right-5 rounded-full bg-primary" />
    );

  const renderFriendAction = () => (
    <Box className="gap-1 mt-1.5 flex">
      <Button size="small" variant="contained">
        Accept
      </Button>
      <Button size="small" variant="outlined">
        Decline
      </Button>
    </Box>
  );

  const renderProjectAction = () => (
    <>
      <Box className="p-1.5 my-1.5 rounded-xl text-foreground bg-muted">
        {readerContent(
          `<p><strong>@Jaydon Frankie</strong> feedback by asking questions or just leave a note of appreciation.</p>`
        )}
      </Box>

      <Button size="small" variant="contained" className="self-start">
        Reply
      </Button>
    </>
  );

  const renderFileAction = () => (
    <Box className="p-1.5 pl-1 gap-1 mt-1.5 flex rounded-xl bg-muted">
      <FileThumbnail file="http://localhost:8080/httpsdesign-suriname-2015.mp3" />

      <ListItemText
        primary="design-suriname-2015.mp3 design-suriname-2015.mp3"
        secondary="2.3 Mb"
        slotProps={{
          primary: {
            noWrap: true,
            className: 'text-foreground text-[13px]',
          },
          secondary: {
            className: 'mt-0.25 text-xs text-muted-foreground',
          },
        }}
      />

      <Button size="small" variant="outlined" className="shrink-0">
        Download
      </Button>
    </Box>
  );

  const renderTagsAction = () => (
    <Box className="mt-1.5 gap-0.75 flex flex-wrap">
      <Label variant="outlined" color="info">
        Design
      </Label>
      <Label variant="outlined" color="warning">
        Dashboard
      </Label>
      <Label variant="outlined">Design system</Label>
    </Box>
  );

  const renderPaymentAction = () => (
    <Box className="gap-1 mt-1.5 flex">
      <Button size="small" variant="contained">
        Pay
      </Button>
      <Button size="small" variant="outlined">
        Decline
      </Button>
    </Box>
  );

  return (
    <ListItemButton
      type="button"
      className="p-2.5 items-start border-b border-dashed border-border relative w-full"
      onClick={() => onOpen?.(notification)}
      onDoubleClick={() => {
        onOpen?.(notification);
        if (notification.url) onOpenLink?.(notification);
      }}
    >
      {renderUnReadBadge()}
      {renderAvatar()}

      <Box className="min-w-0 flex-1">
        {renderText()}
        {notification.type === 'friend' && renderFriendAction()}
        {notification.type === 'project' && renderProjectAction()}
        {notification.type === 'file' && renderFileAction()}
        {notification.type === 'tags' && renderTagsAction()}
        {notification.type === 'payment' && renderPaymentAction()}
      </Box>
    </ListItemButton>
  );
}
