import { TimeEntry } from '../types';
import { isSameDay } from 'date-fns';

export interface DayGroup {
    date: Date;
    duration: number;
    entries: TimeEntry[];
}

export interface WeekGroup {
    start: Date;
    end: Date;
    duration: number;
    days: DayGroup[];
}

// Helper to get start of week (Monday)
const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

// Helper to calculate duration in minutes
const calculateDuration = (start: string, end: string): number => {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (minutes < 0) minutes += 24 * 60;
    return minutes;
};

/**
 * Groups time entries by week and day
 * @param entries - Array of time entries to group
 * @returns Array of week groups, each containing day groups with their entries
 */
export const groupEntriesByWeek = (entries: TimeEntry[]): WeekGroup[] => {
    // 1. Sort entries by date desc, then time desc
    const sorted = [...entries].sort((a, b) => {
        const dateDiff = b.date.getTime() - a.date.getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.startTime.localeCompare(a.startTime);
    });

    // 2. Group by Week
    const weeks: WeekGroup[] = [];

    sorted.forEach(entry => {
        const entryDate = entry.date;
        const weekStart = getStartOfWeek(entryDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        let weekGroup = weeks.find(w => isSameDay(w.start, weekStart));
        if (!weekGroup) {
            weekGroup = { start: weekStart, end: weekEnd, duration: 0, days: [] };
            weeks.push(weekGroup);
        }

        let dayGroup = weekGroup.days.find(d => isSameDay(d.date, entryDate));
        if (!dayGroup) {
            dayGroup = { date: entryDate, duration: 0, entries: [] };
            weekGroup.days.push(dayGroup);
        }

        const duration = calculateDuration(entry.startTime, entry.endTime);
        dayGroup.entries.push(entry);
        dayGroup.duration += duration;
        weekGroup.duration += duration;
    });

    return weeks;
};
