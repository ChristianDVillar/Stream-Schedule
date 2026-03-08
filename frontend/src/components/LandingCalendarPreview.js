/**
 * Dynamic mini-calendar preview for the landing page.
 * Shows fake demo events with titles and platform icons (no image asset).
 */
import React from 'react';
import { Calendar, Twitch, Twitter } from 'lucide-react';
import { DISCORD_ICON_URL } from '../constants/platforms';
import { DEFAULT_PLATFORM_COLORS } from '../utils/platformColors';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEMO_EVENTS = [
  { day: 'Mon', time: '20:00', title: 'Elden Ring Stream', platforms: ['twitch', 'discord', 'twitter'] },
  { day: 'Wed', time: '21:00', title: 'Indie Game Testing', platforms: ['twitch', 'discord'] },
  { day: 'Fri', time: '19:30', title: 'Community Night', platforms: ['twitch', 'discord', 'twitter'] },
  { day: 'Sat', time: '22:00', title: 'Ranked Grinding', platforms: ['twitch', 'discord'] },
];

const eventsByDay = DEMO_EVENTS.reduce((acc, evt) => {
  acc[evt.day] = evt;
  return acc;
}, {});

function PlatformIcon({ platform, size = 14 }) {
  const color = DEFAULT_PLATFORM_COLORS[platform] || '#6b7280';
  const style = { width: size, height: size };
  switch (platform) {
    case 'twitch':
      return <Twitch style={style} className="flex-shrink-0" />;
    case 'twitter':
      return <Twitter style={style} className="flex-shrink-0" />;
    case 'discord':
      return (
        <img
          src={DISCORD_ICON_URL}
          alt="Discord"
          style={{ width: size, height: size }}
          className="object-contain dark:invert flex-shrink-0"
        />
      );
    default:
      return null;
  }
}

function EventCard({ evt }) {
  return (
    <div className="flex flex-col h-full min-h-[140px] bg-white dark:bg-gray-800 overflow-hidden">
      <div
        className="px-2 py-1.5 sm:px-3 sm:py-2 text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 flex-shrink-0"
        style={{ backgroundColor: DEFAULT_PLATFORM_COLORS.twitch }}
      >
        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 opacity-90" />
        <span>{evt.day} {evt.time}</span>
      </div>
      <div className="px-2 py-2 sm:px-3 sm:py-2.5 flex-1 min-h-0">
        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={evt.title}>
          {evt.title}
        </p>
        <div className="flex items-center gap-1 sm:gap-1.5 mt-1 sm:mt-1.5 flex-wrap">
          {evt.platforms.map((p) => (
            <span
              key={p}
              className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded text-white flex-shrink-0"
              style={{ backgroundColor: DEFAULT_PLATFORM_COLORS[p] || '#6b7280' }}
              title={p}
            >
              <PlatformIcon platform={p} size={10} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingCalendarPreview() {
  return (
    <div className="w-full rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden bg-gray-300 dark:bg-gray-600">
      {/* Single grid: header row + content row, 7 columns — one unified grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-300 dark:bg-gray-600">
        {/* Row 1: day headers */}
        {WEEK_DAYS.map((d) => (
          <div
            key={`h-${d}`}
            className="py-2.5 sm:py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800"
          >
            {d}
          </div>
        ))}
        {/* Row 2: one cell per day — same columns as header */}
        {WEEK_DAYS.map((day) => (
          <div
            key={day}
            className="min-h-[160px] sm:min-h-[180px] bg-gray-50 dark:bg-gray-800/80 p-1 sm:p-1.5 flex flex-col"
          >
            {eventsByDay[day] ? (
              <EventCard evt={eventsByDay[day]} />
            ) : (
              <div className="h-full min-h-[140px] bg-gray-100/80 dark:bg-gray-800/50 rounded-sm" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
