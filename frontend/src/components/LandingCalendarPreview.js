/**
 * Dynamic mini-calendar preview for the landing page.
 * Responsive: horizontal scroll on small screens; compact layout on xs.
 */
import React from 'react';
import { Calendar, Twitch } from 'lucide-react';
import { DISCORD_ICON_URL } from '../constants/platforms';
import { DEFAULT_PLATFORM_COLORS } from '../utils/platformColors';
import XIcon from './XIcon';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TWITCH_GRADIENT = 'linear-gradient(135deg, #9146FF 0%, #6d28d9 100%)';

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
      return <XIcon style={style} className="flex-shrink-0" />;
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

const PLATFORM_GRADIENT_END = {
  twitch: '#6d28d9',
  discord: '#6d28d9',
  twitter: '#0c85d0',
  instagram: '#c13584',
  youtube: '#cc0000',
};

function EventCard({ evt }) {
  return (
    <div className="flex flex-col h-full min-h-[100px] sm:min-h-[140px] bg-white dark:bg-gray-800 overflow-hidden rounded shadow-sm">
      <div
        className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 text-white text-[10px] sm:text-sm font-medium flex items-center gap-1 sm:gap-1.5 flex-shrink-0"
        style={{ background: TWITCH_GRADIENT }}
      >
        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 opacity-90" />
        <span className="truncate">{evt.day} {evt.time}</span>
      </div>
      <div className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 flex-1 min-h-0">
        <p className="text-[10px] sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={evt.title}>
          {evt.title}
        </p>
        <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1.5 flex-wrap">
          {evt.platforms.map((p) => {
            const start = DEFAULT_PLATFORM_COLORS[p] || '#6b7280';
            const end = PLATFORM_GRADIENT_END[p] || '#4b5563';
            return (
              <span
                key={p}
                className="inline-flex items-center justify-center w-4 h-4 sm:w-6 sm:h-6 rounded text-white flex-shrink-0 shadow-sm"
                style={{ background: `linear-gradient(145deg, ${start} 0%, ${end} 100%)` }}
                title={p}
              >
                <PlatformIcon platform={p} size={8} />
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LandingCalendarPreview() {
  return (
    <div className="w-full min-w-0 rounded-xl border border-gray-300 dark:border-gray-600 overflow-hidden shadow-md bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-600 dark:via-gray-700 dark:to-gray-600">
      {/* Scroll horizontally on narrow viewports so the 7-day grid stays readable */}
      <div className="overflow-x-auto overflow-y-hidden -mx-1 sm:mx-0 px-1 sm:px-0">
        <div className="inline-block min-w-[280px] sm:min-w-full rounded-xl overflow-hidden p-px">
          <div className="grid grid-cols-7 gap-px bg-gray-300/80 dark:bg-gray-600/80">
            {/* Row 1: day headers */}
            {WEEK_DAYS.map((d) => (
              <div
                key={`h-${d}`}
                className="min-w-[36px] sm:min-w-0 py-1.5 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900"
              >
                {d}
              </div>
            ))}
            {/* Row 2: one cell per day */}
            {WEEK_DAYS.map((day) => (
              <div
                key={day}
                className="min-w-[36px] sm:min-w-0 min-h-[120px] sm:min-h-[160px] md:min-h-[180px] p-0.5 sm:p-1.5 flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800/90 dark:to-gray-800"
              >
                {eventsByDay[day] ? (
                  <EventCard evt={eventsByDay[day]} />
                ) : (
                  <div className="h-full min-h-[100px] sm:min-h-[140px] rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700" aria-hidden />
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
