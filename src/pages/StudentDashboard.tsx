import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calendar, Briefcase, Users, Bell, LogOut, User, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [placements, setPlacements] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/student/auth");
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profileData || profileData.role !== 'student') {
      await supabase.auth.signOut();
      navigate("/student/auth");
      return;
    }

    setProfile(profileData);
    setLoading(false);
  };

  const fetchData = async () => {
    // Fetch events
    const { data: eventsData } = await supabase
      .from('events')
      .select('*, clubs(name)')
      .eq('status', 'active')
      .order('date_time', { ascending: true });
    
    setEvents(eventsData || []);

    // Fetch clubs
    const { data: clubsData } = await supabase
      .from('clubs')
      .select('*')
      .order('name', { ascending: true });
    
    setClubs(clubsData || []);

    // Fetch announcements
    const { data: announcementsData } = await supabase
      .from('announcements')
      .select('*')
      .in('target_role', ['all', 'students'])
      .order('created_at', { ascending: false })
      .limit(5);
    
    setAnnouncements(announcementsData || []);

    // Fetch placements (if semester 7 or 8)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('semester')
        .eq('id', session.user.id)
        .single();

      if (profileData && [7, 8].includes(profileData.semester)) {
        const { data: placementsData } = await supabase
          .from('placements')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        
        setPlacements(placementsData || []);
      }
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('event_attendance')
        .insert({
          event_id: eventId,
          user_id: profile.id
        });

      if (error) {
        if (error.code === '23505') {
          toast.error("You've already joined this event");
        } else {
          throw error;
        }
      } else {
        toast.success("Successfully joined event!");
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-accent/20">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  {mobileMenuOpen ? <X /> : <Menu />}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex flex-col gap-4 mt-8">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Avatar>
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(profile?.name || "Student")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{profile?.name}</p>
                      <p className="text-xs text-muted-foreground">Sem {profile?.semester} • {profile?.branch}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      navigate("/student/profile");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile & Settings
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-destructive hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              IIST Student Portal
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(profile?.name || "Student")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{profile?.name}</p>
                <p className="text-xs text-muted-foreground">
                  Sem {profile?.semester} • {profile?.branch}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate("/student/profile")}>
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 h-auto p-1">
            <TabsTrigger value="events" className="flex flex-col items-center gap-1 py-2">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Events</span>
            </TabsTrigger>
            <TabsTrigger value="clubs" className="flex flex-col items-center gap-1 py-2">
              <Users className="h-4 w-4" />
              <span className="text-xs">Clubs</span>
            </TabsTrigger>
            {profile?.semester >= 7 && (
              <TabsTrigger value="placements" className="flex flex-col items-center gap-1 py-2">
                <Briefcase className="h-4 w-4" />
                <span className="text-xs">Placements</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="announcements" className="flex flex-col items-center gap-1 py-2">
              <Bell className="h-4 w-4" />
              <span className="text-xs">Announcements</span>
            </TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <h2 className="text-2xl font-bold">Upcoming Events</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Card key={event.id} className="hover:shadow-lg transition-all duration-300 animate-fade-in">
                  <CardHeader>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription>
                      {event.clubs?.name} • {new Date(event.date_time).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{event.description}</p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleJoinEvent(event.id)}
                        className="flex-1"
                      >
                        Join Event
                      </Button>
                      {event.google_form_url && (
                        <Button 
                          variant="outline"
                          onClick={() => window.open(event.google_form_url, '_blank')}
                        >
                          Form
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Clubs Tab */}
          <TabsContent value="clubs" className="space-y-4">
            <h2 className="text-2xl font-bold">Our Clubs</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clubs.map((club) => (
                <Card key={club.id} className="hover:shadow-lg transition-all duration-300 animate-fade-in">
                  <CardHeader>
                    <CardTitle>{club.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{club.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Placements Tab */}
          {profile?.semester >= 7 && (
            <TabsContent value="placements" className="space-y-4">
              <h2 className="text-2xl font-bold">Placement Opportunities</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {placements.map((placement) => (
                  <Card key={placement.id} className="hover:shadow-lg transition-all duration-300 animate-fade-in">
                    <CardHeader>
                      <CardTitle>{placement.title}</CardTitle>
                      <CardDescription>{placement.company_name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{placement.description}</p>
                      <Button 
                        onClick={() => window.open(placement.google_form_url, '_blank')}
                        className="w-full"
                      >
                        Apply Now
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-4">
            <h2 className="text-2xl font-bold">Recent Announcements</h2>
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <Card key={announcement.id} className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>{announcement.title}</CardTitle>
                    <CardDescription>
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{announcement.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;
