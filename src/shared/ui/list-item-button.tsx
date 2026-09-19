import { mergeClasses } from 'minimal-shared/utils';

export interface ListItemButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  disableRipple?: boolean;
}

export function ListItemButton({
  disableRipple,
  className,
  children,
  ...props
}: ListItemButtonProps) {
  return (
    <button
      type="button"
      className={mergeClasses([
        'w-full text-left p-2.5 rounded-lg transition-colors',
        'hover:bg-muted',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        className,
      ])}
      {...props}
    >
      {children}
    </button>
  );
}

