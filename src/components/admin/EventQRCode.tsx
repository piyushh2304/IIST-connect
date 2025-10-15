import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import QRCode from "qrcode";

interface EventQRCodeProps {
  event: {
    id: string;
    title: string;
  };
}

export const EventQRCode = ({ event }: EventQRCodeProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [open, setOpen] = useState(false);

  const generateQRCode = async () => {
    try {
      const checkInUrl = `${window.location.origin}/events/${event.id}/checkin`;
      const qrUrl = await QRCode.toDataURL(checkInUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#8B5CF6',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrUrl);
      setOpen(true);
    } catch (error) {
      console.error('QR Code generation error:', error);
    }
  };

  const downloadQRCode = () => {
    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `${event.title.replace(/\s+/g, '_')}_QR.png`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={generateQRCode} className="gap-2">
          <QrCode className="h-4 w-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Event Check-in QR Code</DialogTitle>
          <DialogDescription>{event.title}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          {qrCodeUrl && (
            <>
              <img src={qrCodeUrl} alt="Event QR Code" className="rounded-lg shadow-lg" />
              <Button onClick={downloadQRCode} className="w-full">Download QR Code</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};