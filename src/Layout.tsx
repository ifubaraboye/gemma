"use client";

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import type { Id } from "../convex/_generated/dataModel";

export type LayoutContext = {
  activeChatId: Id<"chat"> | null;
  setActiveChatId: (id: Id<"chat">) => void;
};

export default function Layout() {
  const [activeChatId, setActiveChatId] = useState<Id<"chat"> | null>(null);

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
