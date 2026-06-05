import React, { useState, useEffect, useRef } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addWeeks, setDay, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, Spinner, Alert } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { ClassDay } from '@prisma/client';

const locales = { 'en-US': enUS, 'en': enUS, 'ur': enUS };

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface ScheduleAssignment {
  id: string;
  course: { name: string };
  student: { name: string };
  teacher: { name: string };
  classDays: ClassDay[];
  startTime: string;
  duration?: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ScheduleAssignment;
}

const dayToIndex: Record<ClassDay, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
  THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

const EVENT_COLORS = [
  { bg: '#e8f4ff', border: '#3b82f6', text: '#1d4ed8' },
  { bg: '#f0fdf4', border: '#22c55e', text: '#15803d' },
  { bg: '#fdf4ff', border: '#a855f7', text: '#7e22ce' },
  { bg: '#fff7ed', border: '#f97316', text: '#c2410c' },
  { bg: '#fef9c3', border: '#eab308', text: '#854d0e' },
  { bg: '#fff1f2', border: '#f43f5e', text: '#be123c' },
  { bg: '#f0f9ff', border: '#0ea5e9', text: '#0369a1' },
];

function getColorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}

/* ─────────────────────────────────────────────
   Shared Tooltip — light-themed, scrollable,
   compact single-line rows, wide with word-wrap
   ───────────────────────────────────────────── */
interface TooltipProps {
  events: CalendarEvent[];
  dateLabel: string;
  role?: string;
  anchorRect: DOMRect;
}

const TIP_WIDTH = 340;
const TIP_MAX_HEIGHT = 300; // header ~50 + up to 5 rows ~50 each

function EventTooltip({ events, dateLabel, role, anchorRect }: TooltipProps) {
  // All coords are viewport-relative (position: fixed)
  const margin = 10;

  // Prefer right of element; flip left if it would overflow
  let left = anchorRect.right + margin;
  if (left + TIP_WIDTH > window.innerWidth - margin) {
    left = anchorRect.left - TIP_WIDTH - margin;
  }
  // Clamp so it never goes off left edge
  if (left < margin) left = margin;

  // Prefer top-aligned to anchor; nudge up if it would overflow bottom
  let top = anchorRect.top;
  if (top + TIP_MAX_HEIGHT > window.innerHeight - margin) {
    top = window.innerHeight - TIP_MAX_HEIGHT - margin;
  }
  if (top < margin) top = margin;

  return (
    <div
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 99999,
        pointerEvents: 'none',
        width: TIP_WIDTH,
        background: '#fff',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        border: '1px solid #dee2e6',
        overflow: 'hidden',
        animation: 'tooltipFadeIn 0.13s ease',
      }}
    >
      {/* Header — light blue, same palette as the rest of the app */}
      <div
        style={{
          background: '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <i className="bi bi-calendar3" style={{ color: '#0d6efd', fontSize: 13 }} />
        <span style={{ fontWeight: 700, fontSize: 12.5, color: '#212529' }}>{dateLabel}</span>
        <span
          style={{
            marginLeft: 'auto',
            background: '#0d6efd',
            color: '#fff',
            borderRadius: 20,
            padding: '1px 9px',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {events.length} class{events.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Scrollable event list — max height ~220px */}
      <div style={{ maxHeight: 220, overflowY: 'auto', padding: '6px 0' }}>
        {events.map((ev, idx) => {
          const col = getColorForId(ev.resource.id);
          const startTime = format(ev.start, 'h:mm a');
          const endTime   = format(ev.end,   'h:mm a');

          return (
            <div
              key={idx}
              style={{
                padding: '5px 12px',
                borderBottom: idx < events.length - 1 ? '1px solid #f1f5f9' : 'none',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              {/* Color dot */}
              <span
                style={{
                  display: 'inline-block',
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: col.border,
                  flexShrink: 0,
                  marginTop: 3,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Row 1: course · time */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                    flexWrap: 'wrap',
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 12, color: '#212529', wordBreak: 'break-word' }}>
                    {ev.resource.course.name}
                  </span>
                  <span style={{ fontSize: 11, color: '#6c757d', whiteSpace: 'nowrap' }}>
                    {startTime} – {endTime}
                  </span>
                </div>
                {/* Row 2: teacher / student */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 2 }}>
                  {role !== 'TEACHER' && (
                    <span style={{ fontSize: 11, color: '#6c757d', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="bi bi-book" style={{ fontSize: 11 }} />
                      {ev.resource.teacher.name}
                    </span>
                  )}
                  {role !== 'STUDENT' && (
                    <span style={{ fontSize: 11, color: '#6c757d', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="bi bi-mortarboard" style={{ fontSize: 11 }} />
                      {ev.resource.student.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Agenda event renderer — adds teacher/student
   ───────────────────────────────────────────── */
function AgendaEvent({ event, role }: { event: CalendarEvent; role?: string }) {
  const col = getColorForId(event.resource.id);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: col.border,
          flexShrink: 0,
        }}
      />
      <span style={{ fontWeight: 600, fontSize: 13, color: '#212529' }}>{event.title}</span>
      {role !== 'TEACHER' && (
        <span style={{ fontSize: 11.5, color: '#6c757d', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <i className="bi bi-book" style={{ fontSize: 12 }} />
          {event.resource.teacher.name}
        </span>
      )}
      {role !== 'STUDENT' && (
        <span style={{ fontSize: 11.5, color: '#6c757d', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <i className="bi bi-mortarboard" style={{ fontSize: 12 }} />
          {event.resource.student.name}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main CalendarView component
   ───────────────────────────────────────────── */
export default function CalendarView() {
  const { data: session } = useSession();
  const { t, i18n } = useTranslation('common');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const role = session?.user?.role;

  const [tooltip, setTooltip] = useState<{
    events: CalendarEvent[];
    dateLabel: string;
    anchorRect: DOMRect;
  } | null>(null);

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
    showMore: (total: number) => `+${total} ${t('calendar.more', 'more')}`,
  };

  useEffect(() => {
    async function fetchSchedules() {
      try {
        setLoading(true);
        const res = await fetch('/api/calendar/schedules');
        if (!res.ok) throw new Error('Failed to fetch schedules');
        const assignments: ScheduleAssignment[] = await res.json();

        const generatedEvents: CalendarEvent[] = [];
        const startOfRange = new Date(date.getFullYear(), date.getMonth() - 1, 1);
        const endOfRange   = new Date(date.getFullYear(), date.getMonth() + 2, 0);

        assignments.forEach(assignment => {
          if (!assignment.startTime) return;
          const [hours, minutes] = assignment.startTime.split(':').map(Number);
          const durationMins = assignment.duration || 60;

          assignment.classDays.forEach(day => {
            const targetDayIndex = dayToIndex[day];
            let current = setDay(startOfRange, targetDayIndex);
            if (current < startOfRange) current = addWeeks(current, 1);

            while (current <= endOfRange) {
              const eventStart = new Date(current);
              eventStart.setHours(hours, minutes, 0, 0);
              const eventEnd = new Date(eventStart);
              eventEnd.setMinutes(eventEnd.getMinutes() + durationMins);

              let title = '';
              if (role === 'TEACHER') {
                title = `${assignment.student.name} – ${assignment.course.name}`;
              } else if (role === 'STUDENT') {
                title = `${assignment.course.name} w/ ${assignment.teacher.name}`;
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
    if (session) fetchSchedules();
  }, [session, date, role]);

  /* Month view: aggregate per day */
  const displayEvents = React.useMemo(() => {
    if (view !== Views.MONTH) return events;

    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach(e => {
      const key = format(e.start, 'yyyy-MM-dd');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    });

    return Object.entries(grouped).map(([dateStr, dayEvents]) => {
      const d = parseISO(dateStr);
      return {
        id: `agg-${dateStr}`,
        title: `${dayEvents.length} classes`,
        start: d,
        end: d,
        resource: { isAggregated: true, dayEvents },
      } as any;
    });
  }, [events, view]);

  /* Helper: open tooltip anchored to any element */
  const openTooltip = (el: HTMLElement, evs: CalendarEvent[], label: string) => {
    setTooltip({ events: evs, dateLabel: label, anchorRect: el.getBoundingClientRect() });
  };

  /* ── Month event cell ── */
  const MonthEvent = ({ event }: any) => {
    if (!event.resource?.isAggregated) return <span>{event.title}</span>;

    const dayEvents: CalendarEvent[] = event.resource.dayEvents;
    const MAX_INLINE = 3;

    return (
      <div
        className="cal-day-cell"
        onMouseEnter={e => openTooltip(e.currentTarget as HTMLElement, dayEvents, format(event.start, 'MMM d, yyyy'))}
        onMouseLeave={() => setTooltip(null)}
        style={{ cursor: 'default', padding: '2px 3px' }}
      >
        {dayEvents.slice(0, MAX_INLINE).map((ev, idx) => {
          const col = getColorForId(ev.resource.id);
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: col.bg,
                borderLeft: `3px solid ${col.border}`,
                borderRadius: '0 4px 4px 0',
                padding: '2px 5px',
                marginBottom: idx < dayEvents.length - 1 ? 2 : 0,
                overflow: 'hidden',
              }}
            >
              <span style={{ color: col.text, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 36 }}>
                {format(ev.start, 'h:mm a')}
              </span>
              <span
                style={{
                  color: col.text,
                  fontSize: 10,
                  opacity: 0.85,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexShrink: 1,
                }}
              >
                {ev.resource.course.name}
              </span>
            </div>
          );
        })}
        {dayEvents.length > MAX_INLINE && (
          <div
            style={{
              fontSize: 10,
              color: '#6c757d',
              fontWeight: 600,
              padding: '2px 5px',
              background: '#f1f5f9',
              borderRadius: 4,
            }}
          >
            +{dayEvents.length - MAX_INLINE} more
          </div>
        )}
      </div>
    );
  };

  /* ── Week / Day view event renderer ── */
  const TimeEvent = ({ event }: any) => {
    const col = getColorForId(event.resource?.id || event.id);
    const startTime = format(event.start, 'h:mm a');

    const evs: CalendarEvent[] = [event];
    const label = format(event.start, 'MMM d, yyyy');

    return (
      <div
        style={{ height: '100%', padding: '2px 5px', overflow: 'hidden' }}
        onMouseEnter={e => openTooltip(e.currentTarget as HTMLElement, evs, label)}
        onMouseLeave={() => setTooltip(null)}
      >
        <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.9, whiteSpace: 'nowrap' }}>
          {startTime}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {event.resource?.course?.name || event.title}
        </div>
        {event.resource?.student && (
          <div style={{ fontSize: 10, opacity: 0.8, display: 'flex', gap: 6, overflow: 'hidden' }}>
            {role !== 'STUDENT' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <i className="bi bi-mortarboard" style={{ flexShrink: 0 }} />
                {event.resource.student.name}
              </span>
            )}
            {role !== 'TEACHER' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <i className="bi bi-book" style={{ flexShrink: 0 }} />
                {event.resource.teacher.name}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ── Agenda event renderer ── */
  const AgendaEventWrapper = ({ event }: any) => (
    <AgendaEvent event={event} role={role} />
  );

  /* ── CSS overrides — standard app colors ── */
  const calendarStyles = `
    @keyframes tooltipFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .rbc-calendar { font-family: inherit; }

    /* Day-of-week header row — same white style as original */
    .rbc-header {
      background: #fff;
      color: #495057 !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      padding: 9px 8px !important;
      border-color: #dee2e6 !important;
    }
    .rbc-month-view  { border-color: #dee2e6 !important; border-radius: 0 0 8px 8px; overflow: hidden; }
    .rbc-time-view   { border-color: #dee2e6 !important; }
    .rbc-day-bg + .rbc-day-bg  { border-color: #e9ecef !important; }
    .rbc-month-row + .rbc-month-row { border-color: #e9ecef !important; }
    .rbc-off-range-bg { background: #f8f9fa !important; }
    .rbc-today        { background: #eff6ff !important; }
    .rbc-date-cell { font-size: 12px; font-weight: 600; color: #495057; padding: 4px 8px !important; }
    .rbc-date-cell.rbc-now { color: #0d6efd; font-weight: 800; }

    /* Event boxes — transparent wrapper in month; colored in time views */
    .rbc-event {
      padding: 0 !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    .rbc-event:focus { outline: none !important; }
    .rbc-event-content { width: 100% !important; overflow: visible !important; }
    .rbc-row-content { z-index: 1; }

    /* Toolbar — keep Bootstrap defaults, no overrides */
    .rbc-toolbar { padding: 0 0 14px 0 !important; }
    .rbc-toolbar-label { font-weight: 700 !important; font-size: 16px !important; color: #212529 !important; }

    /* Week/Day time view — per-event accent colors applied via inline style */
    .rbc-time-view .rbc-event {
      border-radius: 5px !important;
      border: none !important;
    }
    .rbc-time-view .rbc-event-label { display: none !important; }
    .rbc-time-slot { border-top-color: #f1f3f5 !important; }
    .rbc-timeslot-group { border-bottom-color: #e9ecef !important; }
    .rbc-current-time-indicator { background: #0d6efd !important; }

    /* Agenda */
    .rbc-agenda-view table { font-size: 13px; }
    .rbc-agenda-date-cell  { color: #212529; font-weight: 700; }
    .rbc-agenda-time-cell  { color: #6c757d; white-space: nowrap; }
    .rbc-agenda-event-cell { color: #212529; }

    .rbc-show-more { color: #0d6efd !important; font-weight: 600 !important; font-size: 11px !important; }
    .cal-day-cell:hover { opacity: 0.9; }
  `;

  if (loading && events.length === 0) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted small">{t('auto.loadingSchedule', 'Loading schedule...')}</p>
      </div>
    );
  }

  return (
    <>
      <style>{calendarStyles}</style>
      <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: 12, overflow: 'visible' }}>
        {/* Card header — white, same as original */}
        <Card.Header className="bg-white border-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold text-muted mb-0">
            <i className="bi bi-calendar-week me-2 text-primary" />
            {t('calendar.classSchedule', 'Class Schedule')}
          </h5>
          {loading && <Spinner animation="border" size="sm" variant="primary" />}
        </Card.Header>

        <Card.Body style={{ padding: '16px 20px 20px', position: 'relative' }}>
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          <div
            ref={containerRef}
            style={{ height: 640, position: 'relative' }}
            onMouseLeave={() => setTooltip(null)}
          >
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
                month: { event: MonthEvent },
                week:  { event: TimeEvent },
                day:   { event: TimeEvent },
                agenda: { event: AgendaEventWrapper },
              }}
              popup={false}
              eventPropGetter={event => {
                if (view === Views.MONTH) {
                  return { style: { backgroundColor: 'transparent', border: 'none', padding: 0 } };
                }
                const col = getColorForId((event as any).resource?.id || event.id);
                return {
                  style: {
                    background: col.bg,
                    borderLeft: `4px solid ${col.border}`,
                    borderRadius: 5,
                    border: 'none',
                    boxShadow: `0 1px 4px ${col.border}33`,
                    color: col.text,
                    fontSize: 11,
                    fontWeight: 600,
                  },
                };
              }}
            />

          </div>

          {/* Floating tooltip — rendered OUTSIDE the calendar div so it isn't clipped */}
          {tooltip && (
            <EventTooltip
              events={tooltip.events}
              dateLabel={tooltip.dateLabel}
              role={role}
              anchorRect={tooltip.anchorRect}
            />
          )}
        </Card.Body>
      </Card>
    </>
  );
}
