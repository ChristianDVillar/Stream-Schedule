import { CONTENT_STATUS } from '../../../constants/contentStatus.js';

export function getReminderStatuses() {
  return [CONTENT_STATUS.SCHEDULED, CONTENT_STATUS.QUEUED];
}

export function getReminderWindow(now = new Date()) {
  return {
    from: new Date(now.getTime() + 50 * 60 * 1000),
    to: new Date(now.getTime() + 70 * 60 * 1000),
  };
}

