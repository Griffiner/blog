import { db, isFirebaseConfigured, withTimeout } from "./firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  runTransaction, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc 
} from "firebase/firestore";
import { Author } from "../types";

export interface DBUser extends Author {
  credential: string;
  uid: number;
  following?: string[];
}

const USERS_KEY = "medium_blog_db_users";
const COUNTER_KEY = "medium_blog_db_users_counter";

/**
 * Generates a high-quality, easy-to-read random credential like MDB-X7R9KA
 */
export function generateRandomCredential(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoiding ambiguous characters
  let result = "MDB-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates an elegant random nickname for newly registered users.
 */
export function getRandomNickname(): string {
  const adjectives = [
    "晨曦", "星河", "听风", "寻光", "极光", "墨染", "暮色", "灵感", "独行", "微醺", 
    "不羁", "慵懒", "拾荒", "青木", "浮生", "幻梦", "清欢", "逆旅", "长歌", "浅笑", 
    "半夏", "晚风", "初晴", "知秋", "惊鸿", "浮光", "岁阑", "枕月", "落木", "飞鸟",
    "折柳", "微光", "山野", "落晖", "行云", "流觞", "破晓", "拂晓", "隐逸", "幽兰"
  ];
  const nouns = [
    "旅人", "歌者", "笔尖", "微光", "漫步者", "观察家", "记录者", "编织者", "追光者", 
    "吟游诗人", "造梦者", "思想者", "拾荒者", "行者", "过客", "行囊", "捕手", "浪子", 
    "书生", "琴师", "木匠", "茶客", "画师", "读者", "写手", "寻梦人", "捕风者",
    "守望者", "独白者", "潜行者", "拾光者", "踏浪人", "夜行人"
  ];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdj}${randomNoun}`;
}

/**
 * Local-only fallback user generator with sequential UIDs starting from 1
 */
function getOrCreateUserLocal(credential: string, defaultName?: string): DBUser {
  let localUsers: Record<string, DBUser> = {};
  try {
    const saved = localStorage.getItem(USERS_KEY);
    if (saved) {
      localUsers = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to parse local users database:", e);
  }

  if (localUsers[credential]) {
    return localUsers[credential];
  }

  let nextUid = 1;
  try {
    const savedCounter = localStorage.getItem(COUNTER_KEY);
    if (savedCounter) {
      nextUid = parseInt(savedCounter, 10) + 1;
    }
  } catch (e) {
    // ignore
  }

  const uidStr = `user_${nextUid}`;
  const name = defaultName || getRandomNickname();
  
  const newUser: DBUser = {
    id: uidStr,
    name: name,
    uid: nextUid,
    credential: credential,
    avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    bio: `介绍一下自己吧！`,
    bio_zh: `介绍一下自己吧！`,
    followers: 0,
    banner: "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80",
    customLinks: [],
    following: []
  };

  localUsers[credential] = newUser;
  localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
  localStorage.setItem(COUNTER_KEY, nextUid.toString());

  return newUser;
}

/**
 * Fetches or registers a credential in Firestore (or local fallback)
 * guaranteeing a sequential UID starting from 1 using a transaction.
 */
export async function getOrCreateUserInDB(credential: string, defaultName?: string): Promise<DBUser> {
  if (!isFirebaseConfigured || !db) {
    return getOrCreateUserLocal(credential, defaultName);
  }

  const userRef = doc(db, "users", credential);
  
  try {
    const userDoc = await withTimeout(getDoc(userRef), 10000);
    if (userDoc.exists()) {
      return userDoc.data() as DBUser;
    }

    // Run Firestore transaction to atomically get next UID and create user
    const counterRef = doc(db, "config", "user_counter");
    
    const newUser = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextUid = 1;
      if (counterDoc.exists()) {
        nextUid = (counterDoc.data().count || 0) + 1;
      }
      
      const uidStr = `user_${nextUid}`;
      const name = defaultName || getRandomNickname();
      
      const userPayload: DBUser = {
        id: uidStr,
        name: name,
        uid: nextUid,
        credential: credential,
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        bio: `介绍一下自己吧！`,
        bio_zh: `介绍一下自己吧！`,
        followers: 0,
        banner: "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80",
        customLinks: [],
        following: []
      };

      transaction.set(counterRef, { count: nextUid });
      transaction.set(userRef, userPayload);
      
      return userPayload;
    });

    // Also cache locally
    let localUsers: Record<string, DBUser> = {};
    try {
      const saved = localStorage.getItem(USERS_KEY);
      if (saved) localUsers = JSON.parse(saved);
    } catch (e) {}
    localUsers[credential] = newUser;
    localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));

    return newUser;
  } catch (error) {
    console.warn("Firestore user transaction failed (offline?), falling back to local user store:", error);
    return getOrCreateUserLocal(credential, defaultName);
  }
}

/**
 * Updates a user profile's fields both locally and in Firestore.
 */
export async function updateUserProfileInDB(credential: string, updatedFields: Partial<DBUser>): Promise<void> {
  // 1. Update locally
  let localUsers: Record<string, DBUser> = {};
  try {
    const saved = localStorage.getItem(USERS_KEY);
    if (saved) {
      localUsers = JSON.parse(saved);
    }
  } catch (e) {}

  if (localUsers[credential]) {
    localUsers[credential] = {
      ...localUsers[credential],
      ...updatedFields
    };
    localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
  }

  // 2. Update in Firestore
  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, "users", credential);
      await setDoc(userRef, updatedFields, { merge: true });
      console.log(`Successfully synced profile update to Firestore for credential: ${credential}`);
    } catch (error) {
      console.warn("Failed to update user profile in Firestore (will save locally):", error);
    }
  }
}

/**
 * Updates an author's followers count in Firestore users collection (and local users storage)
 */
export async function updateAuthorFollowersInDB(authorId: string, delta: number): Promise<void> {
  // Always update locally first as a fallback
  try {
    const saved = localStorage.getItem("medium_blog_db_users");
    if (saved) {
      const localUsers: Record<string, DBUser> = JSON.parse(saved);
      let updated = false;
      for (const cred of Object.keys(localUsers)) {
        if (localUsers[cred].id === authorId) {
          localUsers[cred].followers = Math.max(0, (localUsers[cred].followers || 0) + delta);
          updated = true;
        }
      }
      if (updated) {
        localStorage.setItem("medium_blog_db_users", JSON.stringify(localUsers));
      }
    }
  } catch (e) {
    console.warn("Could not update local author followers:", e);
  }

  // Also update current logged in user if they are the author (self-update)
  try {
    const savedMe = localStorage.getItem("medium_blog_user");
    if (savedMe) {
      const me: DBUser = JSON.parse(savedMe);
      if (me.id === authorId) {
        me.followers = Math.max(0, (me.followers || 0) + delta);
        localStorage.setItem("medium_blog_user", JSON.stringify(me));
      }
    }
  } catch (e) {}

  if (!isFirebaseConfigured || !db) return;
  try {
    const q = query(collection(db, "users"), where("id", "==", authorId));
    const querySnapshot = await getDocs(q);
    for (const docSnap of querySnapshot.docs) {
      const userRef = doc(db, "users", docSnap.id);
      const currentFollowers = docSnap.data().followers || 0;
      await updateDoc(userRef, { followers: Math.max(0, currentFollowers + delta) });
      console.log(`Updated followers count in Firestore users collection for ${authorId} by delta ${delta}`);
    }
  } catch (error) {
    console.warn("Could not update author followers in users collection:", error);
  }
}

/**
 * Fetches all registered users from Firestore (or local fallback)
 */
export async function getAllRegisteredUsers(): Promise<DBUser[]> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, "users"));
      const querySnapshot = await withTimeout(getDocs(q), 5000);
      const users: DBUser[] = [];
      querySnapshot.forEach((docSnap) => {
        const u = docSnap.data() as DBUser;
        // Make sure it has a valid ID
        if (u && u.id) {
          users.push(u);
        }
      });
      return users;
    } catch (error) {
      console.warn("Failed to fetch registered users from Firestore, using local fallback:", error);
    }
  }

  try {
    const saved = localStorage.getItem(USERS_KEY);
    if (saved) {
      const localUsers: Record<string, DBUser> = JSON.parse(saved);
      return Object.values(localUsers).filter(u => u && u.id);
    }
  } catch (e) {
    console.warn("Failed to parse local users:", e);
  }

  return [];
}

