import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Trash2, FileCheck } from "lucide-react";

interface Template {
  id: string;
  name: string;
  title: string;
  description: string;
  location: string;
}

export const EventTemplates = ({ onApplyTemplate }: { onApplyTemplate: (template: Template) => void }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    description: "",
    location: ""
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('event_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setTemplates(data);
  };

  const saveTemplate = async () => {
    try {
      const { error } = await supabase
        .from('event_templates')
        .insert(formData);

      if (error) throw error;

      toast.success("Template saved successfully");
      setOpen(false);
      setFormData({ name: "", title: "", description: "", location: "" });
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('event_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Template deleted");
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Event Templates</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              Save Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Event Template</DialogTitle>
              <DialogDescription>Save a reusable event template</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Workshop Template"
                />
              </div>
              <div>
                <Label>Default Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Technical Workshop"
                />
              </div>
              <div>
                <Label>Default Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description..."
                />
              </div>
              <div>
                <Label>Default Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Seminar Hall"
                />
              </div>
              <Button onClick={saveTemplate} className="w-full">Save Template</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription>{template.title}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onApplyTemplate(template)}
                className="gap-2 flex-1"
              >
                <FileCheck className="h-4 w-4" />
                Use Template
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteTemplate(template.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};