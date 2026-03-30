/**
 * AkoeNet admin API via Scheduler proxy: GET /api/admin/akoenet/*
 * Backend uses AKOENET_API_URL + AKOENET_ADMIN_BEARER (JWT from AkoeNet admin).
 */
import { apiClient } from '../../shared/api/client';

export const getAkoenetProxyStatus = () =>
  apiClient.get('/admin/akoenet/status').then((r) => r.data);

/** Full axios response — use .status and .data */
export const getAkoenetHealthDeps = () =>
  apiClient.get('/admin/akoenet/health/deps', { validateStatus: () => true });

export const getAkoenetMetrics = () =>
  apiClient.get('/admin/akoenet/metrics', { validateStatus: () => true });

export const getAkoenetAuditLogs = (params) =>
  apiClient.get('/admin/akoenet/audit-logs', { params });

export const getAkoenetReports = (params) =>
  apiClient.get('/admin/akoenet/reports/messages', { params });

export const patchAkoenetReport = (auditId, body) =>
  apiClient.patch(`/admin/akoenet/reports/messages/${auditId}`, body);
