
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Users, Calendar, Heart, HeartOff } from "lucide-react";

const ClubDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [joinedClubIds, setJoinedClubIds] = useState<Set<string>>(new Set());
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (mounted) navigate("/student/auth");
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!profileData) {
          if (mounted) navigate("/student/auth");
          return;
        }

        if (mounted) {
          setProfile(profileData);
          if (id) {
            fetchClubData(session.user.id, id);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Auth init error:", error);
        if (mounted) navigate("/student/auth");
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
       if (event === 'SIGNED_OUT' || !session) {
         if (mounted) navigate("/student/auth");
       }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [id]);

  const fetchClubData = async (userId: string, clubId: string) => {
    try {
      // Fetch club details
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .single();
      
      if (clubError) throw clubError;
      setClub(clubData);

      // Fetch member count for this club
      const { count } = await supabase
        .from('club_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId);
      
      setMemberCount(count || 0);

      // Fetch all memberships for user to check limit and status
      const { data: membershipsData, error: membershipError } = await supabase
        .from('club_memberships')
        .select('club_id')
        .eq('user_id', userId);

      if (membershipError) throw membershipError;

      setJoinedClubIds(new Set(membershipsData.map(m => m.club_id)));
      setLoading(false);
    } catch (error: any) {
      toast.error(error.message);
      navigate("/student/dashboard");
    }
  };

  const handleJoinClub = async () => {
    try {
      if (joinedClubIds.size >= 2) {
        toast.error("You cannot join more than 2 clubs.");
        return;
      }

      const { error } = await supabase
        .from('club_memberships')
        .insert({
          club_id: id,
          user_id: profile.id
        });

      if (error) {
        if (error.code === '23505') {
          toast.error("You're already a member of this club");
        } else {
          throw error;
        }
      } else {
        toast.success("Successfully joined club!");
        fetchClubData(profile.id); // Refresh data
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleLeaveClub = async () => {
    try {
      const { error } = await supabase
        .from('club_memberships')
        .delete()
        .eq('club_id', id)
        .eq('user_id', profile.id);

      if (error) throw error;

      toast.success("Left club successfully");
      fetchClubData(profile.id); // Refresh data
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isMember = joinedClubIds.has(id!);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-accent/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/student/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-48 bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
            <Users className="h-24 w-24 text-primary/50" />
          </div>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-4xl font-bold mb-2">{club.name}</CardTitle>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {memberCount} Members
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Created {new Date(club.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Button
                size="lg"
                variant={isMember ? "outline" : "default"}
                className={isMember ? "border-destructive text-destructive hover:bg-destructive/10" : ""}
                onClick={isMember ? handleLeaveClub : handleJoinClub}
              >
                {isMember ? (
                  <>
                    <HeartOff className="mr-2 h-5 w-5" />
                    Leave Club
                  </>
                ) : (
                  <>
                    <Heart className="mr-2 h-5 w-5" />
                    Join Club
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold border-b pb-2">About Us</h3>
              <p className="text-lg leading-relaxed text-muted-foreground">
                {club.description}
              </p>
              {club.details?.foundedBy && (
                 <p className="text-sm text-muted-foreground italic">
                   Founded by {club.details.foundedBy}
                 </p>
              )}
            </div>

            {/* Leadership Section */}
            {(club.details?.president || club.details?.vicePresident || club.details?.secretary || club.details?.facultyInCharge) && (
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold border-b pb-2">Leadership Team</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {club.details?.facultyInCharge && (
                    <Card className="bg-primary/5 border-primary/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium text-primary">
                          Faculty In-Charge{Array.isArray(club.details.facultyInCharge) && club.details.facultyInCharge.length > 1 ? 's' : ''}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {Array.isArray(club.details.facultyInCharge) ? (
                            <ul className="list-none space-y-1">
                                {club.details.facultyInCharge.map((item: string, i: number) => (
                                    <li key={i} className="font-semibold">{item}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="font-semibold">{club.details.facultyInCharge}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  {club.details?.president && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">President</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="font-semibold">{club.details.president}</p>
                      </CardContent>
                    </Card>
                  )}
                  {club.details?.vicePresident && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">
                          Vice President{Array.isArray(club.details.vicePresident) && club.details.vicePresident.length > 1 ? 's' : ''}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {Array.isArray(club.details.vicePresident) ? (
                            <ul className="list-none space-y-1">
                                {club.details.vicePresident.map((item: string, i: number) => (
                                    <li key={i} className="font-semibold">{item}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="font-semibold">{club.details.vicePresident}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  {club.details?.secretary && (
                    <Card>
                      <CardHeader className="pb-2">
                         <CardTitle className="text-lg font-medium">
                          Secretary{Array.isArray(club.details.secretary) && club.details.secretary.length > 1 ? 's' : ''}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {Array.isArray(club.details.secretary) ? (
                            <ul className="list-none space-y-1">
                                {club.details.secretary.map((item: string, i: number) => (
                                    <li key={i} className="font-semibold">{item}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="font-semibold">{club.details.secretary}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/*  Activities Section */}
            {club.details?.activities && club.details.activities.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold border-b pb-2">Club Activities</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {club.details.activities.map((activity: any, index: number) => (
                    <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow">
                      {activity.image && (
                        <div className="h-48 overflow-hidden">
                          <img 
                            src={activity.image} 
                            alt={activity.title} 
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl">{activity.title}</CardTitle>
                          {activity.date && (
                            <span className="text-xs font-mono bg-accent px-2 py-1 rounded">
                              {new Date(activity.date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{activity.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

             {/* Custom Fields Section */}
             {club.details?.customFields && club.details.customFields.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold border-b pb-2">More Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {club.details.customFields.map((field: any, index: number) => (
                    <div key={index} className="flex items-center space-x-4 p-4 rounded-lg border bg-card">
                      {field.image && (
                         <img src={field.image} alt={field.label} className="w-10 h-10 rounded-full object-cover" />
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">{field.label}</p>
                        <p className="font-medium">{field.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isMember && joinedClubIds.size >= 2 && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600 dark:text-yellow-400">
                You have reached the maximum limit of 2 clubs. Leave a club to join this one.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClubDetails;
