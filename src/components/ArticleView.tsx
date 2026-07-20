import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, ThumbsUp, MessageSquare, Bookmark, Share2, Plus, Check, Heart, X, Lock } from "lucide-react";
import { Post, Author, Comment } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { renderBioWithLinks } from "../utils/linkify";

interface ArticleViewProps {
  post: Post;
  onBack: () => void;
  onClap: (postId: string) => void;
  onLike?: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onToggleComments: () => void;
  recommendedPosts: Post[];
  onSelectPost: (postId: string) => void;
  lang?: "en" | "zh";
  t?: any;
  currentUserId?: string;
  isLoggedIn?: boolean;
  currentUser?: { name: string; avatar: string };
  onAddComment?: (text: string) => void;
  onClapComment?: (commentId: string) => void;
  onOpenLoginModal?: () => void;
  isCommentSectionOpen?: boolean;
  onFollowToggle?: (authorId: string) => void;
  followedAuthorIds?: string[];
  onAuthorClick?: (author: Author) => void;
}

interface ClapBubble {
  id: number;
  x: number;
  y: number;
}

export default function ArticleView({
  post,
  onBack,
  onClap,
  onLike,
  onBookmark,
  onToggleComments,
  recommendedPosts,
  onSelectPost,
  lang = "en",
  t = {},
  currentUserId,
  isLoggedIn = false,
  currentUser,
  onAddComment,
  onClapComment,
  onOpenLoginModal,
  isCommentSectionOpen = false,
  onFollowToggle,
  followedAuthorIds = [],
  onAuthorClick,
}: ArticleViewProps) {
  const isFollowed = followedAuthorIds.includes(post.author.id);
  const followerCount = post.author.followers;
  const [clapBubbles, setClapBubbles] = useState<ClapBubble[]>([]);
  const [bubbleId, setBubbleId] = useState(0);
  const [isShareTooltipVisible, setIsShareTooltipVisible] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const commentsSectionRef = useRef<HTMLDivElement>(null);

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

  const getDisplayCommentTime = (comment: Comment) => {
    let date: Date | null = null;
    if (comment.id.startsWith("comment_")) {
      const ts = parseInt(comment.id.substring(8));
      if (!isNaN(ts)) {
        date = new Date(ts);
      }
    }
    
    if (!date) {
      const parsed = Date.parse(comment.createdAt);
      if (!isNaN(parsed)) {
        date = new Date(parsed);
      }
    }

    if (!date) {
      return isZh && comment.createdAt_zh ? comment.createdAt_zh : comment.createdAt;
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

  const displayReadTime = isZh && post.readTime_zh ? post.readTime_zh : post.readTime;
  const displayContent = isZh && post.content_zh ? post.content_zh : post.content;
  const displayBio = isZh && post.author.bio_zh ? post.author.bio_zh : post.author.bio;
  const displayTags = isZh && post.tags_zh ? post.tags_zh : post.tags;

  const likesCount = post.likes || 0;
  const isLiked = currentUserId ? (post.likedBy || []).includes(currentUserId) : false;

  const hasTitle =
    post.title &&
    post.title.trim() !== "" &&
    post.title.trim() !== "无标题文章" &&
    post.title.trim() !== "Untitled Story";

  const handleFollowToggle = () => {
    if (!isLoggedIn) {
      if (onOpenLoginModal) onOpenLoginModal();
      return;
    }
    if (onFollowToggle) {
      onFollowToggle(post.author.id);
    }
  };

  const handleClapClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClap(post.id);
    
    // Add clap bubble animation
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newBubble = {
      id: bubbleId,
      x: x + (Math.random() * 20 - 10),
      y: y - 10,
    };
    
    setClapBubbles((prev) => [...prev, newBubble]);
    setBubbleId((prev) => prev + 1);
    
    // Remove bubble after 1 second
    setTimeout(() => {
      setClapBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
    }, 1000);
  };

  const handleShareClick = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsShareTooltipVisible(true);
    setTimeout(() => {
      setIsShareTooltipVisible(false);
    }, 2000);
  };

  return (
    <div id={`article-view-${post.id}`} className="bg-white min-h-screen pb-24">
      {/* Top sticky sub-header/back bar */}
      <div className="sticky top-16 z-30 border-b border-gray-50 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <button
            id="back-to-feed-btn"
            onClick={onBack}
            className="group flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-black transition-colors"
          >
            <ArrowLeft className="h-4 w-4 transform group-hover:-translate-x-0.5 transition-transform" />
            <span>{t.backToStories || "Back to stories"}</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-400">
              {displayTags && displayTags.length > 0 && (
                isZh ? `标签: ${displayTags.join(", ")}` : `Tags: ${displayTags.join(", ")}`
              )}
            </span>
          </div>
        </div>
      </div>

      <article className="mx-auto max-w-2xl px-6 pt-10">
        {/* Tags Pills */}
        {displayTags && displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {displayTags.map((tag) => (
              <span key={tag} className="text-xs font-semibold uppercase tracking-wider text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        {hasTitle && (
          <h1 className="serif-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4 leading-tight">
            {displayTitle}
          </h1>
        )}

        {/* Subtitle */}
        {hasTitle && (
          <p className="text-lg md:text-xl font-normal text-gray-500 mb-8 leading-relaxed font-sans">
            {displaySubtitle}
          </p>
        )}

        {/* Author details */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-b border-gray-100 py-5 my-8">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <img
              src={post.author.avatar || undefined}
              alt={post.author.name}
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-full object-cover border border-gray-100 shadow-xs cursor-pointer"
              onClick={() => onAuthorClick && onAuthorClick(post.author)}
            />
            <div className="text-sm">
              <div className="flex items-center space-x-2">
                <span
                  className="font-bold text-gray-900 hover:underline cursor-pointer"
                  onClick={() => onAuthorClick && onAuthorClick(post.author)}
                >
                  {post.author.name}
                </span>
                {currentUserId !== post.author.id && (
                  <>
                    <span>·</span>
                    <button
                      id="follow-author-btn"
                      onClick={handleFollowToggle}
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full transition-all flex items-center space-x-0.5 ${
                        isFollowed
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          : "bg-black text-white hover:bg-neutral-800"
                      }`}
                    >
                      {isFollowed ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>{t.following || "Following"}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          <span>{t.follow || "Follow"}</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                <span>{displayPublishedAt}</span>
                <span className="mx-1.5">·</span>
                <span>{displayReadTime}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-gray-500">
            {/* Share link button */}
            <div className="relative">
              <button
                id="share-article-btn"
                onClick={handleShareClick}
                className="rounded-full p-2 hover:bg-gray-50 hover:text-black transition-colors"
                title={isZh ? "复制文章链接" : "Copy article link"}
              >
                <Share2 className="h-5 w-5" />
              </button>
              <AnimatePresence>
                {isShareTooltipVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: -40, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2.5 rounded-md whitespace-nowrap z-50 shadow-md font-sans"
                  >
                    {t.linkCopied || "Link copied!"}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bookmark button */}
            <button
              id="bookmark-article-btn"
              onClick={() => onBookmark(post.id)}
              className={`rounded-full p-2 hover:bg-gray-50 transition-colors ${
                post.isBookmarked ? "text-amber-500 hover:text-amber-600" : "hover:text-black"
              }`}
              title={post.isBookmarked ? (t.saved || "Saved") : (t.saveStory || "Save story")}
            >
              <Bookmark className={`h-5 w-5 ${post.isBookmarked ? "fill-amber-400 text-amber-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* Big Cover Image */}
        {post.coverImage && (
          <div className="my-8 aspect-video w-full overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
            <img
              src={post.coverImage || undefined}
              alt={displayTitle}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Dynamic clap-bubble animation canvas */}
        <div className="relative">
          {/* Article Action Bar */}
          <div className="flex items-center justify-between border-t border-b border-gray-100 py-3 mb-8">
            <div className="flex items-center space-x-6">
              {/* Like button */}
              <button
                id="like-button-interaction"
                onClick={() => onLike && onLike(post.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  isLiked
                    ? "text-green-600 bg-green-50/50 hover:bg-green-50 font-semibold"
                    : "text-gray-500 hover:text-black hover:bg-gray-50"
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
                  <ThumbsUp className={`h-5 w-5 ${isLiked ? "fill-green-100 text-green-600" : ""}`} />
                </motion.div>
                <span className="text-sm font-semibold">{likesCount}</span>
              </button>

              {/* Comments trigger */}
              <button
                id="toggle-comments-btn-view"
                onClick={onToggleComments}
                className="flex items-center space-x-2 text-gray-500 hover:text-black px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors"
                title={t.viewResponses || "View responses"}
              >
                <MessageSquare className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium">{post.comments.length}</span>
              </button>
            </div>
          </div>

          {/* Render article HTML body content directly */}
          <div
            id="article-body-content"
            className="article-body font-serif text-lg leading-relaxed text-gray-800 space-y-6"
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />
        </div>

        {/* Tags Block */}
        {displayTags && displayTags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-10 border-t border-gray-100 mt-12">
            {displayTags.map((tag) => (
              <span
                key={tag}
                className="bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium px-3.5 py-1.5 rounded-full transition-colors cursor-pointer border border-gray-100"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Inline Comments Section */}
        <div ref={commentsSectionRef} className="mt-14 pt-10 border-t border-gray-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-gray-900">
                {isZh ? "读者回复" : (t.responses || "Responses")}
              </h3>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600">
                {post.comments.length}
              </span>
            </div>
          </div>

          {/* Add a comment form */}
          {!isLoggedIn ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center flex flex-col items-center mb-6">
              <Lock className="h-5 w-5 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500 font-sans max-w-xs leading-relaxed mb-3">
                {isZh ? "您必须登录才能发表回复。" : (t.mustLoginToComment || "You must be logged in to leave a comment.")}
              </p>
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="rounded-full bg-neutral-900 hover:bg-black text-white px-4 py-1.5 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-3xs active:scale-95 cursor-pointer"
              >
                <span>{isZh ? "登录验证" : (t.loginButton || "Verify & Log In")}</span>
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!commentInput.trim() || !onAddComment) return;
                onAddComment(commentInput.trim());
                setCommentInput("");
              }}
              className="rounded-2xl border border-gray-150 bg-gray-50/40 p-5 mb-8 transition-all duration-200 focus-within:border-gray-200 focus-within:bg-white focus-within:shadow-xs"
            >
              <div className="flex items-center space-x-3 mb-3">
                <img
                  src={currentUser?.avatar || undefined}
                  alt={currentUser?.name}
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full object-cover border border-gray-150"
                />
                <span className="text-xs font-bold text-gray-700">{currentUser?.name}</span>
              </div>

              <textarea
                placeholder={isZh ? "写下你的想法..." : (t.whatAreYourThoughts || "What are your thoughts?")}
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="w-full bg-transparent text-sm text-gray-800 outline-hidden border-0 placeholder:text-gray-400 focus:ring-0 resize-y min-h-[80px] leading-relaxed"
              />

              <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-100/60">
                <button
                  type="button"
                  onClick={() => {
                    setCommentInput("");
                  }}
                  className="rounded-full px-4 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  {isZh ? "取消" : (t.cancel || "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="rounded-full bg-emerald-400 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                >
                  {isZh ? "发表回复" : (t.respond || "Respond")}
                </button>
              </div>
            </form>
          )}

          {/* Comments List */}
          <div className="space-y-6">
            {post.comments.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-400">
                  {isZh ? "暂无回复，快来发表你的第一条评论吧！" : (t.noResponsesYet || "No responses yet. Be the first to share your thoughts!")}
                </p>
              </div>
            ) : (
              post.comments.map((comment) => {
                const commentContent = isZh && comment.content_zh ? comment.content_zh : comment.content;
                const commentCreatedAt = getDisplayCommentTime(comment);
                return (
                  <div
                    key={comment.id}
                    className="border-b border-gray-100/70 pb-5 last:border-0"
                  >
                    {/* Comment Author Header */}
                    <div className="flex items-center space-x-3 mb-2.5">
                      <img
                        src={comment.authorAvatar || undefined}
                        alt={comment.authorName}
                        referrerPolicy="no-referrer"
                        className="h-9 w-9 rounded-full object-cover border border-gray-50"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{comment.authorName}</h4>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{commentCreatedAt}</span>
                      </div>
                    </div>

                    {/* Comment Text */}
                    <p className="text-sm leading-relaxed text-gray-800 pl-1">
                      {commentContent}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Author Bio Card Footer */}
        <div className="bg-gray-50 rounded-2xl p-6 md:p-8 border border-gray-100/70 mt-14 flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
          <img
            src={post.author.avatar || undefined}
            alt={post.author.name}
            referrerPolicy="no-referrer"
            className="h-16 w-16 rounded-full object-cover border border-white shadow-sm flex-shrink-0 cursor-pointer"
            onClick={() => onAuthorClick && onAuthorClick(post.author)}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3
                className="font-bold text-gray-900 text-base hover:underline cursor-pointer"
                onClick={() => onAuthorClick && onAuthorClick(post.author)}
              >
                {post.author.name}
              </h3>
              <span className="text-xs text-gray-400 font-sans">
                {followerCount.toLocaleString()} {isZh ? "位关注者" : "followers"}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed font-sans">{renderBioWithLinks(displayBio)}</p>
          </div>
        </div>
      </article>

      {/* Recommended Reading Bottom Section */}
      {recommendedPosts.length > 0 && (
        <section className="bg-gray-50/50 border-t border-gray-100 py-16 mt-16">
          <div className="mx-auto max-w-4xl px-6">
            <h3 className="text-xl font-bold text-gray-900 font-serif mb-8 text-center sm:text-left">
              {t.recommendedReading || "Recommended Reading"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {recommendedPosts.map((rec) => {
                const recTitle = isZh && rec.title_zh ? rec.title_zh : rec.title;
                const recReadTime = isZh && rec.readTime_zh ? rec.readTime_zh : rec.readTime;
                const recTags = isZh && rec.tags_zh ? rec.tags_zh : rec.tags;
                const recContent = isZh && rec.content_zh ? rec.content_zh : rec.content;

                const recHasTitle =
                  rec.title &&
                  rec.title.trim() !== "" &&
                  rec.title.trim() !== "无标题文章" &&
                  rec.title.trim() !== "Untitled Story";

                return (
                  <div
                    id={`recommended-card-${rec.id}`}
                    key={rec.id}
                    onClick={() => onSelectPost(rec.id)}
                    className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between group h-full"
                  >
                    <div>
                      {rec.coverImage && (
                        <div className="aspect-video w-full rounded-lg overflow-hidden mb-4 bg-gray-50 border border-gray-100/60">
                          <img
                            src={rec.coverImage || undefined}
                            alt={recHasTitle ? recTitle : (isZh ? "封面图片" : "Cover Image")}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover group-hover:scale-101 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="flex items-center space-x-2 text-xs text-gray-400 mb-2 font-sans">
                        <span
                          className="font-medium text-gray-600 hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAuthorClick && onAuthorClick(rec.author);
                          }}
                        >
                          {rec.author.name}
                        </span>
                        {recTags && recTags.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-green-700 bg-green-50/50 px-1.5 py-0.5 rounded text-[10px] font-medium">#{recTags[0]}</span>
                          </>
                        )}
                      </div>
                      
                      {recHasTitle ? (
                        <h4 className="font-serif font-bold text-gray-900 group-hover:text-gray-700 transition-colors line-clamp-2 leading-snug">
                          {recTitle}
                        </h4>
                      ) : (
                        <div className="relative max-h-24 overflow-hidden mt-1">
                          <div
                            className="article-body font-serif text-xs sm:text-sm leading-relaxed text-gray-600 space-y-2"
                            dangerouslySetInnerHTML={{ __html: recContent }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 mt-4 block">{recReadTime}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
