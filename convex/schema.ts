import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chat: defineTable({
    title: v.string(),
    modelCount: v.optional(v.number()), 
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        timestamp: v.number(),
        // Add this field to track completed models in agent mode
        completedModels: v.optional(v.array(v.string())),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
});