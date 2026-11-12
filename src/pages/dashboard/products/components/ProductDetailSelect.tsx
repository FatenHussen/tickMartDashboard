import type { SelectInstance } from 'react-select';

import { forwardRef } from 'react';
import { cn } from '@/utils/utils';
import { useTranslation } from 'react-i18next';
import ReactSelect, { createFilter } from 'react-select';
import { isActiveLanguageArabic } from '@/lib/language-code';

type DetailOption = { value: string; label: string };

interface ProductDetailSelectProps {
  inputId: string;
  name?: string;
  options: DetailOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  error?: boolean;
  isClearable?: boolean;
}

// Search the visible label only: preset identities contain both translations.
const filterOption = createFilter<DetailOption>({ stringify: (option) => option.label });

export const ProductDetailSelect = forwardRef<
  SelectInstance<DetailOption>,
  ProductDetailSelectProps
>(({ inputId, name, options, value, onChange, onBlur, placeholder, error, isClearable }, ref) => {
  const { t } = useTranslation('table');

  return (
    <ReactSelect<DetailOption>
      ref={ref}
      inputId={inputId}
      instanceId={inputId}
      name={name}
      aria-label={placeholder}
      aria-invalid={error || undefined}
      options={options}
      value={options.find((option) => option.value === value) ?? null}
      onChange={(option) => onChange(option?.value ?? '')}
      onBlur={onBlur}
      placeholder={placeholder}
      isSearchable
      isClearable={isClearable}
      isRtl={isActiveLanguageArabic()}
      filterOption={filterOption}
      noOptionsMessage={() => t('noOptionsFound')}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      menuPlacement="auto"
      unstyled
      classNames={{
        container: () => 'w-full min-w-0 text-sm',
        control: ({ isFocused }) =>
          cn(
            'min-h-10 rounded-lg border bg-background px-3 py-2 text-foreground',
            error ? 'border-destructive' : 'border-border',
            isFocused && 'ring-2 ring-primary'
          ),
        valueContainer: () => 'gap-1',
        input: () => 'text-foreground',
        singleValue: () => 'text-foreground',
        placeholder: () => 'text-muted-foreground',
        indicatorsContainer: () => 'gap-2 ps-2 text-muted-foreground',
        clearIndicator: () => 'cursor-pointer hover:text-foreground',
        dropdownIndicator: () => 'cursor-pointer hover:text-foreground',
        menu: () => 'my-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg',
        menuList: () => 'p-1',
        option: ({ isFocused, isSelected }) =>
          cn(
            'cursor-pointer rounded-md px-3 py-2 text-start text-popover-foreground',
            isFocused && 'bg-muted',
            isSelected && 'bg-primary/10 font-medium text-primary'
          ),
        noOptionsMessage: () => 'px-3 py-4 text-center text-muted-foreground',
      }}
      styles={{
        menuPortal: (base) => ({
          ...base,
          zIndex: 'calc(var(--layout-modal-zIndex, 1300) + 20)',
        }),
      }}
    />
  );
});

ProductDetailSelect.displayName = 'ProductDetailSelect';
