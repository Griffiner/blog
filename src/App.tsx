/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import PostCard from "./components/PostCard";
import ArticleView from "./components/ArticleView";
import CommentDrawer from "./components/CommentDrawer";
import WriteView from "./components/WriteView";
import { Post, Comment, Category, Author } from "./types";
import { getStoredPosts, saveStoredPosts, AUTHORS, INITIAL_POSTS } from "./data";
import { BookOpen, Bookmark, User, Heart, Sparkles, AlertCircle, RefreshCw, Layers, Edit3, Upload, MapPin, Link2, Calendar, Users, ArrowLeft, Lock, Key, LogOut, Check, X, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { TRANSLATIONS } from "./translations";
import { renderBioWithLinks } from "./utils/linkify";
import { isFirebaseConfigured } from "./lib/firebase";
import { fetchPostsFromFirebase, savePostToFirebase, updatePostInFirebase, deletePostInFirebase, clearAllPostsFromFirebase } from "./lib/firebaseStore";
import { 
  generateRandomCredential, 
  getOrCreateUserInDB, 
  updateUserProfileInDB, 
  updateAuthorFollowersInDB,
  DBUser,
  getAllRegisteredUsers
} from "./lib/userStore";


// Avatar preset images for custom selection
const AVATAR_PRESETS = [
  { id: "a1", name: "Woman 1", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
  { id: "a2", name: "Man 1", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
  { id: "a3", name: "Woman 2", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
  { id: "a4", name: "Man 2", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
  { id: "a5", name: "Woman 3", url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80" },
];

// Profile banner preset images for custom selection
const BANNER_PRESETS = [
  { id: "b1", name: "Purple Gradient", url: "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80" },
  { id: "b2", name: "Dark Modern", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80" },
  { id: "b3", name: "Nature Green", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80" },
  { id: "b4", name: "Abstract Blue", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80" },
  { id: "b5", name: "Minimal Desk", url: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&auto=format&fit=crop&q=80" },
];

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const postsRef = React.useRef<Post[]>(posts);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);
  
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("medium_blog_is_logged_in") === "true";
  });

  const [currentCredential, setCurrentCredential] = useState(() => {
    return localStorage.getItem("medium_blog_current_credential") || "";
  });

  const [tempCredential, setTempCredential] = useState(() => {
    let temp = localStorage.getItem("medium_blog_temp_credential");
    if (!temp) {
      temp = generateRandomCredential();
      localStorage.setItem("medium_blog_temp_credential", temp);
    }
    return temp;
  });

  const [currentUser, setCurrentUser] = useState<DBUser>(() => {
    const saved = localStorage.getItem("medium_blog_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    const isLocalZh = localStorage.getItem("medium_blog_lang") === "zh";
    return {
      id: "visitor",
      name: isLocalZh ? "未验证游客" : "Visitor (Unverified)",
      uid: 0,
      credential: "",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      bio: isLocalZh
        ? "您当前处于游客浏览状态。所有发帖、编辑个人主页或修改信息都需要登录验证后才能进行显示和操作。"
        : "You are in visitor mode. All posting, profile edits, and information modifications require an active verified login to show and operate.",
      followers: 0,
      banner: "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80",
      customLinks: [],
      following: []
    };
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editBio, setEditBio] = useState(currentUser.bio);
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);
  const [editBanner, setEditBanner] = useState(currentUser.banner || "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80");
  const [editCustomLinks, setEditCustomLinks] = useState<{ text: string; url: string }[]>(() => {
    return currentUser.customLinks || [];
  });

  // Keep editor state in sync when user profile changes
  useEffect(() => {
    setEditName(currentUser.name);
    setEditBio(currentUser.bio);
    setEditAvatar(currentUser.avatar);
    setEditBanner(currentUser.banner || "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80");
    setEditCustomLinks(currentUser.customLinks || []);
  }, [currentUser]);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [inputCredential, setInputCredential] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState<DBUser[]>([]);
  const [profileTab, setProfileTab] = useState<"published" | "appreciated">("published");

  const [currentView, setCurrentView] = useState<string>("feed"); // 'feed' | 'article' | 'write' | 'bookmarks' | 'profile'
  const [viewedAuthor, setViewedAuthor] = useState<Author | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "zh">(() => {
    const saved = localStorage.getItem("medium_blog_lang");
    return (saved === "zh" || saved === "en") ? saved : "en";
  });

  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [firebaseError, setFirebaseError] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = TRANSLATIONS[lang];
  const isZh = lang === "zh";

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const refreshRegisteredUsers = () => {
    getAllRegisteredUsers()
      .then((users) => {
        setRegisteredUsers(users);
      })
      .catch((err) => {
        console.warn("Failed to load registered users:", err);
      });
  };

  // Monitor network connectivity state
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setFirebaseError(false);
      showToast(isZh ? "网络已连接，正在同步云端数据库数据..." : "Network online. Syncing cloud data...");
    };
    const handleOffline = () => {
      setIsOnline(false);
      setFirebaseError(true);
      showToast(isZh ? "网络已断开，切换为本地离线存储模式。" : "Network offline. Switched to offline storage mode.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [lang]);

  // Synchronize local data with Firestore
  const triggerFirebaseSync = (customPosts?: Post[]) => {
    if (!isFirebaseConfigured) return;
    setIsSyncingFirebase(true);
    setFirebaseError(false);
    fetchPostsFromFirebase()
      .then((cloudPosts) => {
        if (cloudPosts) {
          const filteredCloud = cloudPosts.filter(p => p.author.id !== "sarah" && p.author.id !== "alex" && p.author.id !== "marcus");
          
          setPosts((currentPosts) => {
            const postsToMerge = customPosts || currentPosts;
            const localMap = new Map(postsToMerge.map(p => [p.id, p]));
            const cloudMap = new Map(filteredCloud.map(p => [p.id, p]));
            const merged: Post[] = [];

            for (const localPost of postsToMerge) {
              const cloudPost = cloudMap.get(localPost.id);
              if (cloudPost) {
                merged.push({
                  ...cloudPost,
                  claps: Math.max(localPost.claps, cloudPost.claps),
                  likes: Math.max(localPost.likes || 0, cloudPost.likes || 0),
                  likedBy: Array.from(new Set([...(localPost.likedBy || []), ...(cloudPost.likedBy || [])])),
                  comments: cloudPost.comments || localPost.comments,
                });
              } else {
                merged.push(localPost);
              }
            }

            for (const cloudPost of filteredCloud) {
              if (!localMap.has(cloudPost.id)) {
                merged.push(cloudPost);
              }
            }

            merged.sort((a, b) => {
              const tA = a.id.startsWith("post_") ? parseInt(a.id.substring(5)) || 0 : 0;
              const tB = b.id.startsWith("post_") ? parseInt(b.id.substring(5)) || 0 : 0;
              if (tA && tB) return tB - tA;
              return 0;
            });

            saveStoredPosts(merged);
            return merged;
          });
        }
        console.log("Successfully synced posts with Firebase Firestore!");
      })
      .catch((err: any) => {
        console.warn("Firebase fetch failed, using local storage/offline cache:", err);
        setFirebaseError(true);
        // If there were posts successfully retrieved from Firestore persistent cache during failure, merge/use them
        if (err.cachedPosts && err.cachedPosts.length > 0) {
          const filteredCached = err.cachedPosts.filter((p: any) => p.author.id !== "sarah" && p.author.id !== "alex" && p.author.id !== "marcus");
          
          setPosts((currentPosts) => {
            const postsToMerge = customPosts || currentPosts;
            const localMap = new Map(postsToMerge.map(p => [p.id, p]));
            const merged = [...postsToMerge];
            for (const cp of filteredCached) {
              if (!localMap.has(cp.id)) {
                merged.push(cp);
              }
            }
            
            merged.sort((a, b) => {
              const tA = a.id.startsWith("post_") ? parseInt(a.id.substring(5)) || 0 : 0;
              const tB = b.id.startsWith("post_") ? parseInt(b.id.substring(5)) || 0 : 0;
              if (tA && tB) return tB - tA;
              return 0;
            });

            saveStoredPosts(merged);
            return merged;
          });
          console.log("Loaded fallback data from Firestore persistent local cache.");
        }
      })
      .finally(() => {
        setIsSyncingFirebase(false);
      });
  };

  // Initialize data on load
  useEffect(() => {
    // 1. Immediately load from LocalStorage so the page loads with zero lag
    let localPosts = getStoredPosts();
    
    // Automatically purge old hardcoded/mock posts from authors "sarah", "alex", "marcus"
    const hasMockPosts = localPosts.some(p => p.author.id === "sarah" || p.author.id === "alex" || p.author.id === "marcus");
    if (hasMockPosts) {
      localPosts = localPosts.filter(p => p.author.id !== "sarah" && p.author.id !== "alex" && p.author.id !== "marcus");
      saveStoredPosts(localPosts);
    }
    
    setPosts(localPosts);

    // 2. If Firebase is configured, asynchronously fetch from Firestore to update local and UI state
    if (isFirebaseConfigured) {
      triggerFirebaseSync(localPosts);

      // Fetch latest profile info for the logged-in user to keep follower count and following list fresh on refresh
      if (isLoggedIn && currentCredential) {
        getOrCreateUserInDB(currentCredential)
          .then((dbUser) => {
            if (dbUser) {
              setCurrentUser(dbUser);
              localStorage.setItem("medium_blog_user", JSON.stringify(dbUser));
            }
          })
          .catch((e) => console.warn("Failed to refresh user profile on mount:", e));
      }
    }
    // Refresh the registered users list on mount
    refreshRegisteredUsers();
  }, []);

  // Proactively refresh registered users list when user starts a user search
  useEffect(() => {
    if (searchQuery.trim().startsWith("@")) {
      refreshRegisteredUsers();
    }
  }, [searchQuery]);

  // Save data to localStorage whenever posts change and sync with Firebase
  const handleUpdatePosts = async (newPosts: Post[]) => {
    // Keep local UI and storage instantly updated
    setPosts(newPosts);
    const prevPosts = postsRef.current;
    postsRef.current = newPosts; // Synchronously update ref
    saveStoredPosts(newPosts);

    if (isFirebaseConfigured) {
      setIsSyncingFirebase(true);
      setFirebaseError(false);
      try {
        // High-performance selective sync: only update modified/added posts
        const prevMap = new Map(prevPosts.map(p => [p.id, p]));
        for (const p of newPosts) {
          const prev = prevMap.get(p.id);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(p)) {
            await savePostToFirebase(p);
          }
        }
        
        // Delete posts that are no longer present in the updated list
        const newIds = new Set(newPosts.map(p => p.id));
        for (const p of prevPosts) {
          if (!newIds.has(p.id)) {
            await deletePostInFirebase(p.id);
          }
        }
      } catch (e) {
        console.warn("Failed to sync change to Firebase:", e);
        setFirebaseError(true);
      } finally {
        setIsSyncingFirebase(false);
      }
    }
  };


  const handleChangeLang = (newLang: "en" | "zh") => {
    setLang(newLang);
    localStorage.setItem("medium_blog_lang", newLang);
  };

  const handleResetData = () => {
    const confirmMessage = isZh
      ? "您确定要将博客数据恢复为默认设置吗？这将清除您自己发表的所有文章。"
      : "Are you sure you want to reset the blog data to defaults? This will erase your published articles.";
    if (window.confirm(confirmMessage)) {
      localStorage.removeItem("medium_blog_posts");
      localStorage.removeItem("medium_blog_user");
      const defaultPosts = getStoredPosts();
      setPosts(defaultPosts);
      setCurrentUser({
        id: "alexander",
        name: "Alexander Smith",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        bio: "Passionate developer, writer, and tech enthusiast. Sharing my learning journey on the web.",
        followers: 42,
      });
      setCurrentView("feed");
      setSelectedPostId(null);
      setSearchQuery("");
      setCommentDrawerOpen(false);
      setIsEditingProfile(false);
    }
  };



  // Clap Handler (can clap multiple times!)
  const handleClap = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast(isZh ? "请先验证登录凭证以进行互动" : "Please verify your login credential to interact.");
      return;
    }
    const updated = postsRef.current.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          claps: p.claps + 1,
          isClapped: true,
        };
      }
      return p;
    });
    handleUpdatePosts(updated);
  };

  // Like Handler (each user can only like a post once!)
  const handleLike = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast(isZh ? "请先验证登录凭证以进行互动" : "Please verify your login credential to interact.");
      return;
    }

    const updated = postsRef.current.map((p) => {
      if (p.id === postId) {
        const likedBy = p.likedBy || [];
        const userId = currentUser.id;
        const alreadyLiked = likedBy.includes(userId);

        if (alreadyLiked) {
          showToast(isZh ? "您已经为这篇故事点过赞了！" : "You have already liked this story!");
          return p;
        } else {
          const newLikes = (p.likes || 0) + 1;
          const newLikedBy = [...likedBy, userId];
          showToast(isZh ? "点赞成功！" : "Liked successfully!");
          return {
            ...p,
            likes: newLikes,
            likedBy: newLikedBy,
          };
        }
      }
      return p;
    });

    handleUpdatePosts(updated);
  };

  // Bookmark Handler
  const handleBookmark = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast(isZh ? "请先验证登录凭证以加入书签" : "Please verify your login credential to bookmark.");
      return;
    }
    const updated = postsRef.current.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          isBookmarked: !p.isBookmarked,
        };
      }
      return p;
    });
    handleUpdatePosts(updated);
  };

  // Follow Toggle Handler with Real-Time Database sync
  const handleFollowToggle = async (authorId: string) => {
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast(isZh ? "请先验证登录凭证以关注作者" : "Please verify your login credential to follow.");
      return;
    }

    if (authorId === currentUser.id) {
      showToast(isZh ? "你不能关注自己" : "You cannot follow yourself.");
      return;
    }

    const following = currentUser.following || [];
    const isCurrentlyFollowed = following.includes(authorId);
    let newFollowing: string[];
    let delta = 0;

    if (isCurrentlyFollowed) {
      newFollowing = following.filter((id) => id !== authorId);
      delta = -1;
      showToast(isZh ? "已取消关注" : "Unfollowed successfully.");
    } else {
      newFollowing = Array.from(new Set([...following, authorId]));
      delta = 1;
      showToast(isZh ? "关注成功！" : "Followed successfully!");
    }

    // 1. Update the current user's profile state and localStorage
    const updatedUser = {
      ...currentUser,
      following: newFollowing,
    };
    setCurrentUser(updatedUser);
    localStorage.setItem("medium_blog_user", JSON.stringify(updatedUser));

    // Update in the local users database
    let localUsers: Record<string, DBUser> = {};
    try {
      const saved = localStorage.getItem("medium_blog_db_users");
      if (saved) localUsers = JSON.parse(saved);
    } catch (e) {}
    localUsers[currentCredential] = updatedUser;
    localStorage.setItem("medium_blog_db_users", JSON.stringify(localUsers));

    // Sync current user's profile update to Firestore (with their updated following array)
    await updateUserProfileInDB(currentCredential, {
      following: newFollowing,
    });

    // 2. Update the author's followers count on ALL posts written by that author
    const updatedPosts = postsRef.current.map((p) => {
      if (p.author.id === authorId) {
        return {
          ...p,
          author: {
            ...p.author,
            followers: Math.max(0, (p.author.followers || 0) + delta),
          },
        };
      }
      return p;
    });

    await handleUpdatePosts(updatedPosts);

    // 3. Update the author's user profile document in Firestore as well
    await updateAuthorFollowersInDB(authorId, delta);

    // 4. Update viewedAuthor state in local state if viewing their profile
    if (viewedAuthor && viewedAuthor.id === authorId) {
      setViewedAuthor((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          followers: Math.max(0, (prev.followers || 0) + delta),
        };
      });
    }
  };

  // Delete Handler
  const handleDeletePost = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast(isZh ? "请先验证登录凭证" : "Please verify your login credential.");
      return;
    }

    const executeDelete = () => {
      const filtered = postsRef.current.filter((p) => p.id !== postId);
      handleUpdatePosts(filtered);
      if (selectedPostId === postId) {
        setSelectedPostId(null);
        setCurrentView("feed");
      }
      showToast(isZh ? "故事已成功删除" : "Story deleted successfully.");
    };

    const confirmDeleteMessage = isZh ? "您确定要删除这篇故事吗？" : "Are you sure you want to delete this story?";
    if (window.confirm(confirmDeleteMessage)) {
      executeDelete();
    }
  };

  // Add Comment/Response
  const handleAddComment = (text: string) => {
    if (!selectedPostId) return;
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast(isZh ? "请先验证登录凭证以发表回复" : "Please verify your login credential to respond.");
      return;
    }
    const now = new Date();
    // English format
    const enDateStr = now.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    // Chinese format
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const hr = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const zhDateStr = `${y}年${m}月${d}日 ${hr}:${min}`;

    const newComment: Comment = {
      id: "comment_" + now.getTime(),
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      content: text,
      content_zh: text,
      createdAt: enDateStr,
      createdAt_zh: zhDateStr,
      claps: 0,
    };

    const updated = postsRef.current.map((p) => {
      if (p.id === selectedPostId) {
        return {
          ...p,
          comments: [newComment, ...p.comments],
        };
      }
      return p;
    });
    handleUpdatePosts(updated);
  };

  // Clap on Comment
  const handleClapComment = (commentId: string) => {
    if (!selectedPostId) return;
    const updated = postsRef.current.map((p) => {
      if (p.id === selectedPostId) {
        const updatedComments = p.comments.map((c) => {
          if (c.id === commentId) {
            return { ...c, claps: c.claps + 1 };
          }
          return c;
        });
        return { ...p, comments: updatedComments };
      }
      return p;
    });
    handleUpdatePosts(updated);
  };

  // Publish new story
  const handlePublishStory = (postData: {
    title: string;
    subtitle: string;
    content: string;
    category?: string;
    category_zh?: string;
    coverImage?: string;
    tags: string[];
    tags_zh?: string[];
  }) => {
    const wordCount = postData.content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(wordCount / 200));

    const newPost: Post = {
      id: "post_" + Date.now(),
      title: postData.title,
      title_zh: postData.title,
      subtitle: postData.subtitle,
      subtitle_zh: postData.subtitle,
      content: postData.content,
      content_zh: postData.content,
      coverImage: postData.coverImage,
      category: postData.category || "Story",
      category_zh: postData.category_zh || postData.category || "故事",
      tags: postData.tags,
      tags_zh: postData.tags_zh || postData.tags,
      publishedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      publishedAt_zh: "刚刚",
      readTime: `${minutes} min read`,
      readTime_zh: `阅读时间 ${minutes} 分钟`,
      claps: 0,
      comments: [],
      isBookmarked: false,
      isClapped: false,
      author: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        bio: currentUser.bio,
        bio_zh: currentUser.bio,
        followers: currentUser.followers,
        banner: currentUser.banner,
      },
    };

    handleUpdatePosts([newPost, ...postsRef.current]);
    setCurrentView("feed");
    showToast(isZh ? "故事发表成功！" : "Story published successfully!");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "banner") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          const img = new Image();
          img.src = reader.result;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            // Define max dimensions (e.g., 200px for avatar, 800px for banner)
            const maxDim = type === "avatar" ? 200 : 800;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              // Compress to high-quality JPEG (0.75 quality) to keep file sizes very small (typically ~15KB - 30KB)
              const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
              if (type === "avatar") {
                setEditAvatar(compressedDataUrl);
              } else {
                setEditBanner(compressedDataUrl);
              }
            }
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    const nameToSave = editName.trim() || currentUser.name;
    const bioToSave = editBio.trim() || currentUser.bio;
    const avatarToSave = editAvatar.trim() || currentUser.avatar;
    const bannerToSave = editBanner.trim() || currentUser.banner;
    const linksToSave = editCustomLinks.filter(link => link.text.trim() !== "" && link.url.trim() !== "");

    const updatedUser = {
      ...currentUser,
      name: nameToSave,
      bio: bioToSave,
      avatar: avatarToSave,
      banner: bannerToSave,
      customLinks: linksToSave,
    };

    setCurrentUser(updatedUser);
    localStorage.setItem("medium_blog_user", JSON.stringify(updatedUser));
    setIsEditingProfile(false);

    showToast(isZh ? "个人信息已保存并开始更新数据库..." : "Profile saved, updating database...");

    if (isLoggedIn && currentCredential) {
      try {
        await updateUserProfileInDB(currentCredential, {
          name: nameToSave,
          bio: bioToSave,
          avatar: avatarToSave,
          banner: bannerToSave,
          customLinks: linksToSave,
        });
        showToast(isZh ? "个人资料与头像已成功同步到数据库！" : "Profile and avatar successfully updated in the database!");
      } catch (err) {
        console.error("Failed to sync profile update to database:", err);
        showToast(isZh ? "本地保存成功，但未能同步至云端数据库" : "Profile saved locally, but failed to sync to cloud database.");
      }
    }

    const updatedPosts = postsRef.current.map((post) => {
      if (post.author.id === currentUser.id) {
        return {
          ...post,
          author: {
            ...post.author,
            name: nameToSave,
            avatar: avatarToSave,
            bio: bioToSave,
            bio_zh: bioToSave,
            banner: bannerToSave,
            customLinks: linksToSave,
          },
        };
      }
      return post;
    });
    handleUpdatePosts(updatedPosts);
    refreshRegisteredUsers();
  };

  // Helper to download credential as TXT file
  const downloadCredentialTxt = (cred: string, uid?: number) => {
    const content = `=========================================
Medium Blog - 您的账号登录凭证
=========================================

您的唯一登录凭证: ${cred}
${uid ? `分配的数字 UID: #${uid}` : ""}

请妥善保管此凭证！
您可以使用此凭证在任何设备或浏览器中再次登录您的账号，并同步您的所有文章、点赞、评论和设置。

建议将此文件保存在安全的地方，防止浏览器缓存清除导致数据丢失。

=========================================
`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `medium-blog-credential-${cred}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Login handler
  const handleLogin = async (credToUse?: string, shouldDownload = false) => {
    const cred = (credToUse || inputCredential || "").trim();
    if (!cred) {
      showToast(isZh ? "请输入或选择登录凭证" : "Please enter or select a login credential.");
      return;
    }

    setIsSyncingFirebase(true);
    try {
      const user = await getOrCreateUserInDB(cred);
      setCurrentUser(user);
      setCurrentCredential(cred);
      setIsLoggedIn(true);
      
      localStorage.setItem("medium_blog_is_logged_in", "true");
      localStorage.setItem("medium_blog_current_credential", cred);
      localStorage.setItem("medium_blog_user", JSON.stringify(user));

      // Regenerate next temp credential for any subsequent logout/reset
      const nextTemp = generateRandomCredential();
      setTempCredential(nextTemp);
      localStorage.setItem("medium_blog_temp_credential", nextTemp);

      if (shouldDownload) {
        downloadCredentialTxt(cred, user.uid);
      }

      showToast(isZh ? `验证成功！欢迎回来，UID #${user.uid}` : `Verification successful! Welcome back, UID #${user.uid}`);
      setLoginModalOpen(false);
      setInputCredential("");
      refreshRegisteredUsers();
    } catch (err) {
      console.error("Login failed:", err);
      showToast(isZh ? "无法验证凭证，请稍后重试。" : "Failed to verify credential, please try again.");
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentCredential("");
    localStorage.setItem("medium_blog_is_logged_in", "false");
    localStorage.setItem("medium_blog_current_credential", "");
    localStorage.removeItem("medium_blog_user");

    setCurrentUser({
      id: "visitor",
      name: isZh ? "未验证游客" : "Visitor (Unverified)",
      uid: 0,
      credential: "",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      bio: isZh
        ? "您当前处于游客浏览状态。所有发帖、编辑个人主页或修改信息都需要登录验证后才能进行显示和操作。"
        : "You are in visitor mode. All posting, profile edits, and information modifications require an active verified login to show and operate.",
      followers: 0,
      banner: "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80",
      customLinks: [],
      following: []
    });

    if (currentView === "write" || currentView === "profile") {
      navigateTo("feed");
    }

    showToast(isZh ? "已成功退出登录" : "Logged out successfully.");
    refreshRegisteredUsers();
  };

  // Navigation controller
  const navigateTo = (view: string) => {
    setCurrentView(view);
    if (view !== "article") {
      setSelectedPostId(null);
    }
    setViewedAuthor(null);
    setCommentDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToAuthorProfile = (author: Author) => {
    setViewedAuthor(author);
    setCurrentView("profile");
    setSelectedPostId(null);
    setCommentDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId);
    setCurrentView("article");
    setCommentDrawerOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCommentClick = (postId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedPostId(postId);
    setCurrentView("article");
    setCommentDrawerOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Filter posts based on Search & Tab Selection
  const activePost = posts.find((p) => p.id === selectedPostId);

  const getAllAuthors = (): Author[] => {
    const authorMap = new Map<string, Author>();
    
    // 1. Predefined authors
    Object.values(AUTHORS).forEach((a) => {
      authorMap.set(a.id, a);
    });

    // 2. Current user as an author
    if (currentUser) {
      authorMap.set(currentUser.id, {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        bio: currentUser.bio || "",
        bio_zh: currentUser.bio_zh || currentUser.bio || "",
        followers: currentUser.followers || 0,
        banner: currentUser.banner,
      });
    }

    // 3. Authors from all posts
    posts.forEach((p) => {
      if (p.author && p.author.id) {
        if (!authorMap.has(p.author.id)) {
          authorMap.set(p.author.id, p.author);
        }
      }
    });

    return Array.from(authorMap.values());
  };

  const isUserSearch = searchQuery.trim().startsWith("@");
  const userSearchTerm = isUserSearch ? searchQuery.trim().substring(1).toLowerCase() : "";

  const matchedAuthors = isUserSearch
    ? registeredUsers.filter((author) => {
        const nameMatch = author.name.toLowerCase().includes(userSearchTerm);
        const idMatch = author.id.toLowerCase().includes(userSearchTerm);
        const bioMatch = (author.bio || "").toLowerCase().includes(userSearchTerm) || 
                         (author.bio_zh || "").toLowerCase().includes(userSearchTerm);
        return nameMatch || idMatch || bioMatch;
      })
    : [];

  const filteredPosts = posts.filter((post) => {
    if (isUserSearch) {
      return matchedAuthors.some((author) => author.id === post.author.id);
    }

    const postTags = isZh && post.tags_zh ? post.tags_zh : post.tags;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (postTags && postTags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesSearch;
  });

  const bookmarkedPosts = posts.filter((p) => p.isBookmarked);
  const userPublishedPosts = posts.filter((p) => p.author.id === currentUser.id);
  const userClappedPosts = posts.filter((p) => p.isClapped);
  const totalLikesReceived = userPublishedPosts.reduce((sum, p) => sum + (p.likes || 0), 0);

  // Profile-specific variables
  const profileAuthor = viewedAuthor || currentUser;
  const isOwnProfile = !viewedAuthor || viewedAuthor.id === currentUser.id;
  
  const getPostIdNum = (id: string) => {
    if (id.startsWith("post_")) {
      return parseInt(id.substring(5)) || 0;
    }
    return 0;
  };

  const profilePublishedPosts = posts
    .filter((p) => p.author.id === profileAuthor.id)
    .sort((a, b) => getPostIdNum(b.id) - getPostIdNum(a.id));

  const profileClappedPosts = posts
    .filter((p) => p.likedBy?.includes(profileAuthor.id) || (isOwnProfile && p.isClapped))
    .sort((a, b) => getPostIdNum(b.id) - getPostIdNum(a.id));

  // Suggested/Recommended reading for the article view (exclude current post, same tags preferred)
  const recommendedPosts = posts
    .filter((p) => p.id !== selectedPostId)
    .sort((a, b) => {
      if (activePost) {
        const aTags = isZh && a.tags_zh ? a.tags_zh : a.tags;
        const bTags = isZh && b.tags_zh ? b.tags_zh : b.tags;
        const activeTags = isZh && activePost.tags_zh ? activePost.tags_zh : activePost.tags;
        
        const aHasCommonTag = aTags && aTags.some((t) => activeTags && activeTags.includes(t));
        const bHasCommonTag = bTags && bTags.some((t) => activeTags && activeTags.includes(t));
        
        if (aHasCommonTag && !bHasCommonTag) return -1;
        if (bHasCommonTag && !aHasCommonTag) return 1;
      }
      return b.claps - a.claps;
    })
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-green-100 selection:text-green-900 flex flex-col justify-between">
      {/* Top Navbar Header */}
      <Header
        currentView={currentView}
        onNavigate={navigateTo}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentUser={currentUser}
        onResetData={handleResetData}
        lang={lang}
        onChangeLang={handleChangeLang}
        t={t}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        onOpenLoginModal={() => setLoginModalOpen(true)}
        authors={registeredUsers}
        onNavigateToAuthorProfile={navigateToAuthorProfile}
      />

      {/* Main Body Layout */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {/* 1. HOME FEED VIEW */}
          {currentView === "feed" && (
            <motion.div
              key="feed-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="mx-auto max-w-7xl px-6 md:px-12 py-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start"
            >
              {/* Personal Profile Header (Replaces the giant Stay Curious hero banner) */}
              {!searchQuery && (
                <div id="home-hero" className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-gray-100 pb-8 lg:pb-4 lg:pr-8 lg:sticky lg:top-24 flex flex-col w-full lg:h-[calc(100vh-8rem)] lg:max-h-[calc(100vh-8rem)] overflow-y-auto">
                  {/* Banner Image */}
                  <div className="relative aspect-[3/1] bg-gray-50 border border-gray-100 overflow-hidden w-full shrink-0">
                    <img
                       src={currentUser.banner || "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80"}
                       alt="Profile Banner"
                       className="h-full w-full object-cover"
                       referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  {/* Avatar row with absolute positioning offset */}
                  <div className="flex justify-between items-end px-1.5 -mt-10 sm:-mt-12 lg:-mt-11 relative z-10">
                    <img
                      src={currentUser.avatar || undefined}
                      alt={currentUser.name}
                      referrerPolicy="no-referrer"
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border-4 border-white shadow-sm shrink-0 bg-white"
                    />
                    
                    {/* Tiny action icon to view full profile */}
                    <button
                      onClick={() => navigateTo("profile")}
                      className="rounded-full border border-gray-200 hover:border-gray-900 text-gray-600 hover:text-black px-3 py-1.5 text-xs font-bold transition-all bg-white shadow-3xs hover:scale-102 active:scale-98"
                    >
                      {t.viewProfile || "View"}
                    </button>
                  </div>

                  {/* Profile info details */}
                  <div className="px-1.5 mt-4 space-y-3">
                    <div>
                      <h1 className="text-xl font-bold text-gray-900 leading-tight flex items-center gap-1">
                        {currentUser.name}
                      </h1>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-sans line-clamp-3">
                      {renderBioWithLinks(currentUser.bio)}
                    </p>

                    {/* Stats metrics - Only Stories published, other stats deleted */}
                    <div className="pt-2 text-xs text-gray-400 font-sans flex flex-col gap-2">
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span>
                          <strong className="text-gray-700 font-bold">{currentUser.followers || 0}</strong> {isZh ? " 位关注者" : " followers"}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span>
                          <strong className="text-gray-700 font-bold">{userPublishedPosts.length}</strong> {isZh ? " 篇故事" : " Stories published"}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span>
                          <strong className="text-gray-700 font-bold">{totalLikesReceived}</strong> {isZh ? " 次获赞" : " Likes received"}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-400 flex items-center gap-1">
                          <span className="text-gray-600 font-semibold">{isZh ? "刚刚" : "Just now"}</span>
                          <span>{isZh ? "最后登录" : " last active"}</span>
                        </span>
                      </span>
                    </div>

                    {currentUser.customLinks && currentUser.customLinks.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 flex flex-col gap-2.5 text-xs">
                        {currentUser.customLinks.map((link, index) => {
                          const href = link.url.startsWith("http://") || link.url.startsWith("https://") 
                            ? link.url 
                            : `https://${link.url}`;
                          return (
                            <div key={index} className="flex flex-col gap-0.5 animate-fade-in">
                              <span className="text-gray-500 font-semibold">{link.text}</span>
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-700 hover:underline flex items-center gap-1 font-medium transition-colors"
                              >
                                <Link2 className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[180px]">{link.url}</span>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Firebase Sync Status widget moved to the bottom of sidebar */}
                  <div className="mt-8 lg:mt-auto pt-4 border-t border-gray-100 flex flex-col gap-2 font-sans w-full">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                      {isZh ? "网站状态" : "Website Status"}
                    </span>
                    
                    {!isFirebaseConfigured ? (
                      <div className="flex items-center gap-2 bg-green-50/50 border border-green-100 rounded-xl p-3 text-xs text-green-850">
                        <span className="h-2 w-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
                        <div className="flex-1">
                          <p className="font-bold text-green-900">{isZh ? "已实时连接" : "Connected in Real-time"}</p>
                          <p className="text-[10px] text-green-700/85 mt-0.5 leading-tight">
                            {isZh 
                              ? "数据已实时连接到本地安全数据库，运行顺畅。" 
                              : "Data is connected to the local secure database in real time."}
                          </p>
                        </div>
                      </div>
                    ) : (firebaseError || !isOnline) ? (
                      <div className="flex flex-col gap-2 bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-850">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                          <p className="font-bold text-rose-900">{isZh ? "连接已断开" : "Connection Lost"}</p>
                        </div>
                        <p className="text-[10px] text-rose-700/90 leading-tight">
                          {isZh 
                            ? "与云端数据库的连接已断开。您的本地数据安全，请检查 network 并尝试重新连接。" 
                            : "Connection to the cloud database has been lost. Your local data is safe, please check your network and try to reconnect."}
                        </p>
                        <button
                          onClick={() => triggerFirebaseSync()}
                          disabled={isSyncingFirebase}
                          className="mt-1 flex items-center justify-center gap-1.5 px-2.5 py-1 bg-white hover:bg-rose-100 disabled:opacity-50 text-rose-700 hover:text-rose-900 font-semibold rounded-lg border border-rose-200 transition-colors cursor-pointer text-[10px] self-start shadow-xs"
                        >
                          <RefreshCw className={`h-2.5 w-2.5 ${isSyncingFirebase ? "animate-spin" : ""}`} />
                          {isZh ? "重新连接" : "Reconnect"}
                        </button>
                      </div>
                    ) : isSyncingFirebase ? (
                      <div className="flex items-center gap-2 bg-green-50/50 border border-green-100 rounded-xl p-3 text-xs text-green-850">
                        <RefreshCw className="h-3 w-3 text-green-600 animate-spin shrink-0" />
                        <div className="flex-1">
                          <p className="font-bold text-green-900">{isZh ? "正在重新连接并同步..." : "Reconnecting and Syncing..."}</p>
                          <p className="text-[10px] text-green-700/85 mt-0.5 leading-tight">
                            {isZh 
                              ? "正在尝试重新建立连接，并同步实时数据..." 
                              : "Attempting to re-establish connection and synchronize live data..."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-green-50/50 border border-green-100 rounded-xl p-3 text-xs text-green-850">
                        <span className="h-2 w-2 rounded-full bg-green-500 shrink-0 animate-ping" />
                        <div className="flex-1">
                          <p className="font-bold text-green-900">{isZh ? "已实时连接" : "Connected in Real-time"}</p>
                          <p className="text-[10px] text-green-700/85 mt-0.5 leading-tight">
                            {isZh 
                              ? "网站已成功实时连接云端，所有文章、点赞与评论均实时同步。" 
                              : "Website is successfully connected to the cloud in real-time. All posts, likes, and comments are synced."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Feed Content */}
              <div className={`space-y-6 pt-4 w-full ${searchQuery ? "lg:col-span-12" : "lg:col-span-8 lg:pl-4"}`}>
                {/* Feed Title */}
                <div className="border-b border-gray-100 pb-3.5 flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-black text-gray-950 font-sans tracking-tight">
                    {isZh ? "帖子" : "Posts"}
                  </h2>
                </div>

                {/* Active Search status */}
                {searchQuery && (
                  <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-4 py-3 rounded-lg border border-gray-100/60">
                    <span>
                      {t.showingResultsFor || "Showing results for: "}{" "}
                      <span>
                        {t.searchLabel || "Search"} <strong>"{searchQuery}"</strong>
                      </span>
                    </span>
                    <button
                      id="clear-filters-btn"
                      onClick={() => {
                        setSearchQuery("");
                      }}
                      className="text-green-700 font-bold hover:underline"
                    >
                      {t.clearFilters || "Clear filters"}
                    </button>
                  </div>
                )}

                {isUserSearch && (
                  <div className="mb-8 space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider font-mono">
                      {isZh ? "匹配的用户" : "Matched Users"}
                    </h3>
                    {matchedAuthors.length === 0 ? (
                      <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-500">
                        {isZh ? "未找到该用户，试试搜索其他名字" : "No users found. Try searching for a different name!"}
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {matchedAuthors.map((author) => {
                          const isFollowed = (currentUser.following || []).includes(author.id);
                          const isSelf = author.id === currentUser.id;
                          return (
                            <div
                              key={author.id}
                              className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start space-x-4 hover:shadow-sm transition-all duration-200"
                            >
                              <img
                                src={author.avatar}
                                alt={author.name}
                                referrerPolicy="no-referrer"
                                className="h-12 w-12 rounded-full border border-gray-100 object-cover shrink-0 cursor-pointer bg-white"
                                onClick={() => navigateToAuthorProfile(author)}
                              />
                              <div className="flex-1 min-w-0">
                                <h4
                                  onClick={() => navigateToAuthorProfile(author)}
                                  className="font-bold text-gray-900 text-sm hover:underline cursor-pointer truncate"
                                >
                                  {author.name}
                                </h4>
                                <p className="text-[10px] font-mono text-gray-400 mb-1.5">
                                  @{author.id}
                                </p>
                                <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                                  {isZh && author.bio_zh ? author.bio_zh : author.bio}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-medium text-gray-400 font-sans">
                                    {author.followers} {isZh ? "关注者" : "followers"}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => navigateToAuthorProfile(author)}
                                      className="px-2.5 py-1 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-150 text-[10px] font-bold text-gray-700 transition-colors cursor-pointer"
                                    >
                                      {isZh ? "主页" : "Profile"}
                                    </button>
                                    {!isSelf && (
                                      <button
                                        onClick={() => handleFollowToggle(author.id)}
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
                                          isFollowed
                                            ? "bg-gray-150 text-gray-700 hover:bg-gray-200"
                                            : "bg-green-600 text-white hover:bg-green-700"
                                        }`}
                                      >
                                        {isFollowed ? (isZh ? "已关注" : "Following") : (isZh ? "关注" : "Follow")}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Articles Stream */}
                <div className="divide-y divide-gray-100">
                  {filteredPosts.length === 0 ? (
                    <div className="py-20 text-center max-w-sm mx-auto space-y-4">
                      <AlertCircle className="h-10 w-10 text-gray-300 mx-auto" />
                      <h3 className="font-bold text-gray-900 text-lg">{t.noStoriesFound || "No stories found"}</h3>
                      <p className="text-sm text-gray-500">
                        {t.noStoriesFoundDesc || "We couldn't find any articles matching your filters. Write one yourself or reset the database!"}
                      </p>
                      <button
                        id="reset-search-btn"
                        onClick={() => {
                          setSearchQuery("");
                        }}
                        className="rounded-full bg-black text-white px-5 py-2 text-xs font-bold hover:bg-neutral-800 transition-colors"
                      >
                        {t.clearFilters || "Clear Filters"}
                      </button>
                    </div>
                  ) : (
                    filteredPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onClick={handleSelectPost}
                        onClap={handleClap}
                        onLike={handleLike}
                        onBookmark={handleBookmark}
                        onDelete={handleDeletePost}
                        onCommentClick={handleCommentClick}
                        isOwnPost={post.author.id === currentUser.id}
                        currentUserId={currentUser.id}
                        lang={lang}
                        onAuthorClick={navigateToAuthorProfile}
                      />
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. READ ARTICLE DETAILED VIEW */}
          {currentView === "article" && activePost && (
            <motion.div
              key="article-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <ArticleView
                post={activePost}
                onBack={() => navigateTo("feed")}
                onClap={handleClap}
                onLike={handleLike}
                onBookmark={handleBookmark}
                onToggleComments={() => setCommentDrawerOpen(!commentDrawerOpen)}
                recommendedPosts={recommendedPosts}
                onSelectPost={handleSelectPost}
                currentUserId={currentUser.id}
                lang={lang}
                t={t}
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                onAddComment={handleAddComment}
                onClapComment={handleClapComment}
                onOpenLoginModal={() => setLoginModalOpen(true)}
                isCommentSectionOpen={commentDrawerOpen}
                onFollowToggle={handleFollowToggle}
                followedAuthorIds={currentUser.following || []}
                onAuthorClick={navigateToAuthorProfile}
              />
            </motion.div>
          )}

          {/* 3. WRITE NEW STORY STORYBOARD */}
          {currentView === "write" && (
            <motion.div
              key="write-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full"
            >
              {isLoggedIn ? (
                <WriteView onBack={() => navigateTo("feed")} onPublish={handlePublishStory} lang={lang} t={t} />
              ) : (
                <div className="mx-auto max-w-xl px-6 py-16 text-center animate-fade-in">
                  <div className="rounded-2xl border border-gray-200 bg-neutral-50 p-8 shadow-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-800 mb-4">
                      <Lock className="h-6 w-6" />
                    </div>
                    <h2 className="serif-heading text-2xl font-extrabold text-neutral-900 tracking-tight">
                      {isZh ? "需要登录验证才能发帖" : "Verification Required to Write"}
                    </h2>
                    <p className="text-sm text-neutral-500 mt-2 leading-relaxed font-sans">
                      {isZh
                        ? "您当前处于未登录游客状态。所有发帖、编辑个人主页或修改信息都需要登录验证后才能进行显示和操作。"
                        : "You are currently in guest mode. All posting, profile edits, and information modifications require an active verified login to show and operate."}
                    </p>

                    <div className="mt-6 p-4 rounded-xl bg-white border border-gray-200 text-left">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-sans">
                        {isZh ? "专属临时登录凭证" : "Your Guest Login Credential"}
                      </p>
                      <div className="flex items-center justify-between gap-2 p-3 bg-neutral-50 rounded-lg border border-neutral-100 font-mono text-sm font-bold text-neutral-800">
                        <span>{tempCredential}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(tempCredential);
                            showToast(isZh ? "凭证已成功复制到剪贴板！" : "Credential copied to clipboard!");
                          }}
                          className="text-xs text-neutral-500 hover:text-black font-bold font-sans hover:underline"
                        >
                          {isZh ? "复制" : "Copy"}
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-2 leading-normal">
                        {isZh
                          ? "💡 请妥善保存此凭证，您可以在任何设备上使用它进行后续登录。激活后，系统将为您生成全局唯一的递增 UID 账号！"
                          : "💡 Please save this credential. You can use it to log in subsequently on any device. Once verified, a unique sequential UID will be issued to your account!"}
                      </p>
                    </div>

                    <div className="mt-6 space-y-3">
                      <button
                        onClick={() => handleLogin(tempCredential)}
                        className="w-full rounded-full bg-green-600 hover:bg-green-700 text-white py-2.5 text-sm font-bold transition-all active:scale-98 shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-4 w-4" />
                        <span>{isZh ? "使用当前临时凭证激活并登录" : "Verify & Activate with Temp Credential"}</span>
                      </button>

                      <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink mx-4 text-xs text-gray-400 font-medium">
                          {isZh ? "或使用已有凭证登录" : "Or use existing credential"}
                        </span>
                        <div className="flex-grow border-t border-gray-200"></div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={isZh ? "请输入已有登录凭证 (如: MDB-X7R9KA)" : "Enter existing credential..."}
                          value={inputCredential}
                          onChange={(e) => setInputCredential(e.target.value)}
                          className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-800 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/5 transition-colors font-mono"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleLogin();
                          }}
                        />
                        <button
                          onClick={() => handleLogin()}
                          className="rounded-full bg-neutral-950 hover:bg-black text-white px-5 py-2 text-sm font-bold transition-all active:scale-98 shrink-0"
                        >
                          {isZh ? "验证" : "Verify"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 4. BOOKMARKS LISTED VIEW */}
          {currentView === "bookmarks" && (
            <motion.div
              key="bookmarks-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="mx-auto max-w-2xl px-6 py-12 space-y-8"
            >
              <div className="border-b border-gray-100 pb-5">
                <h1 className="serif-heading text-3xl font-extrabold text-gray-900 tracking-tight flex items-center space-x-3">
                  <Bookmark className="h-7 w-7 text-amber-500 fill-amber-100" />
                  <span>{t.yourBookmarks || "Your Bookmarks"}</span>
                </h1>
                <p className="text-gray-500 text-sm mt-1">{t.bookmarksDesc || "Stories you saved to read later."}</p>
              </div>

              <div className="divide-y divide-gray-100">
                {bookmarkedPosts.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <Bookmark className="h-12 w-12 text-gray-200 mx-auto" />
                    <h3 className="font-bold text-gray-900 text-lg">{t.noBookmarks || "No bookmarks saved yet"}</h3>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto">
                      {t.noBookmarksDesc || "Click the bookmark icon on any story in the feed to save them here for offline reading."}
                    </p>
                    <button
                      id="browse-stories-bookmarks"
                      onClick={() => navigateTo("feed")}
                      className="rounded-full bg-black text-white px-5 py-2 text-xs font-bold hover:bg-neutral-800 transition-colors"
                    >
                      {t.browseStories || "Browse Stories"}
                    </button>
                  </div>
                ) : (
                  bookmarkedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onClick={handleSelectPost}
                      onClap={handleClap}
                      onLike={handleLike}
                      onBookmark={handleBookmark}
                      onDelete={handleDeletePost}
                      onCommentClick={handleCommentClick}
                      isOwnPost={post.author.id === currentUser.id}
                      currentUserId={currentUser.id}
                      lang={lang}
                      onAuthorClick={navigateToAuthorProfile}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* 5. USER PROFILE STATS VIEW */}
          {currentView === "profile" && (
            <motion.div
              key="profile-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6"
            >
              {/* Twitter Style Header Row */}
              <div className="flex items-center space-x-4 pb-2 border-b border-gray-100">
                <button
                  onClick={() => navigateTo("feed")}
                  className="p-2 rounded-full hover:bg-neutral-100 text-neutral-700 hover:text-black transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-xl font-black text-neutral-900 leading-tight">
                    {isEditingProfile ? (t.editProfile || "Edit Profile") : profileAuthor.name}
                  </h2>
                  <p className="text-xs text-neutral-400 font-sans">
                    {isEditingProfile ? (t.avatarPresetLabel || "Customize your presence") : `${profilePublishedPosts.length} ${isZh ? "篇故事" : "Stories"}`}
                  </p>
                </div>
              </div>

              {/* Profile Card Container */}
              {isEditingProfile ? (
                <div className="relative pb-6 space-y-6">
                  {/* Banner with edit hover overlay */}
                  <div className="aspect-[3/1] w-full relative bg-gray-50 group overflow-hidden border border-gray-100 shadow-3xs">
                    <img
                      src={editBanner || undefined}
                      alt="Banner preview"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {/* Hover overlay to upload banner */}
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                      <label className="cursor-pointer bg-white hover:bg-neutral-50 text-gray-800 text-xs font-semibold px-4 py-2 rounded-full shadow-md flex items-center space-x-1.5 transition-all transform hover:scale-105 active:scale-95">
                        <Upload className="h-3.5 w-3.5 text-gray-700" />
                        <span>{t.uploadImage || "Upload Banner"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "banner")}
                        />
                      </label>
                      <p className="text-[10px] text-white/80 mt-1.5">{t.uploadImageHint || "Choose an image file"}</p>
                    </div>
                  </div>

                  {/* Profile content layout - same offset structure as displaying */}
                  <div className="px-6 md:px-8 pt-0 flex flex-col items-start -mt-12 sm:-mt-16 relative z-10 gap-6 w-full">
                    {/* Avatar Block with Edit Trigger */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full">
                      <div className="relative group/avatar shrink-0">
                        <img
                          src={editAvatar || undefined}
                          alt="Avatar preview"
                          className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border-4 border-white shadow-md bg-white"
                          referrerPolicy="no-referrer"
                        />
                        {/* Hover Overlay to edit avatar */}
                        <label className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer transition-opacity duration-200">
                          <Upload className="h-4 w-4 text-white" />
                          <span className="text-[9px] text-white font-medium mt-0.5">{t.uploadImage || "Upload"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, "avatar")}
                          />
                        </label>
                      </div>

                      <div className="flex-1 space-y-0.5 sm:mb-2">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5">
                          <Sparkles className="h-4 w-4 text-green-600" />
                          <span>{t.editProfile || "Edit Profile"}</span>
                        </h2>
                        <p className="text-xs text-gray-400">
                          {t.avatarPresetLabel || "Customize your profile avatar and banner"}
                        </p>
                      </div>
                    </div>

                    {/* Presets Grid */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* Banner Presets */}
                      <div className="space-y-3 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                          {t.bannerPresetLabel || "Select preset banner"}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {BANNER_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setEditBanner(preset.url)}
                              className={`relative h-10 w-20 rounded-md overflow-hidden border-2 transition-all duration-150 shrink-0 ${
                                editBanner === preset.url ? "border-green-600 ring-2 ring-green-100 scale-102" : "border-gray-200 hover:border-gray-400"
                              }`}
                              title={preset.name}
                            >
                              <img src={preset.url} alt={preset.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                          ))}
                        </div>
                        <div className="pt-1">
                          <input
                            type="text"
                            placeholder={t.customBannerPlaceholder || "Or paste custom banner URL..."}
                            value={editBanner}
                            onChange={(e) => setEditBanner(e.target.value)}
                            className="w-full text-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 outline-none focus:border-green-600 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Avatar Presets */}
                      <div className="space-y-3 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                          {t.avatarPresetLabel || "Select preset avatar"}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {AVATAR_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setEditAvatar(preset.url)}
                              className={`relative h-10 w-10 rounded-full overflow-hidden border-2 transition-all duration-150 shrink-0 ${
                                editAvatar === preset.url ? "border-green-600 ring-2 ring-green-100 scale-105" : "border-gray-200 hover:border-gray-400"
                              }`}
                              title={preset.name}
                            >
                              <img src={preset.url} alt={preset.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                          ))}
                        </div>
                        <div className="pt-1">
                          <input
                            type="text"
                            placeholder={t.customAvatarPlaceholder || "Or paste custom avatar URL..."}
                            value={editAvatar}
                            onChange={(e) => setEditAvatar(e.target.value)}
                            className="w-full text-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 outline-none focus:border-green-600 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Standard Inputs (Name & Bio) */}
                    <div className="w-full space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                          {t.editName || "Name"}
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={40}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                            {t.editBio || "Bio / Description"}
                          </label>
                          <span className="text-[10px] text-gray-400 font-sans">
                            {editBio.length}/160
                          </span>
                        </div>
                        <textarea
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          maxLength={160}
                          rows={3}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all resize-none"
                        />
                      </div>


                      {/* Custom Links Management */}
                      <div className="space-y-3 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                            {isZh ? "社交与自定义链接" : "Social & Custom Links"}
                          </label>
                          <button
                            type="button"
                            onClick={() => setEditCustomLinks([...editCustomLinks, { text: "", url: "" }])}
                            className="text-xs text-green-600 hover:text-green-700 font-bold flex items-center gap-1 hover:underline"
                          >
                            <span>+ {isZh ? "添加链接" : "Add Link"}</span>
                          </button>
                        </div>

                        {editCustomLinks.length === 0 ? (
                          <p className="text-xs text-gray-400 italic font-sans py-1">
                            {isZh ? "暂无自定义链接。点击右上角“添加链接”即可添加。" : "No custom links added. Click 'Add Link' to get started."}
                          </p>
                        ) : (
                          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                            {editCustomLinks.map((link, index) => (
                              <div key={index} className="flex items-center gap-2 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                                <div className="grid grid-cols-2 gap-2 flex-1">
                                  <input
                                    type="text"
                                    placeholder={isZh ? "链接文字 (如: GitHub)" : "Link text (e.g. GitHub)"}
                                    value={link.text}
                                    onChange={(e) => {
                                      const updated = [...editCustomLinks];
                                      updated[index] = { ...updated[index], text: e.target.value };
                                      setEditCustomLinks(updated);
                                    }}
                                    className="text-xs rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-gray-800 outline-none focus:border-green-600 transition-colors"
                                  />
                                  <input
                                    type="text"
                                    placeholder={isZh ? "链接地址 (如: github.com/...)" : "Link URL (e.g. github.com/...)"}
                                    value={link.url}
                                    onChange={(e) => {
                                      const updated = [...editCustomLinks];
                                      updated[index] = { ...updated[index], url: e.target.value };
                                      setEditCustomLinks(updated);
                                    }}
                                    className="text-xs rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-gray-800 outline-none focus:border-green-600 transition-colors"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = editCustomLinks.filter((_, idx) => idx !== index);
                                    setEditCustomLinks(updated);
                                  }}
                                  className="text-neutral-400 hover:text-red-500 p-1.5 transition-colors text-xs font-bold"
                                  title={isZh ? "删除" : "Delete"}
                                >
                                  {isZh ? "删除" : "Delete"}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons matching the layout */}
                    <div className="w-full flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="rounded-full border border-gray-200 hover:border-gray-900 px-5 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-all active:scale-95 bg-white"
                      >
                        {t.cancel || "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        className="rounded-full bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 text-xs font-bold transition-all active:scale-95 shadow-sm"
                      >
                        {t.saveChanges || "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative pb-4">
                  {/* Banner image */}
                  <div className="aspect-[3/1] w-full relative bg-gray-50 border border-gray-100 overflow-hidden shadow-3xs">
                    <img
                      src={profileAuthor.banner || "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80"}
                      alt="Profile banner"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Profile content layout with absolute avatar overlapping and action buttons */}
                  <div className="px-6 sm:px-8 flex justify-between items-start -mt-12 sm:-mt-16 relative z-10">
                    <img
                      src={profileAuthor.avatar || undefined}
                      alt={profileAuthor.name}
                      referrerPolicy="no-referrer"
                      className="h-24 w-24 sm:h-32 sm:w-32 rounded-full object-cover border-4 border-white shadow-md shrink-0 bg-white"
                    />

                    {!isOwnProfile ? (
                      <div className="flex items-center space-x-2.5 pt-3 sm:pt-4">
                        <button
                          onClick={() => handleFollowToggle(profileAuthor.id)}
                          className={`rounded-full px-5 py-2 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-3xs hover:scale-102 active:scale-98 ${
                            (currentUser.following || []).includes(profileAuthor.id)
                              ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                              : "bg-black text-white hover:bg-neutral-800"
                          }`}
                        >
                          {(currentUser.following || []).includes(profileAuthor.id) ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>{t.following || "Following"}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              <span>{t.follow || "Follow"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : isLoggedIn ? (
                      <div className="flex items-center space-x-2.5 pt-3 sm:pt-4">
                        <button
                          id="profile-edit-settings-btn"
                          onClick={() => {
                            setEditName(currentUser.name);
                            setEditBio(currentUser.bio);
                            setEditAvatar(currentUser.avatar);
                            setEditBanner(currentUser.banner || "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80");
                            setEditCustomLinks(currentUser.customLinks || []);
                            setIsEditingProfile(true);
                          }}
                          className="rounded-full border border-gray-200 hover:border-gray-900 text-gray-700 hover:text-black px-4 py-2 text-xs font-bold transition-all flex items-center space-x-1.5 bg-white shadow-3xs hover:scale-102 active:scale-98"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>{t.editProfile || "Edit Profile"}</span>
                        </button>

                        <button
                          id="profile-write-story-btn"
                          onClick={() => navigateTo("write")}
                          className="rounded-full bg-black text-white px-5 py-2 text-xs font-bold hover:bg-neutral-800 transition-all flex items-center space-x-1.5 shadow-3xs hover:scale-102 active:scale-98"
                        >
                          <span>{t.writeAStory || "Write a Story"}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2.5 pt-3 sm:pt-4">
                        <span className="text-xs px-2.5 py-1 bg-neutral-100 text-neutral-500 border border-neutral-200/60 rounded-md font-sans font-medium">
                          {isZh ? "未验证游客模式" : "Guest Mode"}
                        </span>
                        <button
                          onClick={() => setLoginModalOpen(true)}
                          className="rounded-full bg-neutral-900 hover:bg-black text-white px-4 py-2 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-3xs hover:scale-102 active:scale-98"
                        >
                          <Key className="h-3.5 w-3.5" />
                          <span>{t.loginButton || "Verify & Log In"}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Detailed user stats and metadata */}
                  <div className="px-6 sm:px-8 mt-4 space-y-3">
                    <div>
                      <h1 className="text-2xl font-black text-neutral-900 leading-none">
                        {profileAuthor.name}
                      </h1>
                      <p className="text-xs sm:text-sm text-neutral-400 font-mono mt-1.5 flex flex-wrap items-center gap-2">
                        <span>@{profileAuthor.name.toLowerCase().replace(/\s+/g, "")}</span>
                      </p>
                    </div>

                    <p className="text-sm sm:text-base text-neutral-700 leading-relaxed font-sans max-w-2xl">
                      {renderBioWithLinks(profileAuthor.bio)}
                    </p>

                    <div className="flex items-center space-x-4 text-xs sm:text-sm text-neutral-500 font-sans pt-1 pb-1">
                      <span>
                        <strong className="text-neutral-800 font-bold">{profileAuthor.followers || 0}</strong> {isZh ? "位关注者" : "followers"}
                      </span>
                      <span className="text-neutral-300">·</span>
                      <span>
                        <strong className="text-neutral-800 font-bold">{(profileAuthor.following || []).length}</strong> {isZh ? "正在关注" : "following"}
                      </span>
                    </div>

                    {profileAuthor.customLinks && profileAuthor.customLinks.length > 0 && (
                      <div className="pt-3 flex flex-col gap-2.5 text-xs sm:text-sm border-t border-neutral-100">
                        {profileAuthor.customLinks.map((link, index) => {
                          const href = link.url.startsWith("http://") || link.url.startsWith("https://") 
                            ? link.url 
                            : `https://${link.url}`;
                          return (
                            <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 animate-fade-in">
                              <span className="font-semibold text-neutral-500 min-w-[80px]">{link.text}</span>
                              <a
                                key={index}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-700 hover:underline flex items-center gap-1 font-medium transition-colors"
                              >
                                <Link2 className="h-4 w-4 text-green-600 shrink-0" />
                                <span>{link.url}</span>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Twitter-style Tab System */}
                  <div className="flex border-b border-gray-100 mt-6 px-2">
                    <button
                      onClick={() => setProfileTab("published")}
                      className={`flex-1 text-center py-3 text-xs sm:text-sm font-extrabold border-b-2 transition-all relative ${
                        profileTab === "published"
                          ? "border-green-600 text-neutral-900"
                          : "border-transparent text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50/50"
                      }`}
                    >
                      <span>{isZh ? "发表的故事" : "Published Stories"} ({profilePublishedPosts.length})</span>
                      {profileTab === "published" && (
                        <motion.div
                          layoutId="activeProfileTabBorder"
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-green-600"
                        />
                      )}
                    </button>
                    <button
                      onClick={() => setProfileTab("appreciated")}
                      className={`flex-1 text-center py-3 text-xs sm:text-sm font-extrabold border-b-2 transition-all relative ${
                        profileTab === "appreciated"
                          ? "border-green-600 text-neutral-900"
                          : "border-transparent text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50/50"
                      }`}
                    >
                      <span>{isZh ? "赞赏的故事" : "Appreciated Stories"} ({profileClappedPosts.length})</span>
                      {profileTab === "appreciated" && (
                        <motion.div
                          layoutId="activeProfileTabBorder"
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-green-600"
                        />
                      )}
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="px-4 sm:px-6 pt-4">
                    {profileTab === "published" ? (
                      <div className="divide-y divide-gray-100">
                        {profilePublishedPosts.length === 0 ? (
                          <div className="py-14 text-center space-y-4">
                            <User className="h-10 w-10 text-gray-300 mx-auto" />
                            <p className="text-sm text-gray-400">
                              {isOwnProfile
                                ? (t.noPublishedStories || "You haven't written any stories yet.")
                                : (isZh ? "该作者尚未发表任何故事。" : "This author hasn't written any stories yet.")}
                            </p>
                            {isOwnProfile && (
                              <button
                                id="profile-start-writing-btn"
                                onClick={() => navigateTo("write")}
                                className="rounded-full border border-gray-200 hover:border-gray-900 text-xs font-bold px-4 py-1.5 transition-colors"
                              >
                                {t.writeFirstArticle || "Write your first article"}
                              </button>
                            )}
                          </div>
                        ) : (
                          profilePublishedPosts.map((post) => (
                            <PostCard
                              key={post.id}
                              post={post}
                              onClick={handleSelectPost}
                              onClap={handleClap}
                              onLike={handleLike}
                              onBookmark={handleBookmark}
                              onDelete={handleDeletePost}
                              onCommentClick={handleCommentClick}
                              isOwnPost={post.author.id === currentUser.id}
                              currentUserId={currentUser.id}
                              lang={lang}
                              onAuthorClick={navigateToAuthorProfile}
                            />
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {profileClappedPosts.length === 0 ? (
                          <div className="py-14 text-center">
                            <Heart className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">
                              {isOwnProfile
                                ? (t.noAppreciatedStories || "Clap for articles you enjoy in the feed, and they will show up here.")
                                : (isZh ? "该作者尚未赞赏过任何故事。" : "This author hasn't appreciated any stories yet.")}
                            </p>
                          </div>
                        ) : (
                          profileClappedPosts.map((post) => (
                            <PostCard
                              key={post.id}
                              post={post}
                              onClick={handleSelectPost}
                              onClap={handleClap}
                              onLike={handleLike}
                              onBookmark={handleBookmark}
                              onDelete={handleDeletePost}
                              onCommentClick={handleCommentClick}
                              isOwnPost={post.author.id === currentUser.id}
                              currentUserId={currentUser.id}
                              lang={lang}
                              onAuthorClick={navigateToAuthorProfile}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Footer */}
      <footer className="w-full py-8 border-t border-gray-100 bg-gray-50/50 mt-12">
        <div className="mx-auto max-w-7xl px-6 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 font-sans">
          <p>{t.footerText || "© 2026 Griffiner. Built with absolute clarity."}</p>
          <p className="hover:underline cursor-pointer">{t.footerLinks || "Terms · Privacy · Writer Help"}</p>
        </div>
      </footer>

      {/* 6. RESPONSES COMMENT SIDEBAR PANEL */}
      <AnimatePresence>
        {commentDrawerOpen && activePost && currentView !== "article" && (
          <CommentDrawer
            isOpen={commentDrawerOpen}
            onClose={() => setCommentDrawerOpen(false)}
            comments={activePost.comments}
            onAddComment={handleAddComment}
            currentUser={currentUser}
            onClapComment={handleClapComment}
            lang={lang}
            t={t}
            isLoggedIn={isLoggedIn}
            onOpenLoginModal={() => setLoginModalOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* 7. VERIFICATION LOGIN MODAL */}
      <AnimatePresence>
        {loginModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setLoginModalOpen(false);
                setInputCredential("");
              }}
              className="absolute inset-0 bg-black/45 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-gray-150 z-10"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="serif-heading text-xl font-extrabold text-neutral-900 flex items-center gap-2">
                    <Key className="h-5 w-5 text-neutral-800" />
                    <span>{isZh ? "登录验证" : "Login Verification"}</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    {isZh 
                      ? "所有发帖、编辑个人主页或修改信息都需要登录验证" 
                      : "Verification is required to publish stories and edit profile."}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setLoginModalOpen(false);
                    setInputCredential("");
                  }}
                  className="text-neutral-400 hover:text-black p-1 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Guest / Temp Credential Hint */}
              <div className="mb-5 p-4 bg-neutral-50 rounded-xl border border-neutral-100 text-left">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 font-sans">
                  {isZh ? "您的临时登录凭证" : "Your Guest Login Credential"}
                </p>
                <div className="flex items-center justify-between gap-1.5 bg-white p-2.5 rounded-lg border border-neutral-200 font-mono text-xs font-bold text-neutral-800">
                  <span>{tempCredential}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tempCredential);
                      showToast(isZh ? "凭证已成功复制！" : "Credential copied!");
                    }}
                    className="text-[10px] text-neutral-500 hover:text-black font-bold font-sans hover:underline shrink-0"
                  >
                    {isZh ? "复制" : "Copy"}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 leading-normal">
                  {isZh
                    ? "💡 点击下方按钮，一键使用当前临时凭证激活并登录。激活后即可获得唯一的递增 UID 账号！"
                    : "💡 Use the button below to instantly activate this credential. Once logged in, your sequential UID starts."}
                </p>

                <button
                  type="button"
                  onClick={() => handleLogin(tempCredential, true)}
                  className="w-full mt-3 rounded-xl bg-green-600 hover:bg-green-700 text-white py-2 text-xs font-bold transition-all active:scale-98 shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{isZh ? "一键登录（同时下载登录txt凭证）" : "One-click Login (Download TXT Credential)"}</span>
                </button>
              </div>

              {/* Enter existing credential option */}
              <div className="space-y-3">
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-gray-400 font-medium">
                    {isZh ? "使用已有登录凭证" : "Use existing credential"}
                  </span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={isZh ? "请输入已有登录凭证" : "Enter credential..."}
                    value={inputCredential}
                    onChange={(e) => setInputCredential(e.target.value)}
                    className="flex-grow rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-850 outline-none focus:border-neutral-900 font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLogin();
                    }}
                  />
                  <button
                    onClick={() => handleLogin()}
                    className="rounded-full bg-neutral-950 hover:bg-black text-white px-4 py-2 text-xs font-bold transition-all active:scale-98 shrink-0"
                  >
                    {isZh ? "验证" : "Verify"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-gray-950 text-white rounded-2xl px-5 py-3.5 shadow-2xl flex items-center gap-2.5 max-w-sm text-xs font-sans border border-gray-800"
          >
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>



    </div>
  );
}
