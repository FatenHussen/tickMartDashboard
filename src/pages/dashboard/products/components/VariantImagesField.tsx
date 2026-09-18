import type { TFunction } from 'i18next';
import type {
  Control,
  UseFormWatch,
  UseFormSetValue,
} from 'react-hook-form';
import type { ProductFormValues } from '@/pages/dashboard/products/validation/product.validation';

import React from 'react';
import { Controller } from 'react-hook-form';

import { Box, Typography } from 'src/shared/ui';

// ----------------------------------------------------------------------

function RemovableLocalVariantImageThumb({
  file,
  onRemove,
  removeAriaLabel,
}: {
  file: File;
  onRemove: () => void;
  removeAriaLabel: string;
}) {
  const [previewUrl, setPreviewUrl] = React.useState('');

  React.useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <Box className="relative">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          className="h-16 w-16 object-cover rounded-lg border border-border/60"
        />
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1.5 -start-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-base font-bold leading-none text-white shadow-md ring-2 ring-white hover:bg-red-700"
        aria-label={removeAriaLabel}
      >
        ×
      </button>
    </Box>
  );
}

function FieldErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Typography variant="caption" className="text-destructive mt-0.5 block">
      {message}
    </Typography>
  );
}

export type VariantImagesFieldProps = {
  variantIndex: number;
  variantFieldId: string;
  control: Control<ProductFormValues>;
  watch: UseFormWatch<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  t: TFunction;
  compact?: boolean;
};

export function VariantImagesField({
  variantIndex,
  variantFieldId,
  control,
  watch,
  setValue,
  t,
  compact = false,
}: VariantImagesFieldProps) {
  const keepVIds = watch(`variants.${variantIndex}.existing_images_ids`) ?? [];
  const allSavedImages = watch(`variants.${variantIndex}.existing_images`) ?? [];
  const savedImages = allSavedImages.filter((im) => keepVIds.includes(Number(im.id)));

  return (
    <Box>
      {compact ? (
        <Typography variant="caption" className="text-muted-foreground mb-1 block text-[11px]">
          {t('form.variantImagesOptional')}
        </Typography>
      ) : (
        <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground">
          {t('form.variantImagesOptional')}
        </Typography>
      )}
      <Controller
        name={`variants.${variantIndex}.images`}
        control={control}
        render={({ field: { onChange, value, ref, name, onBlur }, fieldState: { error } }) => {
          const variantFileInputId = `variant-images-${variantIndex}-${variantFieldId}`;
          const files = (Array.isArray(value) ? value : []).filter(
            (f): f is File => f instanceof File
          );
          return (
            <div>
              <input
                id={variantFileInputId}
                ref={ref}
                name={name}
                onBlur={onBlur}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const picked = e.target.files ? Array.from(e.target.files) : [];
                  onChange([...files, ...picked]);
                  e.currentTarget.value = '';
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor={variantFileInputId}
                  className={`inline-flex cursor-pointer rounded-lg border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted ${
                    error ? 'border-destructive' : 'border-border'
                  }`}
                >
                  {t('form.chooseFiles')}
                </label>
                <Typography component="span" variant="caption" color="secondary">
                  {files.length > 0
                    ? t('form.filesSelectedCount', { count: files.length })
                    : t('form.noFileChosen')}
                </Typography>
              </div>
              <FieldErrorText message={error?.message} />
              {files.length > 0 ? (
                <Box className="mt-2 flex flex-wrap gap-2">
                  {files.map((file, i) => (
                    <RemovableLocalVariantImageThumb
                      key={`${file.name}-${file.size}-${file.lastModified}-${i}`}
                      file={file}
                      removeAriaLabel={t('form.removeVariantImageAria')}
                      onRemove={() => onChange(files.filter((_, idx) => idx !== i))}
                    />
                  ))}
                </Box>
              ) : null}
            </div>
          );
        }}
      />
      {savedImages.length > 0 ? (
        <Box className="mt-2 flex flex-wrap gap-2">
          {savedImages.map((im) => (
            <Box key={im.id} className="relative">
              <img
                src={im.url}
                alt=""
                className="h-16 w-16 object-cover rounded-lg border border-border/60"
              />
              <button
                type="button"
                onClick={() => {
                  const nextIds = keepVIds.filter((x) => x !== Number(im.id));
                  setValue(`variants.${variantIndex}.existing_images_ids`, nextIds, {
                    shouldDirty: true,
                  });
                  setValue(
                    `variants.${variantIndex}.existing_images`,
                    allSavedImages.filter((x) => Number(x.id) !== Number(im.id)),
                    { shouldDirty: true }
                  );
                }}
                className="absolute -top-1.5 -start-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-base font-bold leading-none text-white shadow-md ring-2 ring-white hover:bg-red-700"
                aria-label={t('form.removeVariantImageAria')}
              >
                ×
              </button>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
