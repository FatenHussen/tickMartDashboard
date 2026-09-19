import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { mergeClasses } from 'minimal-shared/utils';

export interface DrawerProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  anchor?: 'left' | 'right' | 'top' | 'bottom';
  width?: string;
  className?: string;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
  slotProps?: {
    backdrop?: {
      invisible?: boolean;
    };
  };
}

const anchorClasses = {
  left: 'left-0 top-0 bottom-0',
  right: 'right-0 top-0 bottom-0',
  top: 'top-0 left-0 right-0',
  bottom: 'bottom-0 left-0 right-0',
};

export function Drawer({
  open,
  onClose,
  children,
  anchor = 'right',
  width = '360px',
  className,
  disableBackdropClick,
  disableEscapeKeyDown,
  slotProps,
}: DrawerProps) {
  const ignoreBackdropUntilRef = useRef(0);

  useEffect(() => {
    if (open) {
      // The opening click (or the second click of a double-click) would otherwise
      // hit this overlay and close the drawer immediately.
      ignoreBackdropUntilRef.current = Date.now() + 400;
    }
  }, [open]);

  useEffect(() => {
    if (!open || disableEscapeKeyDown) {
      return undefined;
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose, disableEscapeKeyDown]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const isVertical = anchor === 'left' || anchor === 'right';
  const drawerStyle = isVertical ? { width } : { height: width };

  const handleBackdropClick = () => {
    if (!onClose || disableBackdropClick) return;
    if (Date.now() < ignoreBackdropUntilRef.current) return;
    onClose();
  };

  const content = (
    <div
      className="fixed inset-0 z-[var(--layout-modal-zIndex,1300)]"
      onClick={handleBackdropClick}
    >
      {!slotProps?.backdrop?.invisible && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" aria-hidden="true" />
      )}
      <div
        className={mergeClasses([
          'fixed z-10 bg-background shadow-xl transition-transform',
          anchorClasses[anchor],
          className,
        ])}
        style={drawerStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

