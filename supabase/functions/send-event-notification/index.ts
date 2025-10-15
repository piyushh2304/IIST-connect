import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  targetRole?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, eventTitle, eventDate, eventLocation, targetRole }: NotificationRequest = await req.json();
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get target users
    let query = supabase.from('profiles').select('id, email, name');
    if (targetRole) {
      query = query.eq('role', targetRole);
    }
    
    const { data: users, error: usersError } = await query;
    
    if (usersError) throw usersError;

    // Create in-app notifications
    const notifications = users.map(user => ({
      user_id: user.id,
      title: "New Event Posted",
      message: `${eventTitle} is scheduled for ${new Date(eventDate).toLocaleDateString()} at ${eventLocation}`,
      type: "event",
      related_id: eventId,
      related_type: "event"
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) throw notifError;

    // Send emails via Resend API
    const emailPromises = users.map(user =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: "IIST Events <events@resend.dev>",
          to: [user.email],
          subject: `New Event: ${eventTitle}`,
          html: `
            <h1>New Event Posted!</h1>
            <h2>${eventTitle}</h2>
            <p><strong>Date:</strong> ${new Date(eventDate).toLocaleString()}</p>
            <p><strong>Location:</strong> ${eventLocation}</p>
            <p>Login to your dashboard to register and view more details.</p>
          `
        })
      })
    );

    await Promise.allSettled(emailPromises);

    return new Response(
      JSON.stringify({ success: true, notifiedUsers: users.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);