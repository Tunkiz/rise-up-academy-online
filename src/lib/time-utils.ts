
const dayMap: { [key: string]: number } = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Parses a class time string (e.g., "Monday at 3 PM") and calculates the next occurrence.
 * @param classTimeStr The string to parse.
 * @returns The Date object for the next class time, or null if parsing fails.
 */
export const getNextClassOccurrence = (classTimeStr: string): Date | null => {
  const now = new Date();
  
  const parts = classTimeStr.toLowerCase().split(' at ');
  if (parts.length !== 2) return null;

  const dayName = parts[0].trim();
  const timePart = parts[1].trim();

  const targetDay = dayMap[dayName];
  if (targetDay === undefined) return null;

  const timeMatch = timePart.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (!timeMatch) return null;

  let hour = parseInt(timeMatch[1], 10);
  const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  const ampm = timeMatch[3];

  if (ampm === 'pm' && hour < 12) {
    hour += 12;
  }
  if (ampm === 'am' && hour === 12) { // Midnight case
    hour = 0;
  }

  const currentDay = now.getDay();
  let dayDifference = (targetDay - currentDay + 7) % 7;

  const nextOccurrence = new Date(now);
  nextOccurrence.setDate(now.getDate() + dayDifference);
  nextOccurrence.setHours(hour, minute, 0, 0);

  // If the calculated time for today has already passed, get next week's occurrence.
  if (nextOccurrence < now) {
    nextOccurrence.setDate(nextOccurrence.getDate() + 7);
  }

  return nextOccurrence;
};

/**
 * Checks if a class time string represents a class occurring in the next 24 hours.
 * @param classTimeStr The class time string.
 * @returns boolean
 */
export const isClassInNext24Hours = (classTimeStr: string): boolean => {
  const nextOccurrence = getNextClassOccurrence(classTimeStr);
  if (!nextOccurrence) return false;

  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return nextOccurrence > now && nextOccurrence < twentyFourHoursFromNow;
};
