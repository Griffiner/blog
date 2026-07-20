import React from "react";
import { ThumbsUp, Bookmark, MessageSquare, Trash2, Heart } from "lucide-react";
import { Post, Author } from "../types";
import { motion } from "motion/react";

interface PostCardProps {
  key?: any;
  post: Post;
  onClick: (postId: string) => void;
  onClap: (postId: string, e?: React.MouseEvent) => void;
  onLike?: (postId: string, e?: React.MouseEvent) => void;
  onBookmark: (postId: string, e?: React.MouseEvent) => void;
  onDelete?: (postId: string, e?: React.MouseEvent) => void;
  onCommentClick?: (postId: string, e?: React.MouseEvent) => void;
  isOwnPost?: boolean;
  currentUserId?: string;
  lang?: "en" | "zh";
  onAuthorClick?: (author: Author) => void;
}

export default function PostCard({
  post,
  onClick,
  onClap,
  onLike,
  onBookmark,
  onDelete,
  onCommentClick,
  isOwnPost = false,
  currentUserId,
  lang = "en",
  onAuthorClick,
}: PostCardProps) {
  const isZh = lang === "zh";
  const displayTitle = isZh && post.title_zh ? post.title_zh : post.title;
  const displaySubtitle = isZh && post.subtitle_zh ? post.subtitle_zh : post.subtitle;
  
  const getDisplayPublishedAt = () => {
    let date: Date | null = null;
    if (post.id.startsWith("post_")) {
      const ts = parseInt(post.id.substring(5));
      if (!isNaN(ts)) {
        date = new Date(ts);
      }
    }
    
    if (!date) {
      const parsed = Date.parse(post.publishedAt);
      if (!isNaN(parsed)) {
        date = new Date(parsed);
      }
    }

    if (!date) {
      return isZh && post.publishedAt_zh ? post.publishedAt_zh : post.publishedAt;
    }

    if (isZh) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const hr = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      return `${y}年${m}月${d}日 ${hr}:${min}`;
    } else {
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };
  const displayPublishedAt = getDisplayPublishedAt();

  const displayReadTime = isZh && post.readTime_zh ? post.readTime_zh : post.readTime;
  const displayTags = isZh && post.tags_zh ? post.tags_zh : post.tags;
  const displayContent = isZh && post.content_zh ? post.content_zh : post.content;

  const likesCount = post.likes || 0;
  const isLiked = currentUserId ? (post.likedBy || []).includes(currentUserId) : false;

  const hasTitle =
    post.title &&
    post.title.trim() !== "" &&
    post.title.trim() !== "无标题文章" &&
    post.title.trim() !== "Untitled Story";

  return (
    <article
      id={`post-card-${post.id}`}
      className="group border-b border-gray-100 py-6 md:py-8 transition-colors duration-150"
    >
      <div className="flex flex-col space-y-3.5">
        {/* Author Metadata */}
        <div className="flex items-center space-x-2.5 text-xs text-gray-500">
          <img
            src={post.author.avatar || undefined}
            alt={post.author.name}
            referrerPolicy="no-referrer"
            className="h-6 w-6 rounded-full object-cover border border-gray-50 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onAuthorClick && onAuthorClick(post.author);
            }}
          />
          <span
            className="font-medium text-gray-800 hover:underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onAuthorClick && onAuthorClick(post.author);
            }}
          >
            {post.author.name}
          </span>
          <span>·</span>
          <span>{displayPublishedAt}</span>
        </div>

        {/* Content Layout */}
        {hasTitle ? (
          <div className="flex justify-between items-start space-x-6">
            {/* Text block */}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onClick(post.id)}>
              <h3 className="serif-heading text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-gray-900 group-hover:text-gray-700 transition-colors line-clamp-2 leading-tight md:leading-snug mb-2">
                {displayTitle}
              </h3>
              <p className="hidden sm:block text-sm md:text-base font-normal text-gray-500 line-clamp-2 leading-relaxed mb-4">
                {displaySubtitle}
              </p>
            </div>

            {/* Optional Cover Image Thumbnail */}
            {post.coverImage && (
              <div
                className="w-20 h-20 sm:w-32 sm:h-20 md:w-40 md:h-28 overflow-hidden rounded-lg bg-gray-50 flex-shrink-0 cursor-pointer shadow-xs border border-gray-100"
                onClick={() => onClick(post.id)}
              >
                <img
                  src={post.coverImage || undefined}
                  alt={displayTitle}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transform group-hover:scale-[1.02] transition-transform duration-300"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col space-y-3">
            {/* Optional Cover Image Banner */}
            {post.coverImage && (
              <div
                className="w-full aspect-[2.5/1] sm:aspect-[3/1] max-h-56 overflow-hidden rounded-xl bg-gray-50 cursor-pointer border border-gray-100 shadow-3xs"
                onClick={() => onClick(post.id)}
              >
                <img
                  src={post.coverImage || undefined}
                  alt="Cover image"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            {/* Expanded Content Block */}
            <div
              className="article-body font-serif text-sm sm:text-base md:text-lg leading-relaxed text-gray-800 space-y-4 max-w-none cursor-pointer hover:text-gray-950 transition-colors"
              onClick={() => onClick(post.id)}
              dangerouslySetInnerHTML={{ __html: displayContent }}
            />
          </div>
        )}

        {/* Card Footer Actions */}
        <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            {/* Tags display */}
            <div className="flex flex-wrap gap-1">
              {displayTags && displayTags.map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500 border border-gray-100">
                  #{tag}
                </span>
              ))}
            </div>
            <span className="hidden sm:inline-block">{displayReadTime}</span>
            <span>·</span>
            
            {/* Likes Action */}
            <button
              id={`like-btn-${post.id}`}
              onClick={(e) => onLike && onLike(post.id, e)}
              className={`flex items-center space-x-1.5 transition-colors p-1 rounded-md hover:bg-gray-50 cursor-pointer ${
                isLiked ? "text-green-600 font-semibold" : "text-gray-500 hover:text-gray-900"
              }`}
              title={isZh ? "点赞" : "Like"}
            >
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                animate={isLiked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={{
                  scale: {
                    type: isLiked ? "tween" : "spring",
                    duration: 0.3,
                    ease: "easeOut"
                  }
                }}
                className="flex items-center"
              >
                <ThumbsUp className={`h-4 w-4 ${isLiked ? "fill-green-100 text-green-600" : ""}`} />
              </motion.div>
              <span>{likesCount}</span>
            </button>

            {/* Comments Counter */}
            <button
              onClick={(e) => onCommentClick && onCommentClick(post.id, e)}
              className="flex items-center space-x-1 p-1 rounded-md text-gray-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors cursor-pointer"
              title={isZh ? "添加或查看评论" : "Add or view comments"}
            >
              <MessageSquare className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              <span>{post.comments.length}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Delete button (only if it's the user's own post) */}
            {isOwnPost && onDelete && (
              <button
                id={`delete-btn-${post.id}`}
                onClick={(e) => onDelete(post.id, e)}
                title={isZh ? "删除故事" : "Delete article"}
                className="p-1 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {/* Bookmark Action */}
            <button
              id={`bookmark-btn-${post.id}`}
              onClick={(e) => onBookmark(post.id, e)}
              className={`p-1.5 rounded-md hover:bg-gray-50 transition-colors ${
                post.isBookmarked ? "text-amber-500 hover:text-amber-600" : "text-gray-400 hover:text-gray-900"
              }`}
              title={
                post.isBookmarked
                  ? isZh
                    ? "取消收藏"
                    : "Remove from bookmarks"
                  : isZh
                  ? "加入书签"
                  : "Save for later"
              }
            >
              <Bookmark className={`h-4 w-4 ${post.isBookmarked ? "fill-amber-400 text-amber-500" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
