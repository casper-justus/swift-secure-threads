
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface EmojiReactionsProps {
  onReaction: (emoji: string) => void;
  show: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

const popularEmojis = ["👍", "❤️", "😂", "😮", "😢"];

export const EmojiReactions = ({ onReaction, show, onClose, position }: EmojiReactionsProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
    } else {
      // Start fade-out animation, then hide
      const timer = setTimeout(() => setVisible(false), 300); // Increased duration
      return () => clearTimeout(timer);
    }
  }, [show]);

  // Handle closing on Escape key or custom event
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleCustomCloseEvent = () => {
      // This event is dispatched from ChatRoom.tsx for global clicks outside .emoji-reactions
      // Check if this specific instance should close.
      // The global handler in ChatRoom might be too broad if multiple popups could exist.
      // For now, assume it means this one should close if it's showing.
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('closeEmojiReactions', handleCustomCloseEvent);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('closeEmojiReactions', handleCustomCloseEvent);
    };
  }, [show, onClose]);

  const handleReaction = (emoji: string) => {
    onReaction(emoji);
    onClose();
  };

  if (!visible) return null;

  // Add 'emoji-reactions' class for the global click listener in ChatRoom.tsx to identify this component
  return (
    <div
      className={`emoji-reactions fixed z-50 bg-[#36393f] border border-[#202225] rounded-full p-2 shadow-lg transition-all duration-300 ${ // Increased duration
        show ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, calc(-100% - 8px))', // Center horizontally, move above and add 8px spacing
        // Boundary checks can be added here if needed, but transform makes it tricky.
        // For simplicity, relying on the popup not being overly wide.
        // Example boundary check (more complex to integrate with transform):
        // left: Math.max(10, Math.min(position.x, window.innerWidth - (POPUP_WIDTH + 10))),
        // top: Math.max(10, position.y - POPUP_HEIGHT - 8),
      }}
    >
      <div className="flex gap-1">
        {popularEmojis.map((emoji, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-lg hover:bg-[#4f545c] rounded-full"
            onClick={() => handleReaction(emoji)}
          >
            {emoji}
          </Button>
        ))}
      </div>
    </div>
  );
};
