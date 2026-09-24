import type { TFunction } from 'i18next';

const ORDER_STATUS_TABLE_KEYS: Record<
  string,
  | 'statusPending'
  | 'statusWaitingApproval'
  | 'statusPreparing'
  | 'statusOutDelivery'
  | 'statusDelivered'
  | 'statusCancelled'
  | 'statusCancelledByAdmin'
  | 'statusRejectedByDelivery'
  | 'statusFaildDeliver'
  | 'statusReturnedByUser'
> = {
  pending: 'statusPending',
  waiting_approval: 'statusWaitingApproval',
  preparing: 'statusPreparing',
  out_delivery: 'statusOutDelivery',
  out_for_delivery: 'statusOutDelivery',
  delivered: 'statusDelivered',
  cancelled: 'statusCancelled',
  cancelled_by_admin: 'statusCancelledByAdmin',
  rejected_by_delivery: 'statusRejectedByDelivery',
  faild_deliver: 'statusFaildDeliver',
  returned_by_user: 'statusReturnedByUser',
};

export function translateComplaintOrderStatus(status: string, t: TFunction<'table'>): string {
  const key = ORDER_STATUS_TABLE_KEYS[status];
  return key ? String(t(key)) : status.replace(/_/g, ' ');
}

export function translateComplaintType(type: string, t: TFunction<'table'>): string {
  return t(`complaintType.${type}`, { defaultValue: type.replace(/_/g, ' ') });
}

export function translateComplaintStatus(status: string, t: TFunction<'table'>): string {
  if (status === 'new') return String(t('statusNew'));
  if (status === 'resolved') return String(t('statusResolved'));
  if (status === 'rejected') return String(t('statusRejected'));
  return status.replace(/_/g, ' ');
}
