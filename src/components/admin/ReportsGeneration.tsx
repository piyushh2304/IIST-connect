import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";

export const ReportsGeneration = () => {
  const [reportType, setReportType] = useState<string>("attendance");
  const [generating, setGenerating] = useState(false);

  const generateReport = async () => {
    setGenerating(true);
    try {
      let csvContent = "";
      let fileName = "";

      if (reportType === "attendance") {
        const { data: events } = await supabase
          .from('events')
          .select('id, title, date_time, event_attendance(user_id, joined_at)');

        csvContent = "Event,Date,Student Count\n";
        events?.forEach(event => {
          const count = (event.event_attendance as any[])?.length || 0;
          csvContent += `"${event.title}",${new Date(event.date_time).toLocaleDateString()},${count}\n`;
        });
        fileName = "attendance_report.csv";
      } else if (reportType === "placements") {
        const { data: placements } = await supabase
          .from('placements')
          .select('*');

        csvContent = "Title,Company,Status,Created Date\n";
        placements?.forEach(placement => {
          csvContent += `"${placement.title}","${placement.company_name}",${placement.status},${new Date(placement.created_at).toLocaleDateString()}\n`;
        });
        fileName = "placements_report.csv";
      } else if (reportType === "ratings") {
        const { data: ratings } = await supabase
          .from('event_ratings')
          .select('rating, review, events(title)');

        csvContent = "Event,Rating,Review\n";
        ratings?.forEach(rating => {
          const eventTitle = (rating.events as any)?.title || 'Unknown';
          csvContent += `"${eventTitle}",${rating.rating},"${rating.review || ''}"\n`;
        });
        fileName = "ratings_report.csv";
      } else if (reportType === "clubs") {
        const { data: clubs } = await supabase
          .from('clubs')
          .select('name, description, club_memberships(user_id)');

        csvContent = "Club Name,Member Count,Description\n";
        clubs?.forEach(club => {
          const count = (club.club_memberships as any[])?.length || 0;
          csvContent += `"${club.name}",${count},"${club.description || ''}"\n`;
        });
        fileName = "clubs_report.csv";
      }

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Report downloaded successfully");
    } catch (error: any) {
      toast.error(`Failed to generate report: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Reports
        </CardTitle>
        <CardDescription>Download CSV reports for various data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="attendance">Event Attendance</SelectItem>
              <SelectItem value="placements">Placements</SelectItem>
              <SelectItem value="ratings">Event Ratings</SelectItem>
              <SelectItem value="clubs">Club Memberships</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={generateReport} disabled={generating} className="gap-2">
            <Download className="h-4 w-4" />
            {generating ? 'Generating...' : 'Download Report'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};