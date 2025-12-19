import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Star, Loader2 } from "lucide-react";

interface EventRatingProps {
  eventId: string;
  eventTitle: string;
  userId: string;
}

const EventRating = ({ eventId, eventTitle, userId }: EventRatingProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingRating, setExistingRating] = useState<Tables<'event_ratings'> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchExistingRating();
  }, [fetchExistingRating]);

  const fetchExistingRating = useCallback(async () => {
    const { data } = await supabase
      .from('event_ratings')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setExistingRating(data);
      setRating(data.rating);
      setReview(data.review || "");
    }
  }, [eventId, userId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Error",
        description: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (existingRating) {
        const { error } = await supabase
          .from('event_ratings')
          .update({
            rating,
            review,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRating.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Rating updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('event_ratings')
          .insert({
            event_id: eventId,
            user_id: userId,
            rating,
            review,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Rating submitted successfully",
        });
      }

      fetchExistingRating();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate this Event</CardTitle>
        <CardDescription>{eventTitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-8 w-8 cursor-pointer transition-colors ${
                star <= (hoverRating || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
            />
          ))}
        </div>

        <div>
          <Textarea
            placeholder="Write your review (optional)..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={4}
          />
        </div>

        <Button onClick={handleSubmit} disabled={loading || rating === 0}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existingRating ? "Update Rating" : "Submit Rating"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EventRating;
