import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calendar, Briefcase, Users, Bell, LogOut, Plus, UserCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [placements, setPlacements] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [eventAttendance, setEventAttendance] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState({
    year: "all",
    semester: "all",
    branch: "all",
    section: "all"
  });

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/admin/auth");
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profileData || profileData.role !== 'admin') {
      await supabase.auth.signOut();
      navigate("/admin/auth");
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
      .order('date_time', { ascending: false });
    
    setEvents(eventsData || []);

    // Fetch event attendance counts
    if (eventsData) {
      const attendanceCounts: Record<string, number> = {};
      for (const event of eventsData) {
        const { count } = await supabase
          .from('event_attendance')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);
        attendanceCounts[event.id] = count || 0;
      }
      setEventAttendance(attendanceCounts);
    }

    // Fetch clubs
    const { data: clubsData } = await supabase
      .from('clubs')
      .select('*')
      .order('name', { ascending: true });
    
    setClubs(clubsData || []);

    // Fetch placements
    const { data: placementsData } = await supabase
      .from('placements')
      .select('*')
      .order('created_at', { ascending: false });
    
    setPlacements(placementsData || []);

    // Fetch students
    const { data: studentsData } = await supabase
      .from('students')
      .select('*')
      .order('year', { ascending: true })
      .order('semester', { ascending: true })
      .order('branch', { ascending: true })
      .order('section', { ascending: true });
    
    setStudents(studentsData || []);
    setFilteredStudents(studentsData || []);
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
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCreatePlacement = async (formData: any) => {
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
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCreateAnnouncement = async (formData: any) => {
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
    } catch (error: any) {
      toast.error(error.message);
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
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-5">
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
              Announcements
            </TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Manage Events</h2>
              <CreateEventDialog clubs={clubs} onCreate={handleCreateEvent} />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Card key={event.id} className="hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription>
                      {event.clubs?.name} • {new Date(event.date_time).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-medium">{eventAttendance[event.id] || 0} students joined</span>
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
                  <Select value={filters.year} onValueChange={(value) => setFilters({ ...filters, year: value })}>
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
                  <Select value={filters.semester} onValueChange={(value) => setFilters({ ...filters, semester: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Semesters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Semesters</SelectItem>
                      <SelectItem value="2">2nd Semester</SelectItem>
                      <SelectItem value="4">4th Semester</SelectItem>
                      <SelectItem value="6">6th Semester</SelectItem>
                      <SelectItem value="8">8th Semester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select value={filters.branch} onValueChange={(value) => setFilters({ ...filters, branch: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      <SelectItem value="CSE">CSE</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="IOT">IOT</SelectItem>
                      <SelectItem value="CHEMICAL">CHEMICAL</SelectItem>
                      <SelectItem value="CIVIL">CIVIL</SelectItem>
                      <SelectItem value="MECHANICAL">MECHANICAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={filters.section} onValueChange={(value) => setFilters({ ...filters, section: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      <SelectItem value="A1">A1</SelectItem>
                      <SelectItem value="A2">A2</SelectItem>
                      <SelectItem value="A3">A3</SelectItem>
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
        </Tabs>
      </main>
    </div>
  );
};

// Create Event Dialog Component
const CreateEventDialog = ({ clubs, onCreate }: any) => {
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
              {clubs.map((club: any) => (
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
const CreateClubDialog = ({ onRefresh }: any) => {
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
    } catch (error: any) {
      toast.error(error.message);
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
const CreatePlacementDialog = ({ onCreate }: any) => {
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
const CreateAnnouncementDialog = ({ onCreate }: any) => {
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

export default AdminDashboard;
