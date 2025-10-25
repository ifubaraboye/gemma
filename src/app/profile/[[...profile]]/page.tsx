"use client"

import type React from "react"

import { useUser } from "@clerk/nextjs"
import { SignOutButton } from "@clerk/nextjs"
import { ArrowLeft, Mail, Calendar, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"


export default function Profile() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    username: user?.username || "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState("")

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-20"></div>
            <div className="space-y-4">
              <div className="h-32 w-32 bg-muted rounded-full mx-auto"></div>
              <div className="h-8 bg-muted rounded w-48 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage("")

    try {
      await user?.update({
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
      })
      setMessage("Profile updated successfully!")
      setIsEditing(false)
    } catch (error: any) {
      setMessage(error.errors?.[0]?.message || "Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      username: user?.username || "",
    })
    setIsEditing(false)
    setMessage("")
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-12 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="mb-12">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <img
              src={user?.imageUrl || "/placeholder.svg"}
              alt={user?.fullName || "User"}
              className="w-32 h-32 rounded-full object-cover mb-6"
            />

            {/* User Info */}
            {!isEditing ? (
              <div>
                <h1 className="text-4xl font-semibold text-foreground mb-2">{user?.fullName || "User"}</h1>
              </div>
            ) : (
              <div className="w-full space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-left">
                    <label className="block text-sm font-medium text-foreground mb-2">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="text-left">
                    <label className="block text-sm font-medium text-foreground mb-2">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <div className="text-left">
                  <label className="block text-sm font-medium text-foreground mb-2">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
                {message && (
                  <div
                    className={`p-4 rounded-lg text-sm font-medium ${
                      message.includes("success")
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200"
                        : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200"
                    }`}
                  >
                    {message}
                  </div>
                )}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm font-medium"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1 border-t border-border pt-12">
          <h2 className="text-lg font-semibold text-foreground mb-8">Account Details</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4 pb-6 border-b border-border">
              <Mail className="text-muted-foreground mt-1 shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Email Address</p>
                <p className="text-foreground">{user?.primaryEmailAddress?.emailAddress || "No email"}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Calendar className="text-muted-foreground mt-1 shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Member Since</p>
                <p className="text-foreground">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Unknown"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-border mt-12 flex justify-center">
          <SignOutButton redirectUrl="/">
            <button className="flex items-center gap-2 px-6 py-2 bg-[#1a1a18] cursor-pointer text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium">
              <LogOut size={18} />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    </main>
  )
}
