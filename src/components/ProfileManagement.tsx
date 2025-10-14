import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";

interface ProfileManagementProps {
  profile: any;
  onProfileUpdate: () => void;
}

const ProfileManagement = ({ profile, onProfileUpdate }: ProfileManagementProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

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
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Manage your profile information and preferences</CardDescription>
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
            <Label>Name</Label>
            <Input value={profile?.name || ""} disabled />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={profile?.email || ""} disabled />
          </div>
          <div>
            <Label>College ID</Label>
            <Input value={profile?.college_id || ""} disabled />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Semester</Label>
              <Input value={profile?.semester || ""} disabled />
            </div>
            <div>
              <Label>Branch</Label>
              <Input value={profile?.branch || ""} disabled />
            </div>
          </div>
          <div>
            <Label>Section</Label>
            <Input value={profile?.section || ""} disabled />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileManagement;
