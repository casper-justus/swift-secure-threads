import React from 'react';
import { Button } from '@/components/ui/button';
import { Image, FileText, Camera, FileAudio, Video } from 'lucide-react'; // Added FileAudio and Video

interface AttachmentTypeMenuProps {
  onSelectType: (type: 'image' | 'video' | 'document' | 'audio' | 'camera') => void;
  onClose: () => void;
}

export const AttachmentTypeMenu: React.FC<AttachmentTypeMenuProps> = ({ onSelectType, onClose }) => {
  const options = [
    { type: 'image', label: 'Photo', icon: <Image className="h-5 w-5 mr-3 text-pink-500" /> },
    { type: 'video', label: 'Video', icon: <Video className="h-5 w-5 mr-3 text-purple-500" /> },
    { type: 'document', label: 'Document', icon: <FileText className="h-5 w-5 mr-3 text-blue-500" /> },
    { type: 'audio', label: 'Audio', icon: <FileAudio className="h-5 w-5 mr-3 text-green-500" /> },
    // { type: 'camera', label: 'Camera', icon: <Camera className="h-5 w-5 mr-3 text-red-500" /> }, // Camera might require native access, defer for now
  ];

  return (
    <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#2f3136] rounded-lg shadow-xl border border-[#202225] z-20">
      <ul className="py-1">
        {options.map((opt) => (
          <li key={opt.type}>
            <Button
              variant="ghost"
              className="w-full justify-start px-3 py-2 text-sm text-white hover:bg-[#3b3e44]"
              onClick={() => {
                onSelectType(opt.type as 'image' | 'video' | 'document' | 'audio' | 'camera');
                onClose();
              }}
            >
              {opt.icon}
              {opt.label}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};
