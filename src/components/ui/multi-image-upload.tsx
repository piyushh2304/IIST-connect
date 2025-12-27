import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { uploadToCloudinary } from "@/integrations/cloudinary/client";

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  className?: string;
  placeholder?: string;
  maxFiles?: number;
}

export const MultiImageUpload = ({ 
  value = [], 
  onChange, 
  className, 
  placeholder = "Upload Images",
  maxFiles = 5 
}: MultiImageUploadProps) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (value.length + files.length > maxFiles) {
      toast.error(`You can only upload up to ${maxFiles} images`);
      return;
    }

    setLoading(true);
    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast.error(`File ${file.name} is not an image`);
          continue;
        }

        // Validate file size (e.g., 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`Image ${file.name} is larger than 5MB`);
          continue;
        }

        const url = await uploadToCloudinary(file);
        newUrls.push(url);
      }

      onChange([...value, ...newUrls]);
      if (newUrls.length > 0) {
        toast.success(`Successfully uploaded ${newUrls.length} image(s)`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload some images");
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {value.map((url, index) => (
          <div key={index} className="relative aspect-video rounded-lg overflow-hidden border bg-muted/50 group">
            <img 
              src={url} 
              alt={`Uploaded ${index + 1}`} 
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeImage(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {value.length < maxFiles && (
          <Button
            type="button"
            variant="outline"
            className="w-full h-full min-h-[100px] aspect-video flex flex-col items-center justify-center border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <ImagePlus className="h-6 w-6 mb-2 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {loading ? "Uploading..." : `${placeholder} (${value.length}/${maxFiles})`}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
};
