"use client";

import { useState } from "react";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import type { Id } from "../convex/_generated/dataModel";
import { useConvexAuth } from "convex/react";
import { useAuth0 } from "@auth0/auth0-react";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "./components/ui/button";

export type LayoutContext = {
  activeChatId: Id<"chat"> | null;
  setActiveChatId: (id: Id<"chat">) => void;
};

const Login = () => {
  const { loginWithRedirect } = useAuth0();
  return (
    <div className="flex h-screen items-center justify-center bg-[#09090b] text-zinc-500">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold text-zinc-200">Welcome to Gemma</h1>
        <p>Please log in to continue</p>
        <Button onClick={() => loginWithRedirect()} className="cursor-pointer">
          <LogIn className="mr-2 h-4 w-4" />
          Log In
        </Button>
      </div>
    </div>
  );
};

export default function Layout() {
  const [activeChatId, setActiveChatId] = useState<Id<"chat"> | null>(null);
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const { isAuthenticated: isAuth0Authenticated, isLoading: isAuth0Loading, user: auth0User } = useAuth0();

  useEffect(() => {
    console.log("--- Auth State ---");
    console.log("Auth0:", { isAuth0Loading, isAuth0Authenticated, email: auth0User?.email });
    console.log("Convex:", { isConvexLoading, isConvexAuthenticated });
  }, [isAuth0Loading, isAuth0Authenticated, auth0User, isConvexLoading, isConvexAuthenticated]);

  if (isConvexLoading || isAuth0Loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090b] text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isConvexAuthenticated) {
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
