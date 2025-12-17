import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Trash2, User2, ChevronUp } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface AppSidebarProps {
  activeChatId: Id<"chat"> | null;
  onSelectChat: (id: Id<"chat"> | null) => void;
}

export function AppSidebar({ activeChatId, onSelectChat }: AppSidebarProps) {
  const navigate = useNavigate();

  const chats = useQuery(api.chat.listChats) || [];
  const deleteChat = useMutation(api.chat.deleteChat);

  const handleDelete = async (e: React.MouseEvent, id: Id<"chat">) => {
    e.stopPropagation();
    await deleteChat({ chatId: id });
    
    // If deleting active chat, reset to home
    if (activeChatId === id) {
      onSelectChat(null);
      navigate("/");
    }
  };

  const handleNewChat = () => {
    // Reset active chat and navigate to home
    // The chat will be created when user sends first message
    onSelectChat(null);
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      {/* HEADER: New Chat */}
      <SidebarHeader className="text-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={handleNewChat}
              className="flex justify-center gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            >
              New Chat
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* CONTENT: Chat List */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">Your Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((chat) => (
                <SidebarMenuItem key={chat._id}>
                  <SidebarMenuButton
                    onClick={() => {
                      onSelectChat(chat._id);
                      navigate(`/chat/${chat._id}`);
                    }}
                    isActive={activeChatId === chat._id}
                    className="transition-colors cursor-pointer duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                  >
                    <span className="truncate font-medium">{chat.title}</span>
                  </SidebarMenuButton>

                  <SidebarMenuAction
                    onClick={(e) => handleDelete(e, chat._id)}
                    showOnHover
                    className="text-sidebar-foreground/50 hover:text-destructive hover:bg-sidebar-accent transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </SidebarMenuAction>
                </SidebarMenuItem>
              ))}

              {chats.length === 0 && (
                <div className="p-4 text-xs text-center text-sidebar-foreground/50">
                  No chats yet
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER: User Account */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground p-1">
                <User2 />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">User Account</span>
                <span className="truncate text-xs text-sidebar-foreground/70">user@example.com</span>
              </div>
              <ChevronUp className="ml-auto size-4" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}