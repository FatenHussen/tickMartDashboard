import { toast } from 'react-toastify';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Iconify } from '@/shared/components/iconify';
import { useParams, useNavigate } from 'react-router';
import { compressImage } from '@/utils/compress-image';
import { iconArtworkSrc } from '@/pages/dashboard/icons/utils/icon-artwork';
import { TinyMCEEditorField } from '@/shared/components/tinymce-editor/tinymce-editor';
import {
  useCreateIcon,
  useUpdateIcon,
  useFetchIconById,
} from '@/pages/dashboard/icons/hooks/icon';
import {
  IconCreateSchema,
  type IconFormValues,
} from '@/pages/dashboard/icons/validation/icon.validation';

import { CONFIG } from 'src/global-config';
import { Box, Input, Typography } from 'src/shared/ui';
import { LoadingScreen } from 'src/shared/components/loading-screen';
import { RHFTextField } from 'src/shared/components/hook-form/rhf-text-field';
import { CreateFormLayout } from 'src/shared/components/forms/create-form-layout';

function FieldErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Typography variant="caption" className="text-destructive mt-1 block">
      {message}
    </Typography>
  );
}

export default function CreatePage() {
  const { t } = useTranslation('table');
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: detailsResponse, isLoading: isLoadingDetails } = useFetchIconById(id || '');
  const createMutation = useCreateIcon();
  const updateMutation = useUpdateIcon();

  const defaultValues: IconFormValues = {
    name: { en: '', ar: '' },
    image: null,
    description: { en: '', ar: '' },
    full_description: { en: '', ar: '' },
    is_active: true,
  };

  const methods = useForm<IconFormValues>({
    resolver: zodResolver(IconCreateSchema) as any,
    defaultValues,
  });

  const { handleSubmit, reset, control, watch } = methods;
  const imageFile = watch('image');

  useEffect(() => {
    if (isEditMode && detailsResponse?.data) {
      const item = detailsResponse.data;
      setPreviewImage(iconArtworkSrc(item) || item.image || null);
      const name = item.name;
      const desc = item.description;
      const fd = item.full_description;
      reset({
        name: {
          en: typeof name === 'object' ? (name as any).en ?? '' : String(name ?? ''),
          ar: typeof name === 'object' ? (name as any).ar ?? '' : String(name ?? ''),
        },
        image: null,
        description: {
          en: typeof desc === 'object' ? (desc as any)?.en ?? '' : String(desc ?? ''),
          ar: typeof desc === 'object' ? (desc as any)?.ar ?? '' : String(desc ?? ''),
        },
        full_description: {
          en: fd && typeof fd === 'object' ? fd.en ?? '' : '',
          ar: fd && typeof fd === 'object' ? fd.ar ?? '' : '',
        },
        is_active: Boolean(item.is_active),
      });
    }
  }, [detailsResponse?.data, isEditMode, reset]);

  useEffect(() => {
    if (imageFile instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  const onSubmit = async (data: IconFormValues) => {
    try {
      const prepared =
        data.image instanceof File
          ? { ...data, image: await compressImage(data.image) }
          : data;
      if (isEditMode && id) {
        await updateMutation.mutateAsync({ id, data: prepared as any });
        toast.success(t('form.iconUpdatedSuccess'));
        navigate('/icons');
      } else {
        if (!(prepared.image instanceof File)) {
          toast.error(t('form.imageRequired'));
          return;
        }
        await createMutation.mutateAsync(prepared as any);
        toast.success(t('form.iconCreatedSuccess'));
        navigate('/icons');
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  if (isEditMode && isLoadingDetails) return <LoadingScreen />;

  return (
    <>
      <title>
        {isEditMode
          ? t('form.iconEditDocumentTitle', { appName: CONFIG.appName })
          : t('form.iconCreateDocumentTitle', { appName: CONFIG.appName })}
      </title>
      <CreateFormLayout
        methods={methods as any}
        onSubmit={handleSubmit(onSubmit as any)}
        onCancel={() => navigate('/icons')}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        title={isEditMode ? t('form.editIcon') : t('form.createIcon')}
        description={isEditMode ? t('form.editIconDesc') : t('form.createIconDesc')}
        isEditMode={isEditMode}
        isLoading={isEditMode && isLoadingDetails}
        loadingText={t('form.loadingIcon')}
        submitLabel={isEditMode ? t('form.updateIconSubmit') : t('form.createIconSubmit')}
        submittingLabel={isEditMode ? t('form.updatingIconSubmit') : t('form.creatingIconSubmit')}
      >
        {/* ── Section: Names & Image ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-primary/[0.06] via-primary/[0.02] to-transparent">
            <Box className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Iconify icon="solar:sticker-smile-bold" className="text-primary" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.nameEn')} / {t('form.nameAr')} & {t('form.imageLabel')}
            </Typography>
          </Box>
          <Box className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5" dir="ltr">
            <Box>
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground">{t('form.nameEn')}</Typography>
              <RHFTextField name="name.en" placeholder={t('form.iconNameEnPlaceholder')} helperText={t('form.iconNameEnHelper')} />
            </Box>
            <Box>
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground">{t('form.nameAr')}</Typography>
              <RHFTextField name="name.ar" placeholder={t('form.iconNameArPlaceholder')} helperText={t('form.iconNameArHelper')} dir="rtl" />
            </Box>
            <Box className="md:col-span-2">
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground flex items-center gap-1.5"><Iconify icon="solar:gallery-add-bold" className="text-primary" width={16} />{isEditMode ? t('form.imageLabel') : t('form.imageLabelRequired')}</Typography>
              <Controller name="image" control={control} render={({ field: { onChange, ...field }, fieldState: { error } }) => (
                <div className="w-full">
                  <Input {...field} value={undefined} type="file" accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml,image/webp" onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; onChange(file || null); }} error={!!error} helperText={error?.message || (isEditMode ? t('form.imageHelperEdit') : t('form.imageHelper'))} fullWidth />
                  {previewImage && (<Box className="mt-3"><img src={previewImage} alt={t('form.iconPreviewAlt')} className="w-16 h-16 object-contain rounded-lg border border-border p-1 bg-muted/20" /></Box>)}
                </div>
              )} />
            </Box>
          </Box>
        </Box>

        {/* ── Section: Descriptions ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-violet-500/[0.06] via-violet-500/[0.02] to-transparent">
            <Box className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Iconify icon="solar:document-text-bold" className="text-violet-500" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.descriptionEn')} / {t('form.descriptionAr')}
            </Typography>
          </Box>
          <Box className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5" dir="ltr">
            <Box>
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground">{t('form.descriptionEn')} {t('form.descriptionOptionalSuffix')}</Typography>
              <RHFTextField name="description.en" placeholder={t('form.descriptionEnPlaceholder')} />
            </Box>
            <Box>
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground">{t('form.descriptionAr')} {t('form.descriptionOptionalSuffix')}</Typography>
              <RHFTextField name="description.ar" placeholder={t('form.descriptionArPlaceholder')} dir="rtl" />
            </Box>
          </Box>
        </Box>

        {/* ── Section: Full Description ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-amber-500/[0.06] via-amber-500/[0.02] to-transparent">
            <Box className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Iconify icon="solar:document-bold" className="text-amber-500" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.iconFullDescSection')}
            </Typography>
          </Box>
          <Box className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5" dir="ltr">
            <Box>
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground">{t('form.iconFullDescEn')}</Typography>
              <Controller name="full_description.en" control={control} render={({ field, fieldState: { error } }) => (
                <div>
                  <TinyMCEEditorField value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} placeholder={t('form.iconFullDescEnPlaceholder')} dir="ltr" menubar toolsMenuWordCount height={320} />
                  <FieldErrorText message={error?.message} />
                </div>
              )} />
            </Box>
            <Box>
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground" dir="rtl">
                {t('form.iconFullDescAr')}
              </Typography>
              <Controller name="full_description.ar" control={control} render={({ field, fieldState: { error } }) => (
                <div>
                  <TinyMCEEditorField value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} placeholder={t('form.iconFullDescArPlaceholder')} dir="rtl" menubar toolsMenuWordCount height={320} />
                  <FieldErrorText message={error?.message} />
                </div>
              )} />
            </Box>
          </Box>
        </Box>
      </CreateFormLayout>
    </>
  );
}
