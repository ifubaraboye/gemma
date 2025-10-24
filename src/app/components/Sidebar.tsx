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

  // Realtime updates so new chats appear instantly and updates reflect without reload
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
            return exists ? prev : [payload.new, ...prev];
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

  async function handleNewChat() {
    if (!user?.id) return;
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Chat", messages: [] }),
    });
    if (!res.ok) return;
    const created = await res.json();
    const chat = created?.id ? created : created?.[0];
    if (chat?.id) {
      setChats((prev) => [chat, ...prev]);
      router.push(`/chat/${chat.id}`);
    }
  }


  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-2xl">Gemma</SidebarGroupLabel>
          <div className="px-2 py-2">
            <button
              onClick={handleNewChat}
              className="w-full text-sm px-3 py-2 rounded-md cursor-pointer bg-[#2a2a2a] hover:bg-[#3a3a3a]"
            >
              + New Chat
            </button>
          </div>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.length ? (
                chats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton asChild data-active={pathname === `/chat/${chat.id}`}>
                      <Link href={`/chat/${chat.id}`}>
                        <MessageSquare className="w-4 h-4" />
                        <span>{chat.title || "Untitled Chat"}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                <SidebarMenuItem>
                  <span className="text-gray-400 text-sm px-4">No chats yet</span>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
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
          <span className="text-sm font-medium leading-none">{user?.fullName || "Guest"}</span>
        </div>
      </SignedIn>
    </Sidebar>
  );
}
