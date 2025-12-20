import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

// Get Chats List
export const listChats = query({
  args: {},
  handler: async (ctx) => {
    const user: any = await authComponent.getAuthUser(ctx);
    if (!user) {
        console.log("listChats: No user found");
        return [];
    }

    const userIdToUse = user.id || user._id;
    console.log(`listChats: Fetching chats for user ${userIdToUse} (from ${user.id ? 'id' : '_id'})`);

    const chats = await ctx.db
      .query("chat")
      .withIndex("by_userId", (q) => q.eq("userId", userIdToUse))
      .order("desc")
      .collect();
    
    console.log(`listChats: Found ${chats.length} chats`);
    return chats;
  },
});

// Fetch full chat by ID

export const getChat = query({

  args: { chatId: v.id("chat") },

  handler: async (ctx, args) => {

    const user: any = await authComponent.getAuthUser(ctx);

    if (!user) return null;



    const userIdToUse = user.id || user._id;



    const chat = await ctx.db.get(args.chatId);

    if (!chat || chat.userId !== userIdToUse) return null;



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

    const user: any = await authComponent.getAuthUser(ctx);

    

    if (!user) {

        console.log("createChat: Unauthorized - No user found");

        throw new Error("Unauthorized");

    }



    console.log("createChat: User object keys:", Object.keys(user));

    console.log("createChat: user.id:", user.id);

    console.log("createChat: user._id:", user._id);



    // Fallback: Use _id if id is missing, or vice versa. Prefer id (string).

    const userIdToSave = user.id || user._id;



    const title = args.title.charAt(0).toUpperCase() + args.title.slice(1);

    const chatId = await ctx.db.insert("chat", {

      title,

      userId: userIdToSave,

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



    const user: any = await authComponent.getAuthUser(ctx);



    if (!user) {



        console.log("addMessage: No user found");



        throw new Error("Unauthorized");



    }







    const userIdToUse = user.id || user._id;







    const chat = await ctx.db.get(args.chatId);



    if (!chat) throw new Error("Chat not found");



    



    if (chat.userId !== userIdToUse) {



        console.log(`addMessage: UserId mismatch. Chat owner: ${chat.userId}, Current User: ${userIdToUse} (from ${user.id ? 'id' : '_id'})`);



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

    const user: any = await authComponent.getAuthUser(ctx);

    if (!user) throw new Error("Unauthorized");



    const userIdToUse = user.id || user._id;



    const chat = await ctx.db.get(args.chatId);

    if (!chat) throw new Error("Chat not found");

    if (chat.userId !== userIdToUse) throw new Error("Unauthorized");



    const result = await ctx.db.delete(args.chatId);

    return result;

  },

});
