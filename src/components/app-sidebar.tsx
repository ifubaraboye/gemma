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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Trash2, User2, ChevronUp, LogOut } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";

interface AppSidebarProps {
  activeChatId: Id<"chat"> | null;
  onSelectChat: (id: Id<"chat"> | null) => void;
}

export function AppSidebar({ activeChatId, onSelectChat }: AppSidebarProps) {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const chats = useQuery(api.chat.listChats);
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
    onSelectChat(null);
    navigate("/");
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    // Navigate is handled by Layout auth check, but we can force refresh if needed
  };

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar" className="border-r border-sidebar-border bg-sidebar">
      {/* HEADER: New Chat */}
      <SidebarHeader className="text-center">
        <SidebarMenu>
          <SidebarMenuItem>
  <SidebarMenuButton
    size="lg"
    onClick={handleNewChat}
    className="
      flex justify-center gap-2 cursor-pointer transition-colors duration-150

      bg-sidebar-primary text-sidebar-primary-foreground
      hover:bg-[#09090B] hover:text-white

      active:bg-[#09090B] active:text-white
      focus:bg-[#09090B] focus:text-white
      focus-visible:bg-[#09090B] focus-visible:text-white

      data-[state=open]:bg-[#09090B] data-[state=open]:text-white
      aria-[current=page]:bg-[#09090B] aria-[current=page]:text-white
    "
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
              {chats === undefined ? (
                // Loading State
                Array.from({ length: 5 }).map((_, i) => (
                   <SidebarMenuItem key={i}>
                     <div className="">
                       <Skeleton className="h-10 w-full bg-neutral-300 animate-pulse" />
                     </div>
                   </SidebarMenuItem>
                ))
              ) : (
                <>
                  {chats.map((chat) => (
                    <SidebarMenuItem key={chat._id}>
                      <SidebarMenuButton
                        onClick={() => {
                          onSelectChat(chat._id);
                          navigate(`/chat/${chat._id}`);
                        }}
                        isActive={activeChatId === chat._id}
                        // Added h-auto and py-2 to allow button to grow for the subtitle
                        className="h-auto py-3 transition-colors cursor-pointer duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                      >
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-medium">{chat.title}</span>
                          
                          {/* Subtitle: Only show if more than 1 agent was used */}
                          {chat.modelCount && chat.modelCount > 1 && (
                            <span className="truncate text-xs text-sidebar-foreground/60 font-normal">
                              {chat.modelCount} Agents
                            </span>
                          )}
                        </div>
                      </SidebarMenuButton>

                      <SidebarMenuAction
                        onClick={(e) => handleDelete(e, chat._id)}
                        showOnHover
                        className="text-sidebar-foreground/50  cursor-pointer hover:text-destructive hover:bg-sidebar-accent transition-colors"
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
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER: User Account */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="flex items-center gap-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer">
                  <div className="flex items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground p-1">
                    <User2 className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{session?.user?.name || "User"}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">{session?.user?.email}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width] min-w-56 rounded-lg bg-[#18181b] border-zinc-800 text-zinc-300"
              >
                <DropdownMenuItem className="group text-red-500 focus:text-red-500 focus:bg-red-950/20 cursor-pointer" onClick={handleSignOut}>
                  <LogOut className="mr-2 size-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}