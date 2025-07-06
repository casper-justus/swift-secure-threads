
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
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [show]);

  const handleReaction = (emoji: string) => {
    onReaction(emoji);
    onClose();
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed z-50 bg-[#36393f] border border-[#202225] rounded-full p-2 shadow-lg transition-all duration-200 ${
        show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}
      style={{
        left: Math.max(10, Math.min(position.x - 100, window.innerWidth - 210)),
        top: Math.max(10, position.y - 60),
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
