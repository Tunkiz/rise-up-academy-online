interface CalendarEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
}

export function addToGoogleCalendar({ title, description, startDate, endDate }: CalendarEvent) {
  const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
  });

  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
}
