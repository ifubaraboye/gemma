'use client'

import { UserProfile } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Profile() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-gray-50 p-6">
       <button
        onClick={() => router.back()}
        className="flex items-center cursor-pointer gap-2 mb-6 text-gray-700 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="font-medium">Back</span>
      </button>
      <UserProfile
        appearance={{
          elements: {
            // Removes the border, shadow, and rounded edges
            card: "shadow-none rounded-none bg-transparent border-none p-0",

            // Optional: remove background from sidebar
            navbar: "bg-transparent border-none",

            // Optional: style text
            headerTitle: "text-2xl font-semibold text-gray-800",
            headerSubtitle: "text-gray-500",
          },
        }}
      />
    </main>
  );
}
