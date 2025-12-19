import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import ProfileManagement, { ProfileData } from "@/components/ProfileManagement";

const StudentProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);



  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/student/auth');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileData?.role !== 'student') {
      navigate('/');
      return;
    }

    // Also fetch student specific data (year, etc.) from students table
    const { data: studentData } = await supabase
      .from('students')
      .select('*')
      .eq('id', session.user.id)
      .single();

    // Merge profile and student data. 
    // Priorities: studentData usually has the academic info (year, sem, branch)
    // profiles has the auth info and avatar
    setProfile({
      ...profileData,
      ...studentData, // invalidates duplicate keys from profileData with studentData versions
      // ensure we keep the avatar and id from profile if needed (id should be same)
      avatar_url: profileData.avatar_url,
      name: profileData.name || studentData?.full_name // fallback
    });
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleProfileUpdate = () => {
    checkAuth();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/student/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">My Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <ProfileManagement profile={profile} onProfileUpdate={handleProfileUpdate} />
        </div>
      </main>
    </div>
  );
};

export default StudentProfile;
