
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatTabsProps {
  children: React.ReactNode;
  profileTab: React.ReactNode;
}

export const ChatTabs = ({ children, profileTab }: ChatTabsProps) => {
  return (
    <Tabs defaultValue="chat" className="h-full flex flex-col min-h-0">
      <div className="border-b border-[#202225] bg-[#36393f] flex-shrink-0">
        <TabsList className="bg-transparent border-none">
          <TabsTrigger 
            value="chat"
            className="data-[state=active]:bg-[#5865f2]/20 data-[state=active]:text-[#5865f2] text-[#b9bbbe] hover:text-white"
          >
            Chat
          </TabsTrigger>
          <TabsTrigger 
            value="profile"
            className="data-[state=active]:bg-[#5865f2]/20 data-[state=active]:text-[#5865f2] text-[#b9bbbe] hover:text-white"
          >
            Profile
          </TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="chat" className="flex-1 m-0 min-h-0">
        {children}
      </TabsContent>
      
      <TabsContent value="profile" className="flex-1 m-0 overflow-y-auto bg-[#36393f] min-h-0">
        {profileTab}
      </TabsContent>
    </Tabs>
  );
};
