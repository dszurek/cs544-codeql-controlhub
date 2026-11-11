export interface SnoozePreset {
  key: string;
  label: string;
  at: Date;
}

export function snoozePresets(from: Date = new Date()): SnoozePreset[] {
  const d = new Date(from);
  const oneHour = new Date(d.getTime() + 60 * 60 * 1000);
  const threeHours = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const tomorrow9 = new Date(d);
  tomorrow9.setDate(tomorrow9.getDate() + 1);
  tomorrow9.setHours(9, 0, 0, 0);
  const nextMonday = new Date(d);
  const daysToMonday = ((1 - nextMonday.getDay() + 7) % 7) || 7;
  nextMonday.setDate(nextMonday.getDate() + daysToMonday);
  nextMonday.setHours(9, 0, 0, 0);
  const nextWeekend = new Date(d);
  const daysToSat = ((6 - nextWeekend.getDay() + 7) % 7) || 7;
  nextWeekend.setDate(nextWeekend.getDate() + daysToSat);
  nextWeekend.setHours(9, 0, 0, 0);
  return [
    { key: '1h', label: 'In 1 hour', at: oneHour },
    { key: '3h', label: 'In 3 hours', at: threeHours },
    { key: 'tomorrow', label: 'Tomorrow 9am', at: tomorrow9 },
    { key: 'monday', label: 'Next Monday', at: nextMonday },
    { key: 'weekend', label: 'This weekend', at: nextWeekend },
  ];
}
