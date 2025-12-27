import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, FileText, Download, BookOpen } from "lucide-react";

export const NotesViewer = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("1");

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error("Error fetching notes:", error);
      toast.error(`Failed to fetch notes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getNotesByYear = (year: number) => {
    return notes.filter(n => n.year === year);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="text-primary h-6 w-6" />
        <h2 className="text-2xl font-bold">Study Resources</h2>
      </div>

      <Tabs defaultValue="1" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="1">1st Year</TabsTrigger>
          <TabsTrigger value="2">2nd Year</TabsTrigger>
          <TabsTrigger value="3">3rd Year</TabsTrigger>
          <TabsTrigger value="4">4th Year</TabsTrigger>
        </TabsList>

        {[1, 2, 3, 4].map((year) => (
          <TabsContent key={year} value={year.toString()} className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">{year === 1 ? 'First' : year === 2 ? 'Second' : year === 3 ? 'Third' : 'Fourth'} Year Notes</h3>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getNotesByYear(year).length > 0 ? (
                getNotesByYear(year).map((note) => (
                  <Card key={note.id} className="hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                         <div className="space-y-1">
                            <CardTitle className="text-base line-clamp-1">{note.title}</CardTitle>
                            <CardDescription className="text-xs">{new Date(note.created_at).toLocaleDateString()}</CardDescription>
                         </div>
                         <span className="uppercase text-[10px] font-bold bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">
                            {note.file_type}
                         </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 h-10">
                        {note.description || "No description provided."}
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full group"
                        onClick={() => window.open(note.file_url, '_blank')}
                      >
                        <Download className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                        Download
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-muted-foreground bg-secondary/20 rounded-lg">
                  <FileText className="mx-auto h-12 w-12 opacity-20 mb-2" />
                  <p>No study materials available for this year yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
