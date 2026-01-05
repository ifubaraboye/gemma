
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
import { Trash2, ChevronUp, LogOut, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect } from "react";
import { getCachedChatList, saveChatListToCache, deleteCachedChat } from "@/lib/indexedDB";

interface AppSidebarProps {
  activeChatId: Id<"chat"> | null;
  onSelectChat: (id: Id<"chat"> | null) => void;
}

export function AppSidebar({ activeChatId, onSelectChat }: AppSidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth0();

  const [cachedChats, setCachedChats] = useState<any[] | null>(null);
  const [isUserInfoBlurred, setIsUserInfoBlurred] = useState(() => {
    return localStorage.getItem("isUserInfoBlurred") === "true";
  });
  
  const chats = useQuery(api.chat.listChats);
  const deleteChat = useMutation(api.chat.deleteChat);

  useEffect(() => {
    getCachedChatList().then((list) => {
      if (list) setCachedChats(list);
    });
  }, []);

  useEffect(() => {
    if (chats) {
      setCachedChats(chats);
      saveChatListToCache(chats).catch((err) =>
        console.error("Failed to cache chat list:", err)
      );
    }
  }, [chats]);

  const displayChats = chats ?? cachedChats;

  const handleDelete = async (e: React.MouseEvent, id: Id<"chat">) => {
    e.stopPropagation();
    await deleteChat({ chatId: id });
    await deleteCachedChat(id).catch(err => console.error("Failed to delete from cache:", err));
    
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

  const toggleUserInfoBlur = () => {
    const newValue = !isUserInfoBlurred;
    setIsUserInfoBlurred(newValue);
    localStorage.setItem("isUserInfoBlurred", String(newValue));
  };

  const handleSignOut = async () => {
    await logout({ logoutParams: { returnTo: window.location.origin } });
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
              {displayChats === null ? (
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
                  {displayChats.map((chat) => (
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

                  {displayChats.length === 0 && (
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
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} className={`w-6 h-6 rounded-full border border-zinc-800 ${isUserInfoBlurred ? "blur-sm" : ""}`} />
                  ) : (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                      <UserIcon className="size-3.5" />
                    </div>
                  )}
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className={`truncate font-semibold ${isUserInfoBlurred ? "blur-md" : ""}`}>{user?.name || "User"}</span>
                    <span className={`truncate text-xs text-sidebar-foreground/70 ${isUserInfoBlurred ? "blur-md" : ""}`}>{user?.email}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width] min-w-56 rounded-lg bg-[#18181b] border-zinc-800 text-zinc-300"
              >
                <DropdownMenuItem className="group focus:bg-zinc-800 cursor-pointer" onClick={toggleUserInfoBlur}>
                   {isUserInfoBlurred ? <Eye className="mr-2 size-4" /> : <EyeOff className="mr-2 size-4" />}
                   <span>{isUserInfoBlurred ? "Show User Info" : "Hide User Info"}</span>
                </DropdownMenuItem>
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