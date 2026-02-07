/**
 * Copy / paste post format for Schedule.
 * When user copies a post in Dashboard, we write this format to clipboard.
 * When user pastes in Schedule, we parse and fill the form.
 */
const CLIPBOARD_MAGIC = '_source';
const CLIPBOARD_APP = 'streamer-scheduler';

/**
 * Build clipboard text from a content/post object.
 * @param {{ title: string, content: string, platforms?: string[], contentType?: string }} content
 * @returns {string}
 */
export function copyPostToClipboard(content) {
  const payload = {
    [CLIPBOARD_MAGIC]: CLIPBOARD_APP,
    title: content.title || '',
    content: content.content || '',
    platforms: Array.isArray(content.platforms) ? content.platforms : [],
    contentType: content.contentType || 'post',
  };
  return JSON.stringify(payload);
}

/**
 * Parse clipboard text. If it's a post copied from this app, return { title, content, platforms, contentType }.
 * Otherwise return null.
 * @param {string} text
 * @returns {{ title: string, content: string, platforms: string[], contentType: string } | null}
 */
export function parsePastedPost(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const data = JSON.parse(trimmed);
    if (data[CLIPBOARD_MAGIC] !== CLIPBOARD_APP) return null;
    return {
      title: typeof data.title === 'string' ? data.title : '',
      content: typeof data.content === 'string' ? data.content : '',
      platforms: Array.isArray(data.platforms) ? data.platforms : [],
      contentType: typeof data.contentType === 'string' ? data.contentType : 'post',
    };
  } catch {
    return null;
  }
}
