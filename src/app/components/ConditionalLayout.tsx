'use client'

import { usePathname } from 'next/navigation'
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/app/components/Sidebar"
import { useEffect, useState } from 'react'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isClerkHandshake, setIsClerkHandshake] = useState(false)
  
  useEffect(() => {
    // Check for Clerk handshake in URL
    const hasHandshake = window.location.search.includes('__clerk_handshake')
    setIsClerkHandshake(hasHandshake)
  }, [pathname])
  
  // Hide sidebar on all auth-related routes including callbacks
  const isAuthRoute = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/profile')
  
  if (isAuthRoute || isClerkHandshake) {
    return <>{children}</>
  }
  
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset>
        <div className="flex fixed h-12 bg-[#1a1a18] items-center gap-2 outline-none border-none px-4">
          <SidebarTrigger />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}