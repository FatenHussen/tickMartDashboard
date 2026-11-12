import type { CurrencyData } from '@/pages/dashboard/currencies/types/currency.types';

import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Iconify } from '@/shared/components/iconify';
import { useParams, useNavigate, useLocation } from 'react-router';
import { CurrencySchema, type CurrencyFormValues } from '@/pages/dashboard/currencies/validation/currency.validation';
import { useCreateCurrency, useUpdateCurrency, useFetchCurrencyById } from '@/pages/dashboard/currencies/hooks/currency';

import { CONFIG } from 'src/global-config';
import { Box, Switch, Typography } from 'src/shared/ui';
import { LoadingScreen } from 'src/shared/components/loading-screen';
import { RHFTextField } from 'src/shared/components/hook-form/rhf-text-field';
import { CreateFormLayout } from 'src/shared/components/forms/create-form-layout';

const currencyFormIcon = (
  <Iconify icon="solar:dollar-minimalistic-bold" className="text-primary" width={24} height={24} />
);

export default function CreatePage() {
  const { t } = useTranslation('table');
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromState = location.state?.currency as CurrencyData | undefined;
  const isEditMode = !!id;

  const { data: detailsResponse, isLoading: isLoadingDetails } = useFetchCurrencyById(id || '');
  const createMutation = useCreateCurrency();
  const updateMutation = useUpdateCurrency();

  const defaultValues: CurrencyFormValues = {
    code: '',
    name: { en: '', ar: '' },
    symbol: '',
    exchange_rate: 1,
    is_default: false,
    is_active: true,
  };

  const methods = useForm<CurrencyFormValues>({
    resolver: zodResolver(CurrencySchema) as any,
    defaultValues,
  });

  const { handleSubmit, reset, control, watch, setValue } = methods;
  const source = isEditMode ? (detailsResponse?.data ?? fromState) : null;
  const isCurrentDefault = source?.is_default === true;
  const isDefault = watch('is_default');

  useEffect(() => {
    if (source) {
      const name = typeof source.name === 'object' ? source.name : { en: String(source.name || ''), ar: '' };
      reset({
        code: source.code || '',
        name: { en: (name as any)?.en || '', ar: (name as any)?.ar || '' },
        symbol: source.symbol || '',
        exchange_rate: source.exchange_rate ?? 1,
        is_default: source.is_default ?? false,
        is_active: Boolean(source.is_active),
      });
    }
  }, [source, reset]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const errorMessage = createMutation.error?.message || updateMutation.error?.message || null;

  const onSubmit = async (data: CurrencyFormValues) => {
    try {
      if (isEditMode && id) {
        await updateMutation.mutateAsync({ id, data });
        toast.success(t('form.currencyUpdatedSuccess'));
      } else {
        await createMutation.mutateAsync(data);
        toast.success(t('form.currencyCreatedSuccess'));
      }
      navigate('/currencies');
    } catch (error: any) { console.error('Error saving currency:', error); }
  };

  if (isEditMode && isLoadingDetails && !fromState) return <LoadingScreen />;

  return (
    <>
      <title>
        {isEditMode
          ? t('form.currencyEditDocumentTitle', { appName: CONFIG.appName })
          : t('form.currencyCreateDocumentTitle', { appName: CONFIG.appName })}
      </title>
      <CreateFormLayout
        methods={methods as any}
        onSubmit={handleSubmit(onSubmit as any)}
        onCancel={() => navigate('/currencies')}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        title={isEditMode ? t('form.editCurrency') : t('form.createCurrency')}
        description={isEditMode ? t('form.editCurrencyDesc') : t('form.createCurrencyDesc')}
        isEditMode={isEditMode}
        isLoading={isEditMode && isLoadingDetails}
        loadingText={t('form.loadingCurrency')}
        submitLabel={isEditMode ? t('form.updateCurrencySubmit') : t('form.createCurrencySubmit')}
        submittingLabel={isEditMode ? t('form.updatingCurrencySubmit') : t('form.creatingCurrencySubmit')}
        ambientBackground
        icon={currencyFormIcon}
        formInnerClassName="flex flex-col gap-8"
      >
        {/* ── Section: Names ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm ring-1 ring-border/30">
          <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-primary/[0.06] via-primary/[0.02] to-transparent">
            <Box className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Iconify icon="solar:dollar-minimalistic-bold" className="text-primary" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.currencyNameEnLabel')} / {t('form.currencyNameArLabel')}
            </Typography>
          </Box>
          <Box className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Box>
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground">{t('form.currencyNameEnLabel')}</Typography>
              <RHFTextField name="name.en" placeholder={t('form.currencyNamePlaceholder')} fullWidth />
            </Box>
            <Box>
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground">{t('form.currencyNameArLabel')}</Typography>
              <RHFTextField name="name.ar" placeholder={t('form.currencyNameArUsd')} dir="rtl" fullWidth />
            </Box>
          </Box>
        </Box>

        {/* ── Section: Code, Symbol & Rate ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm ring-1 ring-border/30">
          <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-amber-500/[0.06] via-amber-500/[0.02] to-transparent">
            <Box className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Iconify icon="solar:tag-price-bold" className="text-amber-500" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.currencyCodeLabel')} & {t('form.currencyExchangeRateLabel')}
            </Typography>
          </Box>
          <Box className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            <Box>
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground">{t('form.currencyCodeLabel')}</Typography>
              <RHFTextField name="code" placeholder={t('form.currencyCodePlaceholder')} fullWidth />
            </Box>
            <Box>
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground">{t('form.currencySymbolLabel')}</Typography>
              <RHFTextField name="symbol" placeholder={t('form.currencySymbolDollar')} fullWidth />
            </Box>
            <Box>
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground">{t('form.currencyExchangeRateLabel')}</Typography>
              <RHFTextField name="exchange_rate" type="number" placeholder={t('form.placeholderExchange1')} fullWidth />
            </Box>
          </Box>
        </Box>

        {/* ── Section: Status ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm ring-1 ring-border/30">
          <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-emerald-500/[0.06] via-emerald-500/[0.02] to-transparent">
            <Box className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Iconify icon="solar:bolt-bold" className="text-emerald-500" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('active')} & {t('form.defaultCurrencyLabel')}
            </Typography>
          </Box>
          <Box className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="is_default"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/20 p-4 transition-colors hover:border-emerald-500/30">
                  <Switch
                    checked={field.value}
                    disabled={isCurrentDefault}
                    aria-label={t('form.defaultCurrencyLabel')}
                    onChange={(e) => {
                      const checked = (e.target as HTMLInputElement).checked;
                      field.onChange(checked);
                      if (checked) setValue('is_active', true, { shouldDirty: true, shouldValidate: true });
                    }}
                  />
                  <Typography variant="subtitle2" className="font-semibold text-foreground">
                    {t('form.defaultCurrencyLabel')}
                  </Typography>
                </div>
              )}
            />
            <Controller
              name="is_active"
              control={control}
              render={({ field, fieldState }) => (
                <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/20 p-4 transition-colors hover:border-emerald-500/30">
                  <Switch
                    checked={field.value}
                    disabled={isDefault && field.value}
                    aria-label={t('active')}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    onChange={(e) => field.onChange((e.target as HTMLInputElement).checked)}
                  />
                  <Typography variant="subtitle2" className="font-semibold text-foreground">
                    {t('active')}
                  </Typography>
                </div>
              )}
            />
          </Box>
          <Typography variant="body2" className="px-6 pb-6 text-muted-foreground">
            {t('form.currencyDefaultHelp')}
          </Typography>
        </Box>
      </CreateFormLayout>
    </>
  );
}
