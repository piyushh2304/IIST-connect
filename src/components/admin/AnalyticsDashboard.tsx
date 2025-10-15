import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const COLORS = ['hsl(271 81% 56%)', 'hsl(269 71% 66%)', 'hsl(267 61% 76%)', 'hsl(265 51% 86%)'];

export const AnalyticsDashboard = () => {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [eventRatingsData, setEventRatingsData] = useState<any[]>([]);
  const [clubMembershipData, setClubMembershipData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalAttendance: 0,
    avgRating: 0,
    totalClubs: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    // Fetch event attendance trends
    const { data: events } = await supabase
      .from('events')
      .select('id, title, date_time')
      .order('date_time', { ascending: false })
      .limit(10);

    if (events) {
      const attendancePromises = events.map(async (event) => {
        const { count } = await supabase
          .from('event_attendance')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);
        
        return {
          name: event.title.substring(0, 15),
          attendance: count || 0
        };
      });

      const attendance = await Promise.all(attendancePromises);
      setAttendanceData(attendance.reverse());
      setStats(prev => ({ ...prev, totalEvents: events.length }));
    }

    // Fetch event ratings
    const { data: ratings } = await supabase
      .from('event_ratings')
      .select('event_id, rating, events(title)');

    if (ratings) {
      const ratingsByEvent = ratings.reduce((acc: any, curr) => {
        const eventTitle = (curr.events as any)?.title || 'Unknown';
        if (!acc[eventTitle]) {
          acc[eventTitle] = { total: 0, count: 0 };
        }
        acc[eventTitle].total += curr.rating;
        acc[eventTitle].count += 1;
        return acc;
      }, {});

      const ratingsData = Object.entries(ratingsByEvent).map(([name, data]: [string, any]) => ({
        name: name.substring(0, 15),
        rating: (data.total / data.count).toFixed(1)
      }));

      setEventRatingsData(ratingsData);
      
      const totalRatings = ratings.reduce((sum, r) => sum + r.rating, 0);
      setStats(prev => ({ ...prev, avgRating: totalRatings / ratings.length || 0 }));
    }

    // Fetch club memberships
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id, name');

    if (clubs) {
      const membershipPromises = clubs.map(async (club) => {
        const { count } = await supabase
          .from('club_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', club.id);
        
        return {
          name: club.name,
          value: count || 0
        };
      });

      const memberships = await Promise.all(membershipPromises);
      setClubMembershipData(memberships.filter(m => m.value > 0));
      setStats(prev => ({ ...prev, totalClubs: clubs.length }));
    }

    // Total attendance
    const { count: totalAttendance } = await supabase
      .from('event_attendance')
      .select('*', { count: 'exact', head: true });
    
    setStats(prev => ({ ...prev, totalAttendance: totalAttendance || 0 }));
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttendance}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)} ⭐</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Clubs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClubs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Event Attendance</CardTitle>
            <CardDescription>Recent events attendance trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="attendance" fill="hsl(271 81% 56%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Ratings</CardTitle>
            <CardDescription>Average ratings by event</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={eventRatingsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Line type="monotone" dataKey="rating" stroke="hsl(271 81% 56%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Club Memberships</CardTitle>
            <CardDescription>Distribution of club members</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={clubMembershipData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {clubMembershipData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};