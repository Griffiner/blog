import { Post, Author } from "./types";

export const AUTHORS: Record<string, Author> = {
  sarah: {
    id: "sarah",
    name: "Sarah Jenkins",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    bio: "Lead UI/UX Designer. Obsessed with clean layouts, elegant typography, and digital minimalism.",
    bio_zh: "资深 UI/UX 设计师。专注于极致干净的布局、优雅的排版和数字极简主义。",
    followers: 12400,
  },
  alex: {
    id: "alex",
    name: "Alex Rivera",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    bio: "Full-stack developer, open source contributor, and tech writer. Love exploring new frontend paradigms.",
    bio_zh: "全栈开发工程师、开源贡献者和技术作家。热衷于探索全新的前端技术范式。",
    followers: 8900,
  },
  marcus: {
    id: "marcus",
    name: "Marcus Aurelius Chen",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    bio: "Software architect and philosopher. Writing about the intersection of technology, consciousness, and human creativity.",
    bio_zh: "软件架构师与思想者。撰写关于技术、意识与人类创造力交汇点的文章。",
    followers: 24500,
  },
};

export const INITIAL_POSTS: Post[] = [];

export function getStoredPosts(): Post[] {
  const initialized = localStorage.getItem("medium_blog_initialized");
  const data = localStorage.getItem("medium_blog_posts");
  
  if (!initialized) {
    localStorage.setItem("medium_blog_initialized", "true");
    localStorage.setItem("medium_blog_posts", JSON.stringify(INITIAL_POSTS));
    return INITIAL_POSTS;
  }
  
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveStoredPosts(posts: Post[]) {
  localStorage.setItem("medium_blog_posts", JSON.stringify(posts));
}
