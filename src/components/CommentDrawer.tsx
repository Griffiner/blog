import React, { useState, useRef, useEffect } from "react";
import { X, Send, ThumbsUp, Lock } from "lucide-react";
import { motion } from "motion/react";
import { Comment } from "../types";

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  comments: Comment[];
  onAddComment: (text: string) => void;
  currentUser: { name: string; avatar: string };
  onClapComment: (commentId: string) => void;
  lang?: "en" | "zh";
  t?: any;
  isLoggedIn?: boolean;
  onOpenLoginModal?: () => void;
}

export default function CommentDrawer({
  isOpen,
  onClose,
  comments,
  onAddComment,
  currentUser,
  onClapComment,
  lang = "en",
  t = {},
  isLoggedIn = false,
  onOpenLoginModal = () => {},
}: CommentDrawerProps) {
  const [commentText, setCommentText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isZh = lang === "zh";

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

  useEffect(() => {
    if (isOpen && isLoggedIn) {
      // Focus after a short delay to allow slide animation to complete smoothly
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          setIsFocused(true);
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isLoggedIn]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(commentText.trim());
    setCommentText("");
    setIsFocused(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        id="comment-drawer-backdrop"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer */}
      <motion.div
        id="comment-drawer"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l border-gray-100 bg-white shadow-2xl sm:max-w-md md:max-w-lg"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-gray-900">{t.responses || "Responses"}</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
              {comments.length}
            </span>
          </div>
          <button
            id="close-comment-drawer-btn"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comment input & list container */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Add a comment form */}
          {!isLoggedIn ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center flex flex-col items-center">
              <Lock className="h-5 w-5 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500 font-sans max-w-xs leading-relaxed mb-3">
                {t.mustLoginToComment || "You must be logged in to leave a comment."}
              </p>
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="rounded-full bg-neutral-900 hover:bg-black text-white px-4 py-1.5 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-3xs active:scale-95"
              >
                <span>{t.loginButton || "Verify & Log In"}</span>
              </button>
            </div>
          ) : (
            <form
              id="add-comment-form"
              onSubmit={handleSubmit}
              className="rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all duration-200 focus-within:border-gray-200 focus-within:bg-white focus-within:shadow-sm"
            >
              <div className="flex items-center space-x-3 mb-3">
                <img
                  src={currentUser.avatar || undefined}
                  alt={currentUser.name}
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 rounded-full object-cover border border-gray-200"
                />
                <span className="text-xs font-semibold text-gray-700">{currentUser.name}</span>
              </div>

              <textarea
                ref={textareaRef}
                id="comment-textarea"
                placeholder={t.whatAreYourThoughts || "What are your thoughts?"}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onFocus={() => setIsFocused(true)}
                className="w-full bg-transparent text-sm text-gray-800 outline-hidden border-0 placeholder:text-gray-400 focus:ring-0 resize-y min-h-[50px] leading-relaxed"
              />

              {(isFocused || commentText) && (
                <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100/60">
                  <button
                    id="cancel-comment-btn"
                    type="button"
                    onClick={() => {
                      setCommentText("");
                      setIsFocused(false);
                    }}
                    className="rounded-full px-4 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    {t.cancel || "Cancel"}
                  </button>
                  <button
                    id="submit-comment-btn"
                    type="submit"
                    disabled={!commentText.trim()}
                    className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {t.respond || "Respond"}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Comments List */}
          <div id="comments-list" className="space-y-5">
            {comments.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-400">{t.noResponsesYet || "No responses yet. Be the first to share your thoughts!"}</p>
              </div>
            ) : (
              comments.map((comment) => {
                const commentContent = isZh && comment.content_zh ? comment.content_zh : comment.content;
                const commentCreatedAt = getDisplayCommentTime(comment);
                return (
                  <div
                    id={`comment-item-${comment.id}`}
                    key={comment.id}
                    className="border-b border-gray-100/80 pb-5 last:border-0"
                  >
                    {/* Comment Author Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={comment.authorAvatar || undefined}
                          alt={comment.authorName}
                          referrerPolicy="no-referrer"
                          className="h-6 w-6 rounded-full object-cover border border-gray-50"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-gray-800">{comment.authorName}</h4>
                          <span className="text-[10px] text-gray-400">{commentCreatedAt}</span>
                        </div>
                      </div>
                    </div>

                    {/* Comment Text */}
                    <p className="text-sm leading-relaxed text-gray-700 pl-8">
                      {commentContent}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
