"use server";

import mongoose from 'mongoose';
import dbConnect from './mongodb';
import { generateChatTitle } from './azure-api';

// Define the User Schema with nested Sessions Array
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  sessions: [
    {
      title: { type: String, default: "New Financial Chat" },
      pinned: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      messages: [
        {
          role: { type: String, enum: ['user', 'assistant', 'system'] },
          content: { type: String },
          timestamp: { type: Date, default: Date.now }
        }
      ]
    }
  ]
});

// Avoid OverwriteModelError
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export async function saveUserName(name: string) {
  try {
    console.log(`[DB] Attempting to save/find user: ${name}`);
    await dbConnect();
    let user = await User.findOne({ name });
    if (!user) {
      console.log(`[DB] User not found, creating new: ${name}`);
      user = new User({ name, sessions: [] });
      await user.save();
    }
    console.log(`[DB] User ready: ${name}`);
    return { success: true, user: JSON.parse(JSON.stringify(user)) };
  } catch (error: any) {
    console.error("[DB] Error saving user name:", error);
    return { success: false, error: error.message };
  }
}

export async function getChatSessions(name: string) {
  try {
    console.log(`[DB] Fetching sessions for: ${name}`);
    await dbConnect();
    const user = await User.findOne({ name });
    if (!user) return { success: false, error: "User not found" };
    
    // Return sessions without the large messages array to save bandwidth on sidebar load
    const sessions = (user.sessions || []).map((s: any) => ({
      _id: s._id,
      title: s.title,
      pinned: s.pinned || false,
      createdAt: s.createdAt,
      messageCount: s.messages ? s.messages.length : 0
    })).sort((a: any, b: any) => {
      // Pinned sessions come first, then sort by date descending
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (new Date(b.createdAt)).getTime() - (new Date(a.createdAt)).getTime();
    });

    return { success: true, sessions: JSON.parse(JSON.stringify(sessions)) };
  } catch (error: any) {
    console.error("[DB] Error fetching sessions:", error);
    return { success: false, error: error.message };
  }
}

export async function getSessionMessages(name: string, sessionId: string) {
  try {
    await dbConnect();
    const user = await User.findOne({ name });
    if (!user) return { success: false, error: "User not found" };

    const session = (user.sessions || []).id ? user.sessions.id(sessionId) : (user.sessions || []).find((s: any) => s._id.toString() === sessionId);
    if (!session) return { success: false, error: "Session not found" };

    return { success: true, messages: JSON.parse(JSON.stringify(session.messages)) };
  } catch (error: any) {
    console.error("[DB] Error fetching session messages:", error);
    return { success: false, error: error.message };
  }
}

export async function createNewSession(name: string) {
  try {
    console.log(`[DB] Creating new session for: ${name}`);
    await dbConnect();
    const user = await User.findOne({ name });
    if (!user) return { success: false, error: "User not found" };

    const newSession = { title: "New Financial Chat", messages: [], createdAt: new Date() };
    if (!user.sessions) user.sessions = [];
    user.sessions.push(newSession);
    await user.save();

    // Get the newly added session
    const addedSession = user.sessions[user.sessions.length - 1];
    
    console.log(`[DB] New session created: ${addedSession._id}`);
    return { success: true, sessionId: addedSession._id.toString() };
  } catch (error: any) {
    console.error("[DB] Error creating session:", error);
    return { success: false, error: error.message };
  }
}

export async function saveMessageToSession(name: string, sessionId: string, role: string, content: string, isFirstMessage: boolean = false) {
  try {
    console.log(`[DB] Saving message to session ${sessionId} for ${name} (${role})`);
    await dbConnect();
    const user = await User.findOne({ name });
    if (!user) return { success: false, error: "User not found" };

    const session = (user.sessions || []).id ? user.sessions.id(sessionId) : (user.sessions || []).find((s: any) => s._id.toString() === sessionId);
    if (!session) return { success: false, error: "Session not found" };

    session.messages.push({ role, content, timestamp: new Date() });

    // If it's the first user message, generate a title from the chat context
    let updatedTitle = session.title;
    let titleUpdated = false;
    if (isFirstMessage && role === 'user') {
       console.log(`[DB] First message detected, generating AI title...`);
       updatedTitle = await generateChatTitle(content);
       session.title = updatedTitle;
       titleUpdated = true;
       console.log(`[DB] AI-generated session title: "${updatedTitle}"`);
    }

    user.markModified('sessions');
    await user.save();
    console.log(`[DB] Message saved successfully.`);
    return { success: true, title: updatedTitle, titleUpdated };
  } catch (error: any) {
    console.error("[DB] Error saving message:", error);
    return { success: false, error: error.message };
  }
}

export async function renameSession(name: string, sessionId: string, newTitle: string) {
  try {
    await dbConnect();
    const user = await User.findOne({ name });
    if (!user) return { success: false, error: "User not found" };

    const session = (user.sessions || []).id ? user.sessions.id(sessionId) : (user.sessions || []).find((s: any) => s._id.toString() === sessionId);
    if (!session) return { success: false, error: "Session not found" };

    session.title = newTitle.trim() || "Untitled Chat";
    user.markModified('sessions');
    await user.save();
    console.log(`[DB] Session ${sessionId} renamed to: "${session.title}"`);
    return { success: true, title: session.title };
  } catch (error: any) {
    console.error("[DB] Error renaming session:", error);
    return { success: false, error: error.message };
  }
}

export async function togglePinSession(name: string, sessionId: string) {
  try {
    await dbConnect();
    const user = await User.findOne({ name });
    if (!user) return { success: false, error: "User not found" };

    const session = (user.sessions || []).id ? user.sessions.id(sessionId) : (user.sessions || []).find((s: any) => s._id.toString() === sessionId);
    if (!session) return { success: false, error: "Session not found" };

    session.pinned = !session.pinned;
    user.markModified('sessions');
    await user.save();
    console.log(`[DB] Session ${sessionId} pinned: ${session.pinned}`);
    return { success: true, pinned: session.pinned };
  } catch (error: any) {
    console.error("[DB] Error toggling pin:", error);
    return { success: false, error: error.message };
  }
}

export async function clearAllSessions(name: string) {
  try {
    await dbConnect();
    const user = await User.findOne({ name });
    if (user) {
      user.sessions = [];
      await user.save();
      return { success: true };
    }
    return { success: false, error: "User not found" };
  } catch (error: any) {
    console.error("[DB] Error clearing sessions:", error);
    return { success: false, error: error.message };
  }
}
