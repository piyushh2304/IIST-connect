import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash, Edit, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";

import { Tables } from "@/integrations/supabase/types";

interface Activity {
  title: string;
  date: string;
  description: string;
  images: string[];
}

interface CustomField {
  label: string;
  value: string;
  image: string;
}

interface ClubDetails {
  foundedBy?: string;
  president?: string;
  vicePresident?: string | string[];
  secretary?: string | string[];
  facultyInCharge?: string | string[];
  activities?: Activity[];
  customFields?: CustomField[];
}

interface EditClubDialogProps {
  club: Tables<'clubs'>;
  onRefresh: () => void;
}

export const EditClubDialog = ({ club, onRefresh }: EditClubDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    details: {
      foundedBy: "",
      president: "",
      vicePresident: [] as string[],
      secretary: [] as string[],
      facultyInCharge: [] as string[],
      activities: [] as Activity[],
      customFields: [] as CustomField[]
    }
  });

  useEffect(() => {
    if (club) {
      const details = (club.details as unknown as ClubDetails) || {};
      setFormData({
        name: club.name,
        description: club.description || "",
        details: {
          foundedBy: details.foundedBy || "",
          president: details.president || "",
          vicePresident: normalizeToArray(details.vicePresident),
          secretary: normalizeToArray(details.secretary),
          facultyInCharge: normalizeToArray(details.facultyInCharge),
          // Migration for activity images: ensure images array exists, populate from legacy image if needed
          activities: (details.activities || []).map((a: any) => ({
             ...a,
             images: a.images || (a.image ? [a.image] : [])
          })),
          customFields: details.customFields || []
        }
      });
    }
  }, [club]);

  const handleDetailsChange = (field: 'foundedBy' | 'president', value: string) => {
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        [field]: value
      }
    }));
  };

  // Helper to ensure data is array
  const normalizeToArray = (data: unknown) => {
    if (Array.isArray(data)) return data as string[];
    if (typeof data === 'string' && data.trim() !== '') return [data];
    return ['']; // Default to one empty input
  };

  const handleArrayChange = (field: string, index: number, value: string) => {
    const details = formData.details as Record<string, unknown>;
    const currentArray = details[field];
    if (Array.isArray(currentArray)) {
      const newArray = [...(currentArray as string[])];
      newArray[index] = value;
      setFormData(prev => ({
        ...prev,
        details: { ...prev.details, [field]: newArray }
      }));
    }
  };

  const addArrayItem = (field: string) => {
    const details = formData.details as Record<string, unknown>;
    const currentArray = details[field];
    if (Array.isArray(currentArray)) {
      setFormData(prev => ({
        ...prev,
        details: { 
          ...prev.details, 
          [field]: [...(currentArray as string[]), ""] 
        }
      }));
    }
  };

  const removeArrayItem = (field: string, index: number) => {
    const details = formData.details as Record<string, unknown>;
    const currentArray = details[field];
    if (Array.isArray(currentArray)) {
      setFormData(prev => ({
        ...prev,
        details: { 
          ...prev.details, 
          [field]: (currentArray as string[]).filter((_, i) => i !== index)
        }
      }));
    }
  };

  const handleActivityChange = (index: number, field: keyof Activity, value: any) => {
    const newActivities = [...formData.details.activities];
    newActivities[index] = { ...newActivities[index], [field]: value };
    setFormData(prev => ({
      ...prev,
      details: { ...prev.details, activities: newActivities }
    }));
  };

  const addActivity = () => {
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        activities: [...prev.details.activities, { title: "", date: "", description: "", images: [] }]
      }
    }));
  };

  const removeActivity = (index: number) => {
    const newActivities = formData.details.activities.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      details: { ...prev.details, activities: newActivities }
    }));
  };

  const handleCustomFieldChange = (index: number, field: keyof CustomField, value: string) => {
    const newFields = [...formData.details.customFields];
    newFields[index] = { ...newFields[index], [field]: value };
    setFormData(prev => ({
      ...prev,
      details: { ...prev.details, customFields: newFields }
    }));
  };

  const addCustomField = () => {
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        customFields: [...prev.details.customFields, { label: "", value: "", image: "" }]
      }
    }));
  };

  const removeCustomField = (index: number) => {
    const newFields = formData.details.customFields.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      details: { ...prev.details, customFields: newFields }
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('clubs')
        .update({
          name: formData.name,
          description: formData.description,
          details: formData.details
        })
        .eq('id', club.id);

      if (error) throw error;

      toast.success("Club updated successfully!");
      setOpen(false);
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Club Details</DialogTitle>
          <DialogDescription>Update club information, leadership, and activities.</DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="leadership">Leadership</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 p-4 border rounded-md mt-4">
            <TabsContent value="general" className="space-y-4">
              <div className="space-y-2">
                <Label>Club Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Founded By</Label>
                <Input 
                  value={formData.details.foundedBy} 
                  onChange={(e) => handleDetailsChange('foundedBy', e.target.value)} 
                />
              </div>
            </TabsContent>

            <TabsContent value="leadership" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* President (Single) */}
                <div className="space-y-2">
                  <Label>President</Label>
                  <Input 
                    value={formData.details.president} 
                    onChange={(e) => handleDetailsChange('president', e.target.value)} 
                  />
                </div>

                {/* Vice President (Multiple) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Vice President(s)</Label>
                    <Button size="sm" variant="ghost" onClick={() => addArrayItem('vicePresident')} type="button">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {Array.isArray(formData.details.vicePresident) && formData.details.vicePresident.map((vp, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={vp}
                        onChange={(e) => handleArrayChange('vicePresident', idx, e.target.value)}
                        placeholder="Vice President Name"
                      />
                      {formData.details.vicePresident.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          type="button"
                          onClick={() => removeArrayItem('vicePresident', idx)}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {(!Array.isArray(formData.details.vicePresident) || formData.details.vicePresident.length === 0) && (
                     <Button variant="outline" size="sm" onClick={() => addArrayItem('vicePresident')} type="button">Add VP</Button>
                  )}
                </div>

                {/* Secretary (Multiple) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Secretary(s)</Label>
                    <Button size="sm" variant="ghost" onClick={() => addArrayItem('secretary')} type="button">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                   {Array.isArray(formData.details.secretary) && formData.details.secretary.map((sec, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={sec}
                        onChange={(e) => handleArrayChange('secretary', idx, e.target.value)}
                        placeholder="Secretary Name"
                      />
                      {formData.details.secretary.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          type="button"
                          onClick={() => removeArrayItem('secretary', idx)}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {(!Array.isArray(formData.details.secretary) || formData.details.secretary.length === 0) && (
                     <Button variant="outline" size="sm" onClick={() => addArrayItem('secretary')} type="button">Add Secretary</Button>
                  )}
                </div>

                {/* Faculty In-Charge (Multiple) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Faculty In-Charge(s)</Label>
                    <Button size="sm" variant="ghost" onClick={() => addArrayItem('facultyInCharge')} type="button">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {Array.isArray(formData.details.facultyInCharge) && formData.details.facultyInCharge.map((faculty, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={faculty}
                        onChange={(e) => handleArrayChange('facultyInCharge', idx, e.target.value)}
                        placeholder="Faculty Name"
                      />
                      {formData.details.facultyInCharge.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          type="button"
                          onClick={() => removeArrayItem('facultyInCharge', idx)}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                   {(!Array.isArray(formData.details.facultyInCharge) || formData.details.facultyInCharge.length === 0) && (
                     <Button variant="outline" size="sm" onClick={() => addArrayItem('facultyInCharge')} type="button">Add Faculty</Button>
                  )}
                </div>

              </div>
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <Label>Recent Activities</Label>
                <Button size="sm" onClick={addActivity} type="button">
                  <Plus className="h-4 w-4 mr-2" /> Add Activity
                </Button>
              </div>
              
              <div className="space-y-6">
                {formData.details.activities.map((activity, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-accent/5 space-y-4 relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
                      onClick={() => removeActivity(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Event Title</Label>
                        <Input 
                          value={activity.title} 
                          onChange={(e) => handleActivityChange(index, 'title', e.target.value)} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input 
                          type="date"
                          value={activity.date} 
                          onChange={(e) => handleActivityChange(index, 'date', e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea 
                        value={activity.description} 
                        onChange={(e) => handleActivityChange(index, 'description', e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Images (Max 5)</Label>
                      <MultiImageUpload 
                        value={activity.images || []} 
                        onChange={(urls) => handleActivityChange(index, 'images', urls)}
                        maxFiles={5}
                      />
                    </div>
                  </div>
                ))}
                {formData.details.activities.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No activities added yet.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <Label>Custom Fields</Label>
                <Button size="sm" onClick={addCustomField} type="button">
                  <Plus className="h-4 w-4 mr-2" /> Add Field
                </Button>
              </div>

              <div className="space-y-4">
                {formData.details.customFields.map((field, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-accent/5 flex gap-4 items-start">
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Label</Label>
                          <Input 
                            value={field.label} 
                            placeholder="e.g. Instagram"
                            onChange={(e) => handleCustomFieldChange(index, 'label', e.target.value)} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Value</Label>
                          <Input 
                            value={field.value} 
                            placeholder="e.g. @club_name"
                            onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)} 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Image (Optional)</Label>
                        <ImageUpload 
                          value={field.image || ""} 
                          onChange={(url) => handleCustomFieldChange(index, 'image', url)}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10 mt-8"
                      onClick={() => removeCustomField(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {formData.details.customFields.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Add custom fields like social media links, awards, etc.
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="pt-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
