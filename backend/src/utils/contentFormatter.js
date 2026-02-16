/**
 * Content Formatter
 * Adapts content format based on contentType and platform
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

/**
 * Format content for Twitter/X based on contentType
 */
export function formatTwitterContent(content) {
  const { title, content: body, contentType, hashtags, mentions } = content;
  
  let formattedText = '';
  const parts = [];
  
  // Add emoji prefix based on content type
  const typeEmojis = {
    post: '📝',
    stream: '🔴',
    event: '📅',
    reel: '🎬'
  };
  
  const emoji = typeEmojis[contentType] || '';
  
  // Format title
  if (title) {
    if (emoji) {
      parts.push(`${emoji} ${title}`);
    } else {
      parts.push(title);
    }
  }
  
  // Format body
  if (body) {
    parts.push(body);
  }
  
  // Add mentions
  if (mentions) {
    const mentionList = mentions.split(',').map(m => m.trim()).filter(Boolean);
    if (mentionList.length > 0) {
      parts.push(mentionList.map(m => m.startsWith('@') ? m : `@${m}`).join(' '));
    }
  }
  
  // Add hashtags
  if (hashtags) {
    const hashtagList = hashtags.split(',').map(h => h.trim()).filter(Boolean);
    if (hashtagList.length > 0) {
      parts.push(hashtagList.map(h => h.startsWith('#') ? h : `#${h}`).join(' '));
    }
  }
  
  formattedText = parts.join('\n\n');
  
  // Add type-specific formatting
  if (contentType === 'stream') {
    if (!formattedText.includes('🔴')) {
      formattedText = `🔴 ${formattedText}`;
    }
  } else if (contentType === 'event') {
    if (!formattedText.includes('📅')) {
      formattedText = `📅 ${formattedText}`;
    }
  } else if (contentType === 'reel') {
    if (!formattedText.includes('🎬')) {
      formattedText = `🎬 ${formattedText}`;
    }
  }
  
  return formattedText.trim() || ' ';
}

/**
 * Format content for Discord based on contentType
 */
export function formatDiscordContent(content) {
  const { title, content: body, contentType, hashtags, mentions, eventDates } = content;
  
  const parts = [];
  
  // Format title with emphasis based on type
  if (title) {
    if (contentType === 'stream') {
      parts.push(`🔴 **${title}**`);
    } else if (contentType === 'event') {
      parts.push(`📅 **${title}**`);
    } else if (contentType === 'reel') {
      parts.push(`🎬 **${title}**`);
    } else {
      parts.push(`**${title}**`);
    }
  }
  
  // Format body
  if (body) {
    parts.push(body);
  }
  
  // Add event dates if multiple dates provided
  if (contentType === 'event' && eventDates && Array.isArray(eventDates) && eventDates.length > 1) {
    parts.push('\n**📅 Event Dates & Times:**');
    eventDates.forEach((eventDate, index) => {
      if (eventDate.date && eventDate.time) {
        try {
          // Ensure date and time are in correct format
          const dateStr = eventDate.date.includes('T') ? eventDate.date.split('T')[0] : eventDate.date;
          const timeStr = eventDate.time.includes('T') ? eventDate.time.split('T')[1] : eventDate.time;
          const date = new Date(`${dateStr}T${timeStr}`);
          
          if (isNaN(date.getTime())) {
            return; // Skip invalid dates
          }
          
          const formattedDateStr = date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
          const formattedTimeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          let dateTimeStr = `${formattedDateStr} at ${formattedTimeStr}`;
          
          if (eventDate.endDate && eventDate.endTime) {
            try {
              const endDateStr = eventDate.endDate.includes('T') ? eventDate.endDate.split('T')[0] : eventDate.endDate;
              const endTimeStr = eventDate.endTime.includes('T') ? eventDate.endTime.split('T')[1] : eventDate.endTime;
              const endDate = new Date(`${endDateStr}T${endTimeStr}`);
              if (!isNaN(endDate.getTime())) {
                const endTimeStrFormatted = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                dateTimeStr += ` - ${endTimeStrFormatted}`;
              }
            } catch (err) {
              // Skip end time if invalid
            }
          }
          
          parts.push(`${index + 1}. ${dateTimeStr}`);
        } catch (err) {
          // Skip invalid dates
        }
      }
    });
  }
  
  // Add mentions (Discord format)
  if (mentions) {
    const mentionList = mentions.split(',').map(m => m.trim()).filter(Boolean);
    if (mentionList.length > 0) {
      parts.push(`\n${mentionList.map(m => m.startsWith('@') ? m : `@${m}`).join(' ')}`);
    }
  }
  
  // Add hashtags
  if (hashtags) {
    const hashtagList = hashtags.split(',').map(h => h.trim()).filter(Boolean);
    if (hashtagList.length > 0) {
      parts.push(`\n${hashtagList.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`);
    }
  }
  
  return parts.join('\n\n').trim() || '';
}

/**
 * Get Discord event location based on contentType and platforms
 */
export function getDiscordEventLocation(content) {
  const { contentType, platforms } = content;
  
  // If platforms include specific streaming platforms, use them
  if (Array.isArray(platforms)) {
    if (platforms.includes('twitch')) {
      return 'Twitch';
    }
    if (platforms.includes('youtube')) {
      return 'YouTube';
    }
    if (platforms.includes('instagram')) {
      return 'Instagram';
    }
  }
  
  // Default based on contentType
  if (contentType === 'stream') {
    return 'Stream';
  }
  if (contentType === 'event') {
    return 'Event';
  }
  if (contentType === 'reel') {
    return 'Reel';
  }
  
  return 'Stream';
}

/**
 * Format content for Instagram based on contentType
 */
export function formatInstagramContent(content) {
  const { title, content: body, contentType, hashtags, mentions } = content;
  
  const parts = [];
  
  // Format title with emoji based on type
  if (title) {
    if (contentType === 'stream') {
      parts.push(`🔴 ${title}`);
    } else if (contentType === 'event') {
      parts.push(`📅 ${title}`);
    } else if (contentType === 'reel') {
      parts.push(`🎬 ${title}`);
    } else {
      parts.push(title);
    }
  }
  
  // Format body
  if (body) {
    parts.push(body);
  }
  
  // Add mentions
  if (mentions) {
    const mentionList = mentions.split(',').map(m => m.trim()).filter(Boolean);
    if (mentionList.length > 0) {
      parts.push(`\n${mentionList.map(m => m.startsWith('@') ? m : `@${m}`).join(' ')}`);
    }
  }
  
  // Add hashtags (Instagram relies heavily on hashtags)
  if (hashtags) {
    const hashtagList = hashtags.split(',').map(h => h.trim()).filter(Boolean);
    if (hashtagList.length > 0) {
      parts.push(`\n\n${hashtagList.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`);
    }
  }
  
  return parts.join('\n').trim() || '';
}

/**
 * Format content for Twitch based on contentType
 */
export function formatTwitchContent(content) {
  const { title, content: body, contentType, hashtags } = content;
  
  const parts = [];
  
  // Format title with emoji based on type
  if (title) {
    if (contentType === 'stream') {
      parts.push(`🔴 LIVE: ${title}`);
    } else if (contentType === 'event') {
      parts.push(`📅 ${title}`);
    } else if (contentType === 'reel') {
      parts.push(`🎬 ${title}`);
    } else {
      parts.push(title);
    }
  }
  
  // Format body
  if (body) {
    parts.push(body);
  }
  
  // Add hashtags (Twitch uses hashtags)
  if (hashtags) {
    const hashtagList = hashtags.split(',').map(h => h.trim()).filter(Boolean);
    if (hashtagList.length > 0) {
      parts.push(`\n${hashtagList.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`);
    }
  }
  
  return parts.join('\n\n').trim() || '';
}

/**
 * Format YouTube video title and description based on contentType
 */
export function formatYouTubeContent(content) {
  const { title, content: body, contentType, hashtags } = content;
  
  let videoTitle = title || 'Untitled Video';
  let description = body || '';
  
  // Add type prefix/formatting to title based on contentType
  if (contentType === 'stream') {
    // For streams, add live indicator if not present
    const lowerTitle = videoTitle.toLowerCase();
    if (!lowerTitle.includes('stream') && !lowerTitle.includes('live') && !lowerTitle.includes('🔴')) {
      videoTitle = `🔴 LIVE: ${videoTitle}`;
    }
  } else if (contentType === 'event') {
    // For events, add event indicator
    const lowerTitle = videoTitle.toLowerCase();
    if (!lowerTitle.includes('event') && !lowerTitle.includes('📅')) {
      videoTitle = `📅 ${videoTitle}`;
    }
  } else if (contentType === 'reel') {
    // For reels, add reel indicator
    const lowerTitle = videoTitle.toLowerCase();
    if (!lowerTitle.includes('reel') && !lowerTitle.includes('🎬')) {
      videoTitle = `🎬 ${videoTitle}`;
    }
  }
  
  // Format description with hashtags (YouTube uses hashtags in description)
  if (hashtags) {
    const hashtagList = hashtags.split(',').map(h => h.trim()).filter(Boolean);
    if (hashtagList.length > 0) {
      const formattedHashtags = hashtagList.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
      description = description ? `${description}\n\n${formattedHashtags}` : formattedHashtags;
    }
  }
  
  return {
    title: videoTitle.trim(),
    description: description.trim() || ''
  };
}
