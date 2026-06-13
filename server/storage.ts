import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  canvases,
  appSettings,
  type User,
  type InsertUser,
  type Canvas,
  type InsertCanvas,
  type AppSetting,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getCanvases(): Promise<Canvas[]>;
  getCanvas(id: number): Promise<Canvas | undefined>;
  createCanvas(canvas: InsertCanvas): Promise<Canvas>;
  updateCanvas(id: number, canvas: Partial<InsertCanvas>): Promise<Canvas | undefined>;
  deleteCanvas(id: number): Promise<void>;
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getCanvases(): Promise<Canvas[]> {
    return db.select().from(canvases).orderBy(canvases.updatedAt);
  }

  async getCanvas(id: number): Promise<Canvas | undefined> {
    const [canvas] = await db.select().from(canvases).where(eq(canvases.id, id));
    return canvas;
  }

  async createCanvas(insertCanvas: InsertCanvas): Promise<Canvas> {
    const [canvas] = await db.insert(canvases).values(insertCanvas).returning();
    return canvas;
  }

  async updateCanvas(id: number, updates: Partial<InsertCanvas>): Promise<Canvas | undefined> {
    const [canvas] = await db
      .update(canvases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(canvases.id, id))
      .returning();
    return canvas;
  }

  async deleteCanvas(id: number): Promise<void> {
    await db.delete(canvases).where(eq(canvases.id, id));
  }

  async getSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return setting?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db
      .insert(appSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }
}

export const storage = new DatabaseStorage();
