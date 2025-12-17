// queries/mutations in convex/chat.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get Chats List
export const listChats = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("chat")
      .order("desc")
      .collect();
  },
});


// Fetch full chat by ID
export const getChat = query({
  args: { chatId: v.id("chat") },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    return chat || null;
  },
});

// Create a new chat
export const createChat = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const title = args.title.charAt(0).toUpperCase() + args.title.slice(1);
    const chatId = await ctx.db.insert("chat", {
      title,
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
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) throw new Error("Chat not found");

    const newMessage = {
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
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
    const chat = await ctx.db.delete(args.chatId);
    return chat;
  },
})
