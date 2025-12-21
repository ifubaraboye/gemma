import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get Chats List
export const listChats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;

    const chats = await ctx.db
      .query("chat")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    
    return chats;
  },
});

// Fetch full chat by ID
export const getChat = query({
  args: { chatId: v.id("chat") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const userId = identity.subject;

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) return null;

    return chat;
  },
});

// Create a new chat
export const createChat = mutation({
  args: { 
    title: v.string(),
    modelCount: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.subject;

    const title = args.title.charAt(0).toUpperCase() + args.title.slice(1);
    const chatId = await ctx.db.insert("chat", {
      title,
      userId: userId,
      modelCount: args.modelCount || 1, 
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return chatId;
  },
});

// Add a message to existing chat
export const addMessage = mutation({
  args: {
    chatId: v.id("chat"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    completedModels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.subject;

    const chat = await ctx.db.get(args.chatId);
    if (!chat) throw new Error("Chat not found");
    
    if (chat.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const newMessage = {
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
      ...(args.completedModels && { completedModels: args.completedModels }),
    };

    await ctx.db.patch(args.chatId, {
      messages: [...(chat.messages || []), newMessage],
      updatedAt: Date.now(),
    });
  },
});

export const deleteChat = mutation({
  args: { chatId: v.id("chat") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.subject;

    const chat = await ctx.db.get(args.chatId);
    if (!chat) throw new Error("Chat not found");
    if (chat.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.delete(args.chatId);
  },
});

