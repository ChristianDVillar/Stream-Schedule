/**
 * Template API functions
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { apiClient } from './api';

/**
 * GET /templates - Get user templates
 */
export async function getTemplates(includePublic = false) {
  const res = await apiClient.get(`/templates${includePublic ? '?includePublic=true' : ''}`);
  return res.data;
}

/**
 * GET /templates/:id - Get template by ID
 */
export async function getTemplate(id) {
  const res = await apiClient.get(`/templates/${id}`);
  return res.data;
}

/**
 * POST /templates - Create template
 */
export async function createTemplate(templateData) {
  const res = await apiClient.post('/templates', templateData);
  return res.data;
}

/**
 * PUT /templates/:id - Update template
 */
export async function updateTemplate(id, templateData) {
  const res = await apiClient.put(`/templates/${id}`, templateData);
  return res.data;
}

/**
 * DELETE /templates/:id - Delete template
 */
export async function deleteTemplate(id) {
  const res = await apiClient.delete(`/templates/${id}`);
  return res.data;
}

/**
 * POST /templates/:id/create-content - Create content from template
 */
export async function createContentFromTemplate(templateId, scheduledFor, variables = {}) {
  const res = await apiClient.post(`/templates/${templateId}/create-content`, {
    scheduledFor,
    variables,
  });
  return res.data;
}
