import type { AxiosRequestConfig, AxiosResponse } from 'axios';

import axiosInstance from './axios';

/**
 * PHP only populates $_POST / $_FILES for POST. Laravel still honors Route::put / Route::patch
 * when the body includes `_method`. Never send FormData with a real PUT/PATCH.
 */
export const postMultipart = <T = unknown>(
  url: string,
  fd: FormData,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> => axiosInstance.post<T>(url, fd, config);

export const putMultipart = <T = unknown>(
  url: string,
  fd: FormData,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  if (!fd.has('_method')) fd.append('_method', 'PUT');
  return axiosInstance.post<T>(url, fd, config);
};

export const patchMultipart = <T = unknown>(
  url: string,
  fd: FormData,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  if (!fd.has('_method')) fd.append('_method', 'PATCH');
  return axiosInstance.post<T>(url, fd, config);
};
