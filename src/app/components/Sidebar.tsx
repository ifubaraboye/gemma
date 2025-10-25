"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Home, Search, Settings, LogIn } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SignedIn, SignedOut, UserButton, useUser, SignInButton } from "@clerk/nextjs";
import { supabase } from "@/utils/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function AppSidebar() {
  const { user } = useUser();
  const [chats, setChats] = useState<any[]>([]);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user?.id) return;

    async function fetchChats() {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) console.error("Error fetching chats:", error);
      else setChats(data || []);
    }

    fetchChats();
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("realtime-chats")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chats", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setChats((prev) => {
            const exists = prev.some((c) => c.id === payload.new.id);
            return exists ? prev : [payload.new, ...prev.filter((c) => c.id !== payload.new.id)];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chats", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setChats((prev) => prev.map((c) => (c.id === payload.new.id ? payload.new : c)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    function onCreating(e: any) {
      const detail = e?.detail;
      if (!user?.id || !detail?.id) return;
      setChats((prev) => {
        if (prev.some((c) => c.id === detail.id)) return prev;
        const temp = { id: detail.id, title: detail.title || "New Chat", isLoading: true, user_id: user.id };
        return [temp, ...prev];
      });
    }
    function onCreated(e: any) {
      const detail = e?.detail;
      if (!user?.id || !detail?.tempId || !detail?.realId) return;
      setChats((prev) => {
        const withoutReal = prev.filter((c) => c.id !== detail.realId);
        return withoutReal.map((c) => (c.id === detail.tempId ? { ...(detail.chat || {}), isLoading: false } : c));
      });
    }
    function onFailed(e: any) {
      const detail = e?.detail;
      if (!detail?.id) return;
      setChats((prev) => prev.filter((c) => c.id !== detail.id));
    }
    window.addEventListener("chat-creating", onCreating as any);
    window.addEventListener("chat-created", onCreated as any);
    window.addEventListener("chat-creation-failed", onFailed as any);
    return () => {
      window.removeEventListener("chat-creating", onCreating as any);
      window.removeEventListener("chat-created", onCreated as any);
      window.removeEventListener("chat-creation-failed", onFailed as any);
    };
  }, [user?.id]);

  function handleNewChat() {
    router.push("/");
  }

  function capFirst(text?: string) {
    const s = (text ?? "").toString();
    return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  return (
    <Sidebar>
      <SidebarContent className="text-white">
        <SidebarGroup>
          <div className="sticky top-0 z-10">
            <SidebarGroupLabel className="text-2xl text-white">Gemma.</SidebarGroupLabel>
            <div className="px-2 py-2">
              <button
                onClick={handleNewChat}
                className="w-full text-sm px-3 py-2 font-semibold rounded-md cursor-pointer bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors"
              >
                New Chat
              </button>
            </div>
          </div>
          <div className="px-1 py-3">
            <div className="border-b border-[#2a2a2a]"></div>
          </div>
          <div className="h-[calc(100vh-200px)] overflow-y-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                {chats.length ? (
                  chats.map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                      {chat.isLoading ? (
                        <div className="flex items-center gap-2 px-2 py-2 text-sm opacity-80">
                          <MessageSquare className="w-4 h-4 animate-pulse" />
                          <span>{capFirst(chat.title || "Creating chat...")}</span>
                          <span className="ml-auto w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                        </div>
                      ) : (
                        <SidebarMenuButton asChild data-active={pathname === `/chat/${chat.id}`}>
                          <Link href={`/chat/${chat.id}`}>
                            <MessageSquare className="w-4 h-4" />
                            <span>{capFirst(chat.title || "Untitled Chat")}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))
                ) : (
                  <SidebarMenuItem>
                    <span className="text-gray-400 text-sm px-4">No chats yet</span>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SignedOut>
        <SignInButton>
          <button className="flex font-bold cursor-pointer py-5 justify-start items-center px-5 gap-x-3">
            <LogIn />
            Login
          </button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <div className="flex items-center justify-between px-11 py-5">
          <UserButton
            appearance={{
              elements: { rootBox: "flex-row-reverse items-center gap-2", userButtonAvatarBox: "w-10 h-10" },
            }}
            userProfileMode="navigation"
            userProfileUrl="/profile"
          />
          <span className="text-sm text-white font-medium leading-none">{user?.fullName || "Guest"}</span>
        </div>
      </SignedIn>
    </Sidebar>
  );
}