import type { DateIdeaBudget, DateIdeaMood } from './types';

export interface DateIdeaMeta {
  id: string;
  budget: DateIdeaBudget;
  durationMinutes: number;
  mood: DateIdeaMood;
}

export const DATE_IDEA_META: DateIdeaMeta[] = [
  { id: 'walk-no-phones', budget: 'free', durationMinutes: 30, mood: 'calm' },
  { id: 'candle-tea-talk', budget: 'free', durationMinutes: 45, mood: 'romantic' },
  { id: 'cook-simple-meal', budget: 'low', durationMinutes: 60, mood: 'playful' },
  { id: 'movie-turn', budget: 'free', durationMinutes: 90, mood: 'playful' },
  { id: 'appreciation-notes', budget: 'free', durationMinutes: 25, mood: 'repair' },
  { id: 'dessert-walk', budget: 'low', durationMinutes: 40, mood: 'playful' },
  { id: 'indoor-picnic', budget: 'low', durationMinutes: 50, mood: 'romantic' },
  { id: 'shared-playlist', budget: 'free', durationMinutes: 45, mood: 'romantic' },
  { id: 'aimless-drive', budget: 'low', durationMinutes: 45, mood: 'playful' },
  { id: 'old-photos', budget: 'free', durationMinutes: 40, mood: 'romantic' },
  { id: 'calm-walk-no-topic', budget: 'free', durationMinutes: 30, mood: 'repair' },
  { id: 'board-game', budget: 'free', durationMinutes: 60, mood: 'playful' },
  { id: 'window-stargazing', budget: 'free', durationMinutes: 30, mood: 'calm' },
  { id: 'handwritten-note', budget: 'free', durationMinutes: 20, mood: 'romantic' },
  { id: 'breakfast-bed', budget: 'low', durationMinutes: 40, mood: 'romantic' },
  { id: 'dance-one-song', budget: 'free', durationMinutes: 10, mood: 'playful' },
  { id: 'puzzle-together', budget: 'free', durationMinutes: 45, mood: 'calm' },
  { id: 'park-bench', budget: 'free', durationMinutes: 30, mood: 'calm' },
  { id: 'first-date-lite', budget: 'low', durationMinutes: 60, mood: 'romantic' },
  { id: 'gratitude-jar', budget: 'free', durationMinutes: 30, mood: 'repair' },
  { id: 'phone-free-dinner', budget: 'low', durationMinutes: 60, mood: 'romantic' },
  { id: 'draw-each-other', budget: 'free', durationMinutes: 25, mood: 'playful' },
  { id: 'nature-walk', budget: 'free', durationMinutes: 40, mood: 'calm' },
  { id: 'blanket-fort', budget: 'free', durationMinutes: 50, mood: 'playful' },
  { id: 'childhood-story', budget: 'free', durationMinutes: 35, mood: 'repair' },
  { id: 'stretch-together', budget: 'free', durationMinutes: 20, mood: 'calm' },
  { id: 'bake-cookies', budget: 'low', durationMinutes: 55, mood: 'playful' },
  { id: 'letter-exchange', budget: 'free', durationMinutes: 30, mood: 'repair' },
  { id: 'sunset-watch', budget: 'free', durationMinutes: 30, mood: 'romantic' },
  { id: 'memory-slideshow', budget: 'free', durationMinutes: 35, mood: 'romantic' },
  { id: 'compliment-round', budget: 'free', durationMinutes: 15, mood: 'repair' },
  { id: 'dream-day-map', budget: 'free', durationMinutes: 40, mood: 'playful' },
  { id: 'home-tea-tasting', budget: 'low', durationMinutes: 35, mood: 'calm' },
  { id: 'helping-walk', budget: 'free', durationMinutes: 45, mood: 'repair' },
  { id: 'plant-together', budget: 'low', durationMinutes: 30, mood: 'calm' },
  { id: 'podcast-episode', budget: 'free', durationMinutes: 40, mood: 'calm' },
  { id: 'foot-massage', budget: 'free', durationMinutes: 25, mood: 'romantic' },
  { id: 'roadtrip-playlist', budget: 'low', durationMinutes: 50, mood: 'playful' },
  { id: 'balcony-stars', budget: 'free', durationMinutes: 25, mood: 'calm' },
  { id: 'future-letter', budget: 'free', durationMinutes: 30, mood: 'repair' },
  { id: 'our-song-replay', budget: 'free', durationMinutes: 15, mood: 'romantic' },
  { id: 'breathing-together', budget: 'free', durationMinutes: 10, mood: 'repair' },
];

export const DATE_IDEA_COUNT = DATE_IDEA_META.length;
