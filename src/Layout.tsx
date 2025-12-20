"use client";

import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import type { Id } from "../convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import Login from "@/components/Login";
import { Loader2 } from "lucide-react";

export type LayoutContext = {
  activeChatId: Id<"chat"> | null;
  setActiveChatId: (id: Id<"chat">) => void;
};

export default function Layout() {
  const [activeChatId, setActiveChatId] = useState<Id<"chat"> | null>(null);
  const { data: session, isPending } = authClient.useSession();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setHasInitialized(true);
    }
  }, [isPending]);

  // Only show loader on initial check. 
  // On subsequent updates (like sign out), we prefer to show the content or login immediately.
  if (isPending && !hasInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090b] text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <SidebarProvider>
      {/* Sidebar */}
      <AppSidebar
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
      />

      {/* Main content */}
      <SidebarInset>
        {/* Provide context to routed pages */}
        <Outlet context={{ activeChatId, setActiveChatId }} />
      </SidebarInset>
    </SidebarProvider>
  );
}
