import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const canvases = pgTable("canvases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  template: text("template").notNull().default("business-model"),
  data: text("data").notNull().default("{}"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCanvasSchema = createInsertSchema(canvases).pick({
  name: true,
  template: true,
  data: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Canvas = typeof canvases.$inferSelect;
export type InsertCanvas = z.infer<typeof insertCanvasSchema>;
export type AppSetting = typeof appSettings.$inferSelect;
