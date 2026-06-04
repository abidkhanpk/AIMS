import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addWeeks, setDay, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, Spinner, Alert, OverlayTrigger, Popover, Badge } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { ClassDay } from '@prisma/client';

const locales = {
  'en-US': enUS,
  'en': enUS,
  'ur': enUS, // Fallback to enUS because date-fns does not have 'ur'
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface ScheduleAssignment {
  id: string;
  course: { name: string };
  student: { name: string };
  teacher: { name: string };
  classDays: ClassDay[];
  startTime: string; // HH:MM
  duration?: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ScheduleAssignment;
}

// Helper to convert ClassDay enum to date-fns day index (0=Sunday, 1=Monday...)
const dayToIndex: Record<ClassDay, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export default function CalendarView() {
  const { data: session } = useSession();
  const { t, i18n } = useTranslation('common');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());

  const messages = {
    allDay: t('calendar.allDay', 'All Day'),
    previous: t('calendar.previous', 'Back'),
    next: t('calendar.next', 'Next'),
    today: t('calendar.today', 'Today'),
    month: t('calendar.month', 'Month'),
    week: t('calendar.week', 'Week'),
    day: t('calendar.day', 'Day'),
    agenda: t('calendar.agenda', 'Agenda'),
    date: t('calendar.date', 'Date'),
    time: t('calendar.time', 'Time'),
    event: t('calendar.event', 'Event'),
    noEventsInRange: t('calendar.noEventsInRange', 'There are no events in this range.'),
    showMore: (total: number) => `+${total} ${t('calendar.more', 'more')}`
  };

  useEffect(() => {
    async function fetchSchedules() {
      try {
        setLoading(true);
        const res = await fetch('/api/calendar/schedules');
        if (!res.ok) throw new Error('Failed to fetch schedules');
        const assignments: ScheduleAssignment[] = await res.json();

        // Generate concrete events for the current month +/- 1 month
        const generatedEvents: CalendarEvent[] = [];
        const startOfMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 2, 0);

        assignments.forEach(assignment => {
          if (!assignment.startTime) return;
          const [hours, minutes] = assignment.startTime.split(':').map(Number);
          const durationMins = assignment.duration || 60;

          assignment.classDays.forEach(day => {
            const targetDayIndex = dayToIndex[day];

            // Find the first occurrence of this day of the week on or after startOfMonth
            let current = setDay(startOfMonth, targetDayIndex);
            if (current < startOfMonth) {
              current = addWeeks(current, 1);
            }

            // Iterate week by week until endOfMonth
            while (current <= endOfMonth) {
              const eventStart = new Date(current);
              eventStart.setHours(hours, minutes, 0, 0);

              const eventEnd = new Date(eventStart);
              eventEnd.setMinutes(eventEnd.getMinutes() + durationMins);

              let title = '';
              if (session?.user?.role === 'TEACHER') {
                title = `${assignment.course.name} - ${assignment.student.name}`;
              } else if (session?.user?.role === 'STUDENT') {
                title = `${assignment.course.name} with ${assignment.teacher.name}`;
              } else {
                title = `${assignment.student.name} (${assignment.course.name})`;
              }

              generatedEvents.push({
                id: `${assignment.id}-${current.getTime()}`,
                title,
                start: eventStart,
                end: eventEnd,
                resource: assignment,
              });

              current = addWeeks(current, 1);
            }
          });
        });

        setEvents(generatedEvents);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchSchedules();
    }
  }, [session, date]); // Refetch/regenerate when navigating months

  const displayEvents = React.useMemo(() => {
    if (view !== Views.MONTH) return events;

    // Aggregate events for month view to prevent clutter
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      const dateStr = format(e.start, 'yyyy-MM-dd');
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(e);
    });

    return Object.entries(grouped).map(([dateStr, dayEvents]) => {
      const d = parseISO(dateStr);
      return {
        id: `agg-${dateStr}`,
        title: `${dayEvents.length} Classes`,
        start: d,
        end: d,
        resource: { isAggregated: true, dayEvents },
      } as any;
    });
  }, [events, view]);

  const MonthEvent = ({ event }: any) => {
    if (!event.resource?.isAggregated) return <span>{event.title}</span>;
    const dayEvents = event.resource.dayEvents as CalendarEvent[];

    const popover = (
      <Popover id={`popover-${event.id}`} style={{ maxWidth: '300px' }}>
        <Popover.Header as="h3">{format(event.start, 'MMM d, yyyy')}</Popover.Header>
        <Popover.Body className="p-0">
          <div className="list-group list-group-flush">
            {dayEvents.map((e, idx) => (
              <div key={idx} className="list-group-item small border-bottom-0 py-2">
                <div className="fw-bold text-primary">{format(e.start, 'h:mm a')}</div>
                <div>{e.title}</div>
              </div>
            ))}
          </div>
        </Popover.Body>
      </Popover>
    );

    return (
      <OverlayTrigger placement="top" overlay={popover} trigger={['hover', 'focus']}>
        <div className="d-flex align-items-center justify-content-center p-1" style={{ cursor: 'pointer' }}>
          <Badge bg="primary" pill className="opacity-75">
            {dayEvents.length}
          </Badge>
          <span className="ms-1 small text-muted d-none d-md-inline">{t('calendar.classes', 'classes')}</span>
        </div>
      </OverlayTrigger>
    );
  };

  if (loading && events.length === 0) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">{t('auto.loadingSchedule', `Loading schedule...`)}</p>
      </div>
    );
  }

  return (
    <Card className="shadow-sm border-0 mb-4">
      <Card.Header className="bg-white border-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
        <h5 className="fw-bold text-muted mb-0">
          <i className="bi bi-calendar-week me-2 text-primary"></i>
          {t('calendar.classSchedule', 'Class Schedule')}
        </h5>
        {loading && <Spinner animation="border" size="sm" variant="primary" />}
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <div style={{ height: 600, overflow: 'hidden' }}>
          <Calendar
            localizer={localizer}
            culture={i18n.language === 'ur' ? 'ur' : 'en'}
            events={displayEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%', fontFamily: 'inherit' }}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            messages={messages}
            components={{
              month: { event: MonthEvent }
            }}
            popup
            eventPropGetter={(event) => {
              if (view === Views.MONTH) {
                return {
                  style: { backgroundColor: 'transparent', border: 'none' }
                };
              }
              return {
                style: {
                  backgroundColor: '#0d6efd',
                  borderRadius: '4px',
                  opacity: 0.9,
                  color: 'rgba(255, 255, 255, 0.6)',
                  border: '0',
                  display: 'block'
                }
              };
            }}
          />
        </div>
      </Card.Body>
    </Card>
  );
}
