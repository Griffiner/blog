export interface Author {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  bio_zh?: string;
  followers: number;
  banner?: string;
  customLinks?: { text: string; url: string }[];
}

export interface Comment {
  id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  content_zh?: string;
  createdAt: string;
  createdAt_zh?: string;
  claps: number;
}

export interface Post {
  id: string;
  title: string;
  title_zh?: string;
  subtitle: string;
  subtitle_zh?: string;
  content: string; // HTML format
  content_zh?: string;
  coverImage?: string;
  author: Author;
  publishedAt: string;
  publishedAt_zh?: string;
  readTime: string;
  readTime_zh?: string;
  category?: string;
  category_zh?: string;
  claps: number;
  likes?: number;
  likedBy?: string[];
  comments: Comment[];
  isBookmarked?: boolean;
  isClapped?: boolean;
  tags: string[];
  tags_zh?: string[];
}

export interface Category {
  id: string;
  name: string;
  name_zh?: string;
}
