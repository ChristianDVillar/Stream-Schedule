/**
 * Dynamic mini-calendar preview for the landing page.
 * Responsive: horizontal scroll on small screens; compact layout on xs.
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
    <div className="flex flex-col h-full min-h-[100px] sm:min-h-[140px] bg-white dark:bg-gray-800 overflow-hidden rounded">
      <div
        className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 text-white text-[10px] sm:text-sm font-medium flex items-center gap-1 sm:gap-1.5 flex-shrink-0"
        style={{ backgroundColor: DEFAULT_PLATFORM_COLORS.twitch }}
      >
        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 opacity-90" />
        <span className="truncate">{evt.day} {evt.time}</span>
      </div>
      <div className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 flex-1 min-h-0">
        <p className="text-[10px] sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={evt.title}>
          {evt.title}
        </p>
        <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1.5 flex-wrap">
          {evt.platforms.map((p) => (
            <span
              key={p}
              className="inline-flex items-center justify-center w-4 h-4 sm:w-6 sm:h-6 rounded text-white flex-shrink-0"
              style={{ backgroundColor: DEFAULT_PLATFORM_COLORS[p] || '#6b7280' }}
              title={p}
            >
              <PlatformIcon platform={p} size={8} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingCalendarPreview() {
  return (
    <div className="w-full min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden bg-gray-300 dark:bg-gray-600">
      {/* Scroll horizontally on narrow viewports so the 7-day grid stays readable */}
      <div className="overflow-x-auto overflow-y-hidden -mx-1 sm:mx-0 px-1 sm:px-0">
        <div className="inline-block min-w-[280px] sm:min-w-full rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-gray-300 dark:bg-gray-600">
            {/* Row 1: day headers */}
            {WEEK_DAYS.map((d) => (
              <div
                key={`h-${d}`}
                className="min-w-[36px] sm:min-w-0 py-1.5 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800"
              >
                {d}
              </div>
            ))}
            {/* Row 2: one cell per day */}
            {WEEK_DAYS.map((day) => (
              <div
                key={day}
                className="min-w-[36px] sm:min-w-0 min-h-[120px] sm:min-h-[160px] md:min-h-[180px] bg-gray-50 dark:bg-gray-800/80 p-0.5 sm:p-1.5 flex flex-col"
              >
                {eventsByDay[day] ? (
                  <EventCard evt={eventsByDay[day]} />
                ) : (
                  <div className="h-full min-h-[100px] sm:min-h-[140px] bg-gray-100/80 dark:bg-gray-800/50 rounded-sm" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="sr-only">
        Demo calendar: Mon 20:00 Elden Ring Stream, Wed 21:00 Indie Game Testing, Fri 19:30 Community Night, Sat 22:00 Ranked Grinding.
      </p>
    </div>
  );
}
