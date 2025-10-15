import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet } from "lucide-react";

export const BulkStudentImport = ({ onImportComplete }: { onImportComplete: () => void }) => {
  const [importing, setImporting] = useState(false);

  const downloadTemplate = () => {
    const csvContent = "full_name,email,phone_number,date_of_birth,year,semester,branch,section\nJohn Doe,john@example.com,1234567890,2003-01-15,2,4,CSE,A1\n";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Template downloaded successfully");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());

      // Validate headers
      const requiredHeaders = ['full_name', 'email', 'phone_number', 'date_of_birth', 'year', 'semester', 'branch', 'section'];
      const hasAllHeaders = requiredHeaders.every(h => headers.includes(h));
      
      if (!hasAllHeaders) {
        toast.error("Invalid CSV format. Please use the template.");
        setImporting(false);
        return;
      }

      const students = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length !== headers.length) continue;

        const student: any = {};
        headers.forEach((header, index) => {
          student[header] = values[index];
        });

        // Convert numeric fields
        student.year = parseInt(student.year);
        student.semester = parseInt(student.semester);

        students.push(student);
      }

      // Insert in batches
      const batchSize = 100;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize);
        const { error } = await supabase.from('students').insert(batch);
        
        if (error) {
          console.error('Batch error:', error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      toast.success(`Imported ${successCount} students successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      onImportComplete();
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Bulk Student Import
        </CardTitle>
        <CardDescription>Upload CSV file to import multiple students at once</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <Download className="h-4 w-4" />
            Download Template
          </Button>
          
          <div className="relative">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={importing}
              className="cursor-pointer"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Button disabled={importing} className="gap-2 pointer-events-none">
                <Upload className="h-4 w-4" />
                {importing ? 'Importing...' : 'Upload CSV'}
              </Button>
            </label>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">CSV Format Requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Headers: full_name, email, phone_number, date_of_birth, year, semester, branch, section</li>
            <li>Date format: YYYY-MM-DD</li>
            <li>No duplicate emails</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};