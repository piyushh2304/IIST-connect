# Implementation Guide: Edit Profile Functionality

Here is the complete code to add the "Edit Profile" functionality to your Student Dashboard.

## Instructions
1.  Open the file `src/components/ProfileManagement.tsx`.
2.  Replace the ENTIRE content of that file with the code below.

## Code: `src/components/ProfileManagement.tsx`

```tsx
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Pencil, Save, X } from "lucide-react";

interface ProfileManagementProps {
  profile: any;
  onProfileUpdate: () => void;
}

const ProfileManagement = ({ profile, onProfileUpdate }: ProfileManagementProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    college_id: "",
    semester: "",
    branch: "",
    section: ""
  });
  const { toast } = useToast();

  // Initialize form data when profile is available
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        email: profile.email || "",
        college_id: profile.college_id || "",
        semester: profile.semester ? profile.semester.toString() : "",
        branch: profile.branch || "",
        section: profile.section || ""
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          email: formData.email,
          college_id: formData.college_id,
          // Convert semester back to number if present
          semester: formData.semester ? parseInt(formData.semester) : null,
          branch: formData.branch,
          section: formData.section
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setIsEditing(false);
      onProfileUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to current profile values
    if (profile) {
      setFormData({
        name: profile.name || "",
        email: profile.email || "",
        college_id: profile.college_id || "",
        semester: profile.semester ? profile.semester.toString() : "",
        branch: profile.branch || "",
        section: profile.section || ""
      });
    }
    setIsEditing(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Avatar updated successfully",
      });

      onProfileUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Manage your profile information and preferences</CardDescription>
        </div>
        <div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleCancel} variant="outline" size="sm" disabled={loading}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} size="sm" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile?.avatar_url} alt={profile?.name} />
            <AvatarFallback>{getInitials(profile?.name || "U")}</AvatarFallback>
          </Avatar>
          <div>
            <Label htmlFor="avatar" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload new avatar
                  </>
                )}
              </div>
            </Label>
            <Input
              id="avatar"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG or GIF (max 2MB)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name"
              name="name"
              value={isEditing ? formData.name : (profile?.name || "")} 
              onChange={handleInputChange}
              disabled={!isEditing} 
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              name="email"
              value={isEditing ? formData.email : (profile?.email || "")} 
              onChange={handleInputChange}
              disabled={!isEditing} 
            />
          </div>
          <div>
            <Label htmlFor="college_id">College ID</Label>
            <Input 
              id="college_id"
              name="college_id"
              value={isEditing ? formData.college_id : (profile?.college_id || "")} 
              onChange={handleInputChange}
              disabled={!isEditing} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="semester">Semester</Label>
              <Input 
                id="semester"
                name="semester"
                type="number"
                value={isEditing ? formData.semester : (profile?.semester || "")} 
                onChange={handleInputChange}
                disabled={!isEditing} 
              />
            </div>
            <div>
              <Label htmlFor="branch">Branch</Label>
              <Input 
                id="branch"
                name="branch"
                value={isEditing ? formData.branch : (profile?.branch || "")} 
                onChange={handleInputChange}
                disabled={!isEditing} 
              />
            </div>
          </div>
          <div>
            <Label htmlFor="section">Section</Label>
            <Input 
              id="section"
              name="section"
              value={isEditing ? formData.section : (profile?.section || "")} 
              onChange={handleInputChange}
              disabled={!isEditing} 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileManagement;
```
