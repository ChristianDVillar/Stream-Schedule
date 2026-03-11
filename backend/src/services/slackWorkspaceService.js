/**
 * Slack Workspace Setup Service
 * Creates channels and user groups when a streamer connects Slack (Setup Streaming Workspace).
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import logger from '../utils/logger.js';

const SLACK_API = 'https://slack.com/api';

const DEFAULT_CHANNELS = [
  'stream-announcements',
  'stream-chat',
  'stream-clips',
  'stream-mods',
];

const DEFAULT_GROUPS = [
  { name: 'Moderators', handle: 'mods' },
  { name: 'Editors', handle: 'editors' },
];

/**
 * Call Slack API (POST JSON).
 * @param {string} token - Bot token (xoxb-...)
 * @param {string} method - e.g. 'conversations.create'
 * @param {object} body - JSON body
 * @returns {{ ok: boolean, data?: object, error?: string }}
 */
async function slackApi(token, method, body = {}) {
  const url = `${SLACK_API}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    logger.warn('Slack API error', { method, error: data.error, body });
    return { ok: false, error: data.error || 'unknown' };
  }
  return { ok: true, data };
}

/**
 * Create a single channel.
 * @param {string} token - Bot token
 * @param {string} name - Channel name (lowercase, no spaces)
 * @param {boolean} [isPrivate] - If true, create private channel
 * @returns {{ id?: string, name?: string, error?: string }}
 */
export async function createSlackChannel(token, name, isPrivate = false) {
  const result = await slackApi(token, 'conversations.create', {
    name: name.replace(/\s+/g, '-').toLowerCase().slice(0, 80),
    is_private: !!isPrivate,
  });
  if (!result.ok) {
    return { error: result.error };
  }
  const ch = result.data?.channel;
  return { id: ch?.id, name: ch?.name };
}

/**
 * Create all default streaming channels.
 * @param {string} token - Bot token
 * @returns {{ channels: Record<string, string>, errors: string[] }}
 */
export async function createStreamingChannels(token) {
  const channels = {};
  const errors = [];
  for (const name of DEFAULT_CHANNELS) {
    const out = await createSlackChannel(token, name);
    if (out.error) {
      if (out.error === 'name_taken') {
        const listRes = await slackApi(token, 'conversations.list', { types: 'public_channel,private_channel', limit: 500 });
        const list = listRes.data?.channels || [];
        const existing = list.find((c) => c.name === name);
        if (existing) {
          channels[name] = existing.id;
          continue;
        }
      }
      errors.push(`${name}: ${out.error}`);
      continue;
    }
    if (out.id) channels[name] = out.id;
  }
  return { channels, errors };
}

/**
 * Create a user group.
 * @param {string} token - Bot token
 * @param {{ name: string, handle: string }} group - name and handle (e.g. @mods)
 * @returns {{ id?: string, error?: string }}
 */
export async function createSlackUserGroup(token, group) {
  const result = await slackApi(token, 'usergroups.create', {
    name: group.name,
    handle: group.handle,
  });
  if (!result.ok) {
    return { error: result.error };
  }
  const ug = result.data?.usergroup;
  return { id: ug?.id };
}

/**
 * Create default user groups (Moderators, Editors).
 * @param {string} token - Bot token
 * @returns {{ groups: Record<string, string>, errors: string[] }}
 */
export async function createStreamingUserGroups(token) {
  const groups = {};
  const errors = [];
  for (const group of DEFAULT_GROUPS) {
    const out = await createSlackUserGroup(token, group);
    if (out.error) {
      if (out.error === 'handle_in_use' || out.error === 'name_already_exists') {
        const listRes = await slackApi(token, 'usergroups.list', { include_users: false });
        const list = listRes.data?.usergroups || [];
        const existing = list.find((g) => g.handle === group.handle || g.name === group.name);
        if (existing) {
          groups[group.handle] = existing.id;
          continue;
        }
      }
      errors.push(`${group.handle}: ${out.error}`);
      continue;
    }
    if (out.id) groups[group.handle] = out.id;
  }
  return { groups, errors };
}

/**
 * Invite users to a channel.
 * @param {string} token - Bot token
 * @param {string} channelId - Channel ID
 * @param {string[]} userIds - Slack user IDs
 * @returns {{ ok: boolean, error?: string }}
 */
export async function inviteToChannel(token, channelId, userIds) {
  if (!channelId || !userIds?.length) return { ok: true };
  const result = await slackApi(token, 'conversations.invite', {
    channel: channelId,
    users: userIds.join(','),
  });
  return { ok: result.ok, error: result.error };
}

/**
 * Update user group members.
 * @param {string} token - Bot token
 * @param {string} usergroupId - User group ID
 * @param {string[]} userIds - Slack user IDs to add
 * @returns {{ ok: boolean, error?: string }}
 */
export async function updateUserGroupMembers(token, usergroupId, userIds) {
  if (!usergroupId || !userIds?.length) return { ok: true };
  const result = await slackApi(token, 'usergroups.users.update', {
    usergroup: usergroupId,
    users: userIds.join(','),
  });
  return { ok: result.ok, error: result.error };
}

/**
 * Post a message to a channel (by ID or name).
 * @param {string} token - Bot token
 * @param {string} channel - Channel ID or name (e.g. #stream-announcements)
 * @param {string} text - Message text
 * @param {object} [opts] - Optional blocks, etc.
 * @returns {{ ok: boolean, ts?: string, error?: string }}
 */
export async function postSlackMessage(token, channel, text, opts = {}) {
  const result = await slackApi(token, 'chat.postMessage', {
    channel,
    text,
    ...opts,
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, ts: result.data?.ts };
}

/**
 * Full setup: create channels + user groups and persist channel/group IDs in metadata.
 * @param {string} token - Bot token from Integration
 * @param {object} currentMetadata - Current Integration.metadata to merge into
 * @returns {{ channels: Record<string, string>, groups: Record<string, string>, errors: string[] }}
 */
export async function setupStreamingWorkspace(token, currentMetadata = {}) {
  const errors = [];
  const { channels: createdChannels, errors: channelErrors } = await createStreamingChannels(token);
  errors.push(...channelErrors);

  const { groups: createdGroups, errors: groupErrors } = await createStreamingUserGroups(token);
  errors.push(...groupErrors);

  const channels = { ...(currentMetadata.channels || {}), ...createdChannels };
  const groups = { ...(currentMetadata.groups || {}), ...createdGroups };

  return { channels, groups, errors };
}
