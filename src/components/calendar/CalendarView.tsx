import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addWeeks, setDay, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, Spinner, Alert, Badge } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import { ClassDay } from '@prisma/client';

const locales = {
  'en-US': enUS,
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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());

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

  if (loading && events.length === 0) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading schedule...</p>
      </div>
    );
  }

  return (
    <Card className="shadow-sm border-0 mb-4">
      <Card.Header className="bg-white border-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
        <h5 className="fw-bold text-muted mb-0">
          <i className="bi bi-calendar-week me-2 text-primary"></i>
          Class Schedule
        </h5>
        {loading && <Spinner animation="border" size="sm" variant="primary" />}
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <div style={{ height: 600, overflow: 'hidden' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%', fontFamily: 'inherit' }}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              popup
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: '#0d6efd',
                  borderRadius: '4px',
                  opacity: 0.9,
                  color: 'white',
                  border: '0',
                  display: 'block'
                }
              })}
            />
        </div>
      </Card.Body>
    </Card>
  );
}
