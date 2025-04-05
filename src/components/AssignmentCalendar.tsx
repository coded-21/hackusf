'use client';

import { useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

interface Assignment {
  id: number;
  name: string;
  due_at: string | null;
  course_id: number;
  html_url: string;
  courseName?: string;
}

interface AssignmentCalendarProps {
  assignments: Assignment[];
}

export default function AssignmentCalendar({ assignments }: AssignmentCalendarProps) {
  const calendarRef = useRef<any>(null);
  const [activeView, setActiveView] = useState('dayGridMonth');

  // Transform assignments into calendar events
  const events = assignments
    .filter(assignment => assignment.due_at !== null)
    .map(assignment => {
      const dueDate = new Date(assignment.due_at!);
      const courseId = assignment.course_id?.toString().padStart(6, '0') || '';
      
      // Set the time to 23:59 while preserving the date
      const adjustedDate = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate(),
        23,
        59,
        0
      );
      
      return {
        id: assignment.id.toString(),
        title: assignment.name,
        start: adjustedDate,
        end: adjustedDate,
        allDay: false,
        url: assignment.html_url,
        extendedProps: {
          courseName: assignment.courseName,
          courseId: courseId,
          time: '11:59 PM'
        },
        classNames: ['assignment-event'],
      };
    });

  const handleEventClick = (info: any) => {
    info.jsEvent.preventDefault();
    window.open(info.event.url, '_blank');
  };

  const handleViewChange = (viewType: string) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(viewType);
      setActiveView(viewType);
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const time = eventInfo.event.extendedProps.time;
    const courseName = eventInfo.event.extendedProps.courseName;
    const courseId = eventInfo.event.extendedProps.courseId;
    const isMonthView = eventInfo.view.type === 'dayGridMonth';
    const isListView = eventInfo.view.type === 'listWeek';
    
    return (
      <div className="event-content">
        <div className="event-marker"></div>
        <div className="event-details">
          <div className="event-title">{eventInfo.event.title}</div>
          {!isMonthView && !isListView && courseName && (
            <div className="event-course">
              {courseId} {courseName}
            </div>
          )}
          <div className="event-time">{time}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-wrapper">
      <div className="calendar-header">
        <h2>Assignment Calendar</h2>
        <div className="view-toggles">
          <button
            onClick={() => handleViewChange('dayGridMonth')}
            className={`toggle-btn ${activeView === 'dayGridMonth' ? 'active' : ''}`}
          >
            Month
          </button>
          <button
            onClick={() => handleViewChange('dayGridWeek')}
            className={`toggle-btn ${activeView === 'dayGridWeek' ? 'active' : ''}`}
          >
            Week
          </button>
          <button
            onClick={() => handleViewChange('dayGridDay')}
            className={`toggle-btn ${activeView === 'dayGridDay' ? 'active' : ''}`}
          >
            Day
          </button>
          <button
            onClick={() => handleViewChange('listWeek')}
            className={`toggle-btn ${activeView === 'listWeek' ? 'active' : ''}`}
          >
            List
          </button>
        </div>
      </div>
      <div className="calendar-container">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: '',
          }}
          events={events}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          height="auto"
          dayMaxEvents={3}
          moreLinkContent={(args) => `+${args.num} more`}
          views={{
            dayGridMonth: {
              titleFormat: { year: 'numeric', month: 'long' },
              dayHeaderFormat: { weekday: 'short' },
              eventTimeFormat: {
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'
              }
            },
            dayGridWeek: {
              titleFormat: { year: 'numeric', month: 'long' },
              dayHeaderFormat: { weekday: 'short', month: 'numeric', day: 'numeric' },
              eventTimeFormat: {
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'
              }
            },
            dayGridDay: {
              titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
              dayHeaderFormat: { weekday: 'long' },
              eventTimeFormat: {
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'
              }
            },
            listWeek: {
              titleFormat: { year: 'numeric', month: 'long' },
              dayHeaderFormat: { weekday: 'long', month: 'long', day: 'numeric' },
              noEventsContent: 'No assignments due',
              eventFormat: {
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'
              }
            },
          }}
        />
      </div>
    </div>
  );
} 