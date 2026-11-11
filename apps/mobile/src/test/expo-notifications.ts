// The timer's alert module only calls expo-notifications at run time, never at
// import. Nothing here schedules anything, and tests do not call those paths.
export const SchedulableTriggerInputTypes = { DATE: 'date' } as const;
