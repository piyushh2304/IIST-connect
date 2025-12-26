import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Pencil, Save, X } from "lucide-react";

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  college_id: string | null;
  year: number | null;
  semester: number | null;
  branch: string | null;
  section: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  avatar_url?: string | null;
}

interface ProfileManagementProps {
  profile: ProfileData;
  onProfileUpdate: () => void;
}

const ProfileManagement = ({ profile, onProfileUpdate }: ProfileManagementProps) => {
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    college_id: "",
    year: "",
    semester: "",
    branch: "",
    section: "",
    phone_number: "",
    date_of_birth: ""
  });
  const { toast } = useToast();

  // Initialize form data when profile is available
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        email: profile.email || "",
        college_id: profile.college_id || "",
        year: profile.year ? profile.year.toString() : "",
        semester: profile.semester ? profile.semester.toString() : "",
        branch: profile.branch || "",
        section: profile.section || "",
        phone_number: profile.phone_number || "",
        date_of_birth: profile.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : ""
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
      
      // Update profiles table (Auth/User info)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          email: formData.email,
          college_id: formData.college_id,
          semester: formData.semester ? parseInt(formData.semester) : null,
          branch: formData.branch,
          section: formData.section
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Update students table
      // key to avoiding RLS issues: ensure we are targeting the AUTHENTICATED user's row
      const { error: studentError } = await supabase
        .from('students')
        .upsert({
          id: profile.id, 
          email: formData.email,
          full_name: formData.name,
          year: formData.year ? parseInt(formData.year) : null,
          semester: formData.semester ? parseInt(formData.semester) : null,
          branch: formData.branch,
          section: formData.section,
          phone_number: formData.phone_number,
          date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth).toISOString() : null
        })
        .select();

      if (studentError) throw studentError;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
      onProfileUpdate();
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
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
        year: profile.year ? profile.year.toString() : "",
        semester: profile.semester ? profile.semester.toString() : "",
        branch: profile.branch || "",
        section: profile.section || "",
        phone_number: profile.phone_number || "",
        date_of_birth: profile.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : ""
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
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred during upload",
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input 
                id="phone_number"
                name="phone_number"
                value={isEditing ? formData.phone_number : (profile?.phone_number || "")} 
                onChange={handleInputChange}
                disabled={!isEditing} 
                placeholder="+91..."
              />
            </div>
            <div>
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input 
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                value={isEditing ? formData.date_of_birth : (profile?.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : "")} 
                onChange={handleInputChange}
                disabled={!isEditing} 
              />
            </div>
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="year">Year</Label>
              <Input 
                id="year"
                name="year"
                type="number"
                value={isEditing ? formData.year : (profile?.year || "")} 
                onChange={handleInputChange}
                disabled={!isEditing} 
              />
            </div>
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