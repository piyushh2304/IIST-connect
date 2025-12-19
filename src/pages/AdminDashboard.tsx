import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calendar, Briefcase, Users, Bell, LogOut, Plus, UserCircle, BarChart3, Wrench, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { BulkStudentImport } from "@/components/admin/BulkStudentImport";
import { EventQRCode } from "@/components/admin/EventQRCode";
import { ReportsGeneration } from "@/components/admin/ReportsGeneration";
import { EditClubDialog } from "@/components/admin/EditClubDialog";
import { EventTemplates } from "@/components/admin/EventTemplates";
import { NotesManager } from "@/components/admin/NotesManager";

import { Tables, TablesInsert } from "@/integrations/supabase/types";

// ... imports

type EventWithClub = Tables<'events'> & { clubs: { name: string } | null };
type StudentWithClubs = Tables<'students'>; // clubs are separate in this component logic
type Placement = Tables<'placements'>;
type Club = Tables<'clubs'>;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventWithClub[]>([]);
  const [eventAttendance, setEventAttendance] = useState<Record<string, number>>({});
  const [clubs, setClubs] = useState<Club[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [students, setStudents] = useState<Tables<'students'>[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Tables<'students'>[]>([]);
  const [studentClubs, setStudentClubs] = useState<Record<string, string[]>>({});
  const [filters, setFilters] = useState({
    year: "all",
    semester: "all",
    branch: "all",
    section: "all"
  });
  const [viewParticipantsEventId, setViewParticipantsEventId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      // Safety timeout
      const timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn("Auth check timed out");
          setLoading(false);
        }
      }, 8000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("No session found in getSession");
          if (mounted) navigate("/admin/auth");
          clearTimeout(timeoutId);
          return;
        }

        console.log("Session found:", session.user.id);

        // Verify profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error("Profile fetch error:", profileError);
        }

        if (!profileData || profileData.role !== 'admin') {
          console.warn("Invalid profile or role:", profileData);
          await supabase.auth.signOut();
          if (mounted) navigate("/admin/auth");
          clearTimeout(timeoutId);
          return;
        }

        if (mounted) {
          setProfile(profileData);
          await fetchData(session.user.id);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) navigate("/admin/auth");
      } finally {
        clearTimeout(timeoutId);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event);
      if (event === 'SIGNED_OUT') {
        if (mounted) navigate("/admin/auth");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchData = async (userId?: string) => {
    // If no userId passed, try to get from current session (fallback)
    if (!userId) {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) return;
       userId = session.user.id;
    }

    try {
      const { data: eventsData } = await supabase
        .from('events')
        .select('*, clubs(name)')
        .order('date_time', { ascending: true });
      
      setEvents(eventsData || []);

      const { data: attendanceData } = await supabase
        .from('event_attendance')
        .select('event_id');
      
      const attendanceCount: Record<string, number> = {};
      attendanceData?.forEach((record) => {
        attendanceCount[record.event_id] = (attendanceCount[record.event_id] || 0) + 1;
      });
      setEventAttendance(attendanceCount);

      const { data: clubsData } = await supabase
        .from('clubs')
        .select('*')
        .order('name');
      
      setClubs(clubsData || []);

      const { data: placementsData } = await supabase
        .from('placements')
        .select('*')
        .order('created_at', { ascending: false });
      
      setPlacements(placementsData || []);

      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .order('full_name');
        
      if (studentsData) {
        setStudents(studentsData);
        setFilteredStudents(studentsData);
        
        // Fetch club memberships for all students
        const { data: memberships } = await supabase
          .from('club_memberships')
          .select('user_id, clubs(name)');
          
        const clubMap: Record<string, string[]> = {};
        // helper interface for the join result since we select clubs(name)
        interface MembershipJoin { user_id: string; clubs: { name: string } | null }
        
        const membershipsData = memberships as unknown as MembershipJoin[];

        membershipsData?.forEach((m) => {
          // Map by user's email/id - since student table has email, we can match
          // But here m.user_id is the auth id. 
          // We need to map auth id to student email or link them.
          // The student table has 'id' which IS the auth id (REFERENCES auth.users).
          
          // Let's find the student email for this user_id
          const student = studentsData.find(s => s.id === m.user_id);
          if (student && m.clubs && m.clubs.name) {
             if (!clubMap[student.email]) clubMap[student.email] = [];
             clubMap[student.email].push(m.clubs.name);
          }
        });
        setStudentClubs(clubMap);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      setLoading(false);
    }
  };


  useEffect(() => {
    applyFilters();
  }, [filters, students]);

  const applyFilters = () => {
    let filtered = students;

    if (filters.year !== "all") {
      filtered = filtered.filter(s => s.year === parseInt(filters.year));
    }
    if (filters.semester !== "all") {
      filtered = filtered.filter(s => s.semester === parseInt(filters.semester));
    }
    if (filters.branch !== "all") {
      filtered = filtered.filter(s => s.branch === filters.branch);
    }
    if (filters.section !== "all") {
      filtered = filtered.filter(s => s.section === filters.section);
    }

    setFilteredStudents(filtered);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreateEvent = async (formData: any) => {
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          title: formData.title,
          description: formData.description,
          club_id: formData.club_id,
          date_time: formData.date_time,
          location: formData.location,
          google_form_url: formData.google_form_url,
          status: 'active'
        });

      if (error) throw error;
      
      toast.success("Event created successfully!");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleCreatePlacement = async (formData: TablesInsert<'placements'>) => {
    try {
      const { error } = await supabase
        .from('placements')
        .insert({
          title: formData.title,
          description: formData.description,
          company_name: formData.company_name,
          google_form_url: formData.google_form_url,
          eligibility_semesters: [7, 8],
          status: 'active'
        });

      if (error) throw error;
      
      toast.success("Placement created successfully!");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleCreateAnnouncement = async (formData: TablesInsert<'announcements'>) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          title: formData.title,
          content: formData.content,
          target_role: formData.target_role,
          created_by: profile.id
        });

      if (error) throw error;
      
      toast.success("Announcement published successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            IIST Admin Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{profile?.name}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full max-w-5xl mx-auto grid-cols-7 gap-1">
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="events">
              <Calendar className="h-4 w-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger value="clubs">
              <Users className="h-4 w-4 mr-2" />
              Clubs
            </TabsTrigger>
            <TabsTrigger value="placements">
              <Briefcase className="h-4 w-4 mr-2" />
              Placements
            </TabsTrigger>
            <TabsTrigger value="students">
              <UserCircle className="h-4 w-4 mr-2" />
              Students
            </TabsTrigger>
            <TabsTrigger value="announcements">
              <Bell className="h-4 w-4 mr-2" />
              Announce
            </TabsTrigger>
            <TabsTrigger value="notes">
              <FileText className="h-4 w-4 mr-2" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="tools">
              <Wrench className="h-4 w-4 mr-2" />
              Tools
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Manage Events</h2>
              <CreateEventDialog clubs={clubs} onCreate={handleCreateEvent} />
            </div>
            
            <EventTemplates onApplyTemplate={(template) => {
              // Apply template logic would go in CreateEventDialog
              toast.info("Template applied! Open Create Event to use it.");
            }} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Card key={event.id} className="hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription>
                      {event.clubs?.name} • {new Date(event.date_time).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">{eventAttendance[event.id] || 0} students joined</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setViewParticipantsEventId(event.id)}>
                        View List
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <EventQRCode event={event} />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => sendEventNotification(event)}
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        Notify
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Clubs Tab */}
          <TabsContent value="clubs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Manage Clubs</h2>
              <CreateClubDialog onRefresh={fetchData} />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clubs.map((club) => (
                <Card key={club.id} className="hover:shadow-lg transition-all duration-300">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 p-6">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{club.name}</CardTitle>
                      {club.details?.foundedBy && (
                        <p className="text-xs text-muted-foreground">
                           Founded by {club.details.foundedBy}
                        </p>
                      )}
                    </div>
                    <EditClubDialog club={club} onRefresh={fetchData} />
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">{club.description}</p>
                    
                    {/* Leadership Info */}
                    <div className="pt-2 border-t text-sm space-y-1">
                      {club.details?.facultyInCharge && (
                        <div className="flex gap-2">
                           <span className="font-semibold min-w-24">Faculty:</span>
                           <span className="text-muted-foreground">
                             {Array.isArray(club.details.facultyInCharge) 
                               ? club.details.facultyInCharge.join(", ") 
                               : club.details.facultyInCharge}
                           </span>
                        </div>
                      )}
                      
                      {club.details?.president && (
                        <div className="flex gap-2">
                          <span className="font-semibold min-w-24">President:</span>
                          <span className="text-muted-foreground">{club.details.president}</span>
                        </div>
                      )}

                      {club.details?.vicePresident && (
                        <div className="flex gap-2">
                           <span className="font-semibold min-w-24">VP{Array.isArray(club.details.vicePresident) && club.details.vicePresident.length > 1 ? 's' : ''}:</span>
                           <span className="text-muted-foreground">
                             {Array.isArray(club.details.vicePresident) 
                               ? club.details.vicePresident.join(", ") 
                               : club.details.vicePresident}
                           </span>
                        </div>
                      )}

                      {club.details?.secretary && (
                        <div className="flex gap-2">
                           <span className="font-semibold min-w-24">Secretary{Array.isArray(club.details.secretary) && club.details.secretary.length > 1 ? 's' : ''}:</span>
                           <span className="text-muted-foreground">
                             {Array.isArray(club.details.secretary) 
                               ? club.details.secretary.join(", ") 
                               : club.details.secretary}
                           </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Placements Tab */}
          <TabsContent value="placements" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Manage Placements</h2>
              <CreatePlacementDialog onCreate={handleCreatePlacement} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {placements.map((placement) => (
                <Card key={placement.id} className="hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <CardTitle>{placement.title}</CardTitle>
                    <CardDescription>{placement.company_name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{placement.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">View Students</h2>
              <span className="text-sm text-muted-foreground">Total: {filteredStudents.length} students</span>
            </div>
            
            {/* Filters */}
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select 
                    value={filters.year} 
                    onValueChange={(value) => setFilters({ ...filters, year: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select 
                    value={filters.semester} 
                    onValueChange={(value) => setFilters({ ...filters, semester: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Semesters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Semesters</SelectItem>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select 
                    value={filters.branch} 
                    onValueChange={(value) => setFilters({ ...filters, branch: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {Array.from(new Set(students.map(s => s.branch)))
                        .filter(Boolean)
                        .sort()
                        .map((branch) => (
                          <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select 
                    value={filters.section} 
                    onValueChange={(value) => setFilters({ ...filters, section: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {Array.from(new Set(students.map(s => s.section)))
                        .filter(Boolean)
                        .sort()
                        .map((section) => (
                          <SelectItem key={section} value={section}>{section}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Students Table */}
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Clubs</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>DOB</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.full_name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.year}</TableCell>
                          <TableCell>{student.semester}</TableCell>
                          <TableCell>{student.branch}</TableCell>
                          <TableCell>{student.section}</TableCell>
                          <TableCell>
                            {studentClubs[student.email] && studentClubs[student.email].length > 0 
                              ? <div className="flex flex-wrap gap-1">
                                  {studentClubs[student.email].map((club, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                      {club}
                                    </span>
                                  ))}
                                </div>
                              : "-"
                            }
                          </TableCell>
                          <TableCell>{student.phone_number}</TableCell>
                          <TableCell>{new Date(student.date_of_birth).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No students found matching the filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Send Announcements</h2>
              <CreateAnnouncementDialog onCreate={handleCreateAnnouncement} />
            </div>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
             <NotesManager />
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Admin Tools</h2>
            <BulkStudentImport onImportComplete={fetchData} />
            <ReportsGeneration />
          </TabsContent>
        </Tabs>

        {viewParticipantsEventId && (
          <ViewParticipantsDialog 
            eventId={viewParticipantsEventId} 
            onClose={() => setViewParticipantsEventId(null)} 
          />
        )}
      </main>
    </div>
  );
};

const sendEventNotification = async (event: EventWithClub) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-event-notification', {
      body: {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date_time,
        eventLocation: event.location,
        targetRole: 'student'
      }
    });

    if (error) throw error;
    toast.success(`Notifications sent to ${data.notifiedUsers} users`);
  } catch (error) {
    toast.error(`Failed to send notifications: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

// Create Event Dialog Component
function CreateEventDialog({ clubs, onCreate }: { clubs: Club[], onCreate: (data: TablesInsert<'events'>) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    club_id: "",
    date_time: "",
    location: "",
    google_form_url: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    setOpen(false);
    setFormData({
      title: "",
      description: "",
      club_id: "",
      date_time: "",
      location: "",
      google_form_url: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>Add a new event for students</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Club</Label>
            <select
              className="w-full border rounded-md p-2"
              value={formData.club_id}
              onChange={(e) => setFormData({ ...formData, club_id: e.target.value })}
              required
            >
              <option value="">Select Club</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>{club.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Date & Time</Label>
            <Input
              type="datetime-local"
              value={formData.date_time}
              onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Google Form URL (optional)</Label>
            <Input
              type="url"
              value={formData.google_form_url}
              onChange={(e) => setFormData({ ...formData, google_form_url: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full">Create Event</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Create Club Dialog Component
function CreateClubDialog({ onRefresh }: { onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('clubs')
        .insert(formData);

      if (error) throw error;
      
      toast.success("Club created successfully!");
      setOpen(false);
      setFormData({ name: "", description: "" });
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Club
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Club</DialogTitle>
          <DialogDescription>Add a new club or society</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Club Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full">Create Club</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Create Placement Dialog Component
function CreatePlacementDialog({ onCreate }: { onCreate: (data: TablesInsert<'placements'>) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    company_name: "",
    google_form_url: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    setOpen(false);
    setFormData({
      title: "",
      description: "",
      company_name: "",
      google_form_url: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Placement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Placement Drive</DialogTitle>
          <DialogDescription>Create a new placement opportunity</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Application Form URL</Label>
            <Input
              type="url"
              value={formData.google_form_url}
              onChange={(e) => setFormData({ ...formData, google_form_url: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full">Add Placement</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Create Announcement Dialog Component
function CreateAnnouncementDialog({ onCreate }: { onCreate: (data: TablesInsert<'announcements'>) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    target_role: "all"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    setOpen(false);
    setFormData({ title: "", content: "", target_role: "all" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Announcement</DialogTitle>
          <DialogDescription>Send a message to students</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <select
              className="w-full border rounded-md p-2"
              value={formData.target_role}
              onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
            >
              <option value="all">Everyone</option>
              <option value="students">Students Only</option>
              <option value="admins">Admins Only</option>
            </select>
          </div>
          <Button type="submit" className="w-full">Send Announcement</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// View Participants Dialog
function ViewParticipantsDialog({ eventId, onClose }: { eventId: string | null, onClose: () => void }) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchParticipants();
    }
  }, [eventId]);

  const fetchParticipants = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_attendance')
        .select('*, students:user_id(full_name, email, branch, year)')
        .eq('event_id', eventId);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      toast.error("Failed to fetch participants");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!eventId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Event Participants</DialogTitle>
          <DialogDescription>List of students registered for this event</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto mt-4">
          {loading ? (
             <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>
          ) : participants.length === 0 ? (
             <p className="text-center text-muted-foreground p-8">No participants yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Joined At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.students?.full_name || 'Unknown'}</TableCell>
                    <TableCell>{p.students?.email}</TableCell>
                    <TableCell>{p.students?.branch}</TableCell>
                    <TableCell>{p.students?.year}</TableCell>
                    <TableCell>{new Date(p.joined_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdminDashboard;
