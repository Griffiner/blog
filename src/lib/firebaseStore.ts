import { db, isFirebaseConfigured, withTimeout } from "./firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocsFromCache,
  getDocFromCache
} from "firebase/firestore";
import { Post } from "../types";
import { INITIAL_POSTS } from "../data";

const COLLECTION_NAME = "posts";

/**
 * Fetches posts from Firebase Firestore.
 * Fallback: If the network is unreachable, it will gracefully retrieve posts from the local persistent cache.
 */
export async function fetchPostsFromFirebase(): Promise<Post[]> {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  try {
    // Check if the database was already seeded/initialized to prevent auto-seeding after a deletion/clear
    const configRef = doc(db, "config", "status");
    let isSeeded = false;
    try {
      const configDoc = await withTimeout(getDoc(configRef), 10000);
      if (configDoc.exists() && configDoc.data()?.seeded === true) {
        isSeeded = true;
      }
    } catch (e) {
      console.warn("Could not check seeding status, assuming not seeded:", e);
    }

    // Attempt standard retrieval (defaults to server first, then cache if configured)
    const querySnapshot = await withTimeout(getDocs(collection(db, COLLECTION_NAME)), 10000);
    let posts: Post[] = [];
    querySnapshot.forEach((doc) => {
      posts.push(doc.data() as Post);
    });

    // Automatically filter out any old mock posts
    posts = posts.filter(p => p.author.id !== "sarah" && p.author.id !== "alex" && p.author.id !== "marcus");

    // If Firestore has no posts yet and we have not seeded before, we seed it with INITIAL_POSTS
    if (posts.length === 0 && !isSeeded) {
      console.log("Firestore is empty on server and has not been initialized. Seeding with initial posts...");
      for (const post of INITIAL_POSTS) {
        await savePostToFirebase(post);
        posts.push(post);
      }
      try {
        await setDoc(configRef, { seeded: true });
      } catch (e) {
        console.warn("Failed to set seeding status in Firestore:", e);
      }
    } else if (!isSeeded && posts.length > 0) {
      // If there are already posts on server but we haven't marked it, mark as seeded
      try {
        await setDoc(configRef, { seeded: true });
      } catch (e) {
        console.warn("Failed to set seeding status in Firestore:", e);
      }
    }

    return posts;
  } catch (error: any) {
    console.warn("Could not fetch posts from Firestore server, attempting fallback to persistent local cache...", error);
    
    let cachedPosts: Post[] = [];
    try {
      const cacheSnapshot = await getDocsFromCache(collection(db, COLLECTION_NAME));
      cacheSnapshot.forEach((doc) => {
        cachedPosts.push(doc.data() as Post);
      });
      console.log(`Successfully retrieved ${cachedPosts.length} posts from Firestore persistent cache!`);
    } catch (cacheError) {
      console.warn("Failed to fetch posts from Firestore cache (expected if first load offline):", cacheError);
    }
    
    // Automatically filter out any old mock posts from the cache
    const filteredCached = cachedPosts.filter(p => p.author.id !== "sarah" && p.author.id !== "alex" && p.author.id !== "marcus");

    // Pass the cached posts on the error object so the UI can still display them while showing the offline warning
    const customError = new Error("Could not reach Cloud Firestore backend");
    (customError as any).code = "unavailable";
    (customError as any).cachedPosts = filteredCached;
    throw customError;
  }
}

/**
 * Recursively removes any key with "undefined" value to make objects Firestore-safe
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as any;
  }
  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        sanitized[key] = sanitizeForFirestore(val);
      }
    }
    return sanitized;
  }
  return obj;
}

export async function savePostToFirebase(post: Post): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const sanitizedPost = sanitizeForFirestore(post);
    await setDoc(doc(db, COLLECTION_NAME, post.id), sanitizedPost);
    console.log(`Saved post ${post.id} to Firestore successfully`);
  } catch (error) {
    console.error(`Error saving post ${post.id} to Firestore:`, error);
    throw error;
  }
}

export async function updatePostInFirebase(postId: string, updatedFields: Partial<Post>): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const postRef = doc(db, COLLECTION_NAME, postId);
    const sanitizedFields = sanitizeForFirestore(updatedFields);
    await updateDoc(postRef, sanitizedFields);
    console.log(`Updated post ${postId} in Firestore successfully`);
  } catch (error) {
    console.error(`Error updating post ${postId} in Firestore:`, error);
    throw error;
  }
}

export async function deletePostInFirebase(postId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, postId));
    console.log(`Deleted post ${postId} from Firestore successfully`);
  } catch (error) {
    console.error(`Error deleting post ${postId} from Firestore:`, error);
    throw error;
  }
}

export async function clearAllPostsFromFirebase(): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    for (const docSnap of querySnapshot.docs) {
      await deleteDoc(doc(db, COLLECTION_NAME, docSnap.id));
    }
    console.log("Successfully deleted all posts from Firestore collection.");

    // Mark as seeded/initialized so it doesn't auto-fill on next fetch
    const configRef = doc(db, "config", "status");
    await setDoc(configRef, { seeded: true });
    console.log("Preserved seeded status config document.");
  } catch (error) {
    console.error("Failed to delete all posts from Firestore:", error);
    throw error;
  }
}





