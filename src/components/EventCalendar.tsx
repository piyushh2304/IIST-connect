import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, MapPin, Clock } from "lucide-react";

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
      fontWeight: '700',
      background: 'linear-gradient(135deg, hsl(271 81% 56% / 0.3), hsl(271 81% 66% / 0.3))',
      borderRadius: '0.5rem',
      border: '2px solid hsl(271 81% 56% / 0.5)',
      boxShadow: '0 0 10px hsl(271 81% 56% / 0.3)',
      transform: 'scale(1.05)',
      transition: 'all 0.2s ease'
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100
      }
    },
    exit: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div 
      className="grid gap-6 md:grid-cols-2"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <CardTitle>Event Calendar</CardTitle>
            </div>
            <CardDescription>Select a date to view events • Highlighted dates have events</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-lg border border-primary/10 shadow-lg bg-background/50"
            />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {date ? format(date, 'MMMM d, yyyy') : 'Select a date'}
            </CardTitle>
            <CardDescription>
              {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''} scheduled
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {selectedDateEvents.length === 0 ? (
                <motion.div
                  key="no-events"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No events on this day</p>
                </motion.div>
              ) : (
                selectedDateEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    custom={index}
                    layout
                  >
                    <Card className="overflow-hidden border-l-4 border-l-primary hover:shadow-lg transition-shadow bg-gradient-to-r from-card to-card/80">
                      <CardHeader className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-base leading-tight">{event.title}</CardTitle>
                          <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(new Date(event.date_time), 'h:mm a')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};