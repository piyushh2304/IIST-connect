import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  date_time: string;
  location: string;
  description: string;
}

export const EventCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [eventDates, setEventDates] = useState<Date[]>([]);
  const [selectedDateEvents, setSelectedDateEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (date) {
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.date_time);
        return (
          eventDate.getDate() === date.getDate() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getFullYear() === date.getFullYear()
        );
      });
      setSelectedDateEvents(dayEvents);
    }
  }, [date, events]);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .order('date_time', { ascending: true });

    if (data) {
      setEvents(data);
      const dates = data.map(event => new Date(event.date_time));
      setEventDates(dates);
    }
  };

  const modifiers = {
    hasEvent: eventDates
  };

  const modifiersStyles = {
    hasEvent: {
      fontWeight: 'bold',
      backgroundColor: 'hsl(271 81% 56% / 0.2)',
      borderRadius: '0.375rem'
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Event Calendar</CardTitle>
          <CardDescription>Select a date to view events</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {date ? format(date, 'MMMM d, yyyy') : 'Select a date'}
          </CardTitle>
          <CardDescription>
            {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''} scheduled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedDateEvents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No events on this day</p>
          ) : (
            selectedDateEvents.map((event) => (
              <Card key={event.id}>
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{event.title}</CardTitle>
                    <Badge>{format(new Date(event.date_time), 'h:mm a')}</Badge>
                  </div>
                  <CardDescription>{event.location}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};