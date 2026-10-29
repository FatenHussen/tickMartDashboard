import { Box, Typography } from '@/shared/ui';
import { useRef, useState, useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { HexColorInput, HexColorPicker } from 'react-colorful';

interface RHFColorPickerProps {
  name: string;
  helperText?: string;
}

type HexPaletteFieldProps = {
  value: string;
  onChange: (hex: string) => void;
  /** Called when the palette closes, with the latest hex. */
  onCommit?: (hex: string) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  placeholder?: string;
};

const POPOVER_ESTIMATED_HEIGHT = 240;
const STICKY_BAR_ESTIMATED_HEIGHT = 80;

export function HexPaletteField({
  value,
  onChange,
  onCommit,
  error,
  helperText,
  disabled,
  placeholder,
}: HexPaletteFieldProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef(value);
  const onCommitRef = useRef(onCommit);
  colorRef.current = value;
  onCommitRef.current = onCommit;

  const close = () => {
    setOpen(false);
    onCommitRef.current?.(colorRef.current);
  };

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        onCommitRef.current?.(colorRef.current);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - STICKY_BAR_ESTIMATED_HEIGHT;
    const spaceAbove = rect.top;
    if (spaceBelow < POPOVER_ESTIMATED_HEIGHT && spaceAbove > spaceBelow) {
      setPlacement('top');
    } else {
      setPlacement('bottom');
    }
  }, [open]);

  const shown = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '';
  const pickerColor = shown || '#000000';

  return (
    <Box className="w-full">
      <Box className="relative" ref={wrapperRef}>
        <Box className="flex items-center gap-3" ref={triggerRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => (open ? close() : setOpen(true))}
            className={`h-10 w-10 shrink-0 cursor-pointer rounded-lg border-2 transition-shadow hover:shadow-md disabled:cursor-wait ${
              shown ? 'border-border' : 'border-dashed border-border bg-muted/40'
            }`}
            style={{ backgroundColor: shown || 'transparent' }}
          />
          <Box className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3">
            <span className="text-sm text-muted-foreground">#</span>
            {shown ? (
              <HexColorInput
                color={shown}
                onChange={onChange}
                prefixed={false}
                className="w-full bg-transparent font-mono text-sm uppercase outline-none"
              />
            ) : (
              <input
                value=""
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                className="w-full bg-transparent font-mono text-sm uppercase outline-none placeholder:normal-case placeholder:font-sans"
              />
            )}
          </Box>
        </Box>

        {open ? (
          <Box
            className={`absolute z-[100] rounded-xl border border-border bg-card p-3 shadow-xl ${
              placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            <HexColorPicker color={pickerColor} onChange={onChange} />
          </Box>
        ) : null}
      </Box>

      <Typography
        variant="caption"
        className={`mt-1.5 block ${error ? 'text-destructive' : 'text-muted-foreground'}`}
      >
        {error ?? helperText}
      </Typography>
    </Box>
  );
}

export function RHFColorPicker({ name, helperText }: RHFColorPickerProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <HexPaletteField
          value={field.value || '#000000'}
          onChange={field.onChange}
          error={error?.message}
          helperText={helperText}
        />
      )}
    />
  );
}
