import type { AdminToggleEntityType, AdminToggleStatusPayload } from '@/api/admin-toggle-status.types';

import { apiRoutes, axiosInstance } from '@/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ADMIN_TOGGLE_QUERY_ROOT } from '@/api/admin-toggle-invalidate';

/** Types where list refetch can drop `is_active` if the list API omits it — keep optimistic cache. */
const TOGGLE_SKIP_LIST_INVALIDATE: Partial<Record<AdminToggleEntityType, true>> = {
  faq: true,
  badge: true,
};

function patchItemsIsActive(
  cached: unknown,
  id: number | string,
  is_active: boolean
): unknown {
  if (!cached || typeof cached !== 'object') return cached;
  const o = cached as Record<string, unknown>;
  const data = o.data;
  if (
    data &&
    typeof data === 'object' &&
    'items' in data &&
    Array.isArray((data as { items: unknown }).items)
  ) {
    const d = data as { items: Array<Record<string, unknown>>; [k: string]: unknown };
    return {
      ...o,
      data: {
        ...d,
        items: d.items.map((item) =>
          item && String(item.id) === String(id)
            ? { ...item, is_active, is_visible: is_active }
            : item
        ),
      },
    };
  }
  return cached;
}

export function useAdminToggleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminToggleStatusPayload) =>
      axiosInstance.post(apiRoutes.admin.toggleStatus, payload).then((res) => res.data),
    onSuccess: (_data, variables) => {
      const root = ADMIN_TOGGLE_QUERY_ROOT[variables.type];
      if (root) {
        queryClient.setQueriesData({ queryKey: [...root] }, (old) =>
          patchItemsIsActive(old, variables.id, variables.is_active)
        );
        if (!TOGGLE_SKIP_LIST_INVALIDATE[variables.type]) {
          void queryClient.invalidateQueries({ queryKey: [...root] });
        }
      }
    },
  });
}
