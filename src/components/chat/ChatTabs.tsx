
interface ChatTabsProps {
  children: React.ReactNode;
}

export const ChatTabs = ({ children }: ChatTabsProps) => {
  return (
    <div className="h-full flex flex-col min-h-0">
      {children}
    </div>
  );
};
