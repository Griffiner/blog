import React, { useState } from "react";
import { ArrowLeft, Heading, Bold, Italic, Quote, Code, Image as ImageIcon, Send, Sparkles } from "lucide-react";

interface WriteViewProps {
  onBack: () => void;
  onPublish: (postData: {
    title: string;
    subtitle: string;
    content: string;
    category?: string;
    category_zh?: string;
    coverImage?: string;
    tags: string[];
    tags_zh?: string[];
  }) => void;
  lang?: "en" | "zh";
  t?: any;
}

const PRESET_IMAGES = [
  { id: "p1", name: "Modern abstract paint", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80" },
  { id: "p2", name: "Cozy workspace desk", url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=80" },
  { id: "p3", name: "Forest fog sunrise", url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&auto=format&fit=crop&q=80" },
  { id: "p4", name: "Clean workspace devices", url: "https://images.unsplash.com/photo-1541462608141-27b2c7453c67?w=1200&auto=format&fit=crop&q=80" },
  { id: "p5", name: "Abstract server lines", url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80" },
];

export default function WriteView({ onBack, onPublish, lang = "en", t = {} }: WriteViewProps) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [includeCoverImage, setIncludeCoverImage] = useState(false);
  const [coverImage, setCoverImage] = useState(PRESET_IMAGES[0].url);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const isZh = lang === "zh";

  // Formatting insert helpers for rich text editing
  const insertFormatting = (prefix: string, suffix: string) => {
    const textarea = document.getElementById("story-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const replacement = prefix + (selected || "text") + suffix;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    
    setContent(newContent);
    
    // Focus back & reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected || "text").length);
    }, 0);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/,/g, "");
      if (trimmed && !tags.includes(trimmed)) {
        setTags((prev) => [...prev, trimmed]);
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsPublishing(true);

    const finalTitle = title.trim() || (isZh ? "无标题文章" : "Untitled Story");

    // If custom image is set, use it. Otherwise use coverImage preset. Only if includeCoverImage is true.
    const finalImage = includeCoverImage ? (customImageUrl.trim() || coverImage) : undefined;

    // Convert newlines to paragraphs/formatting tags for HTML rendering
    const formattedContent = content
      .split("\n\n")
      .map((p) => {
        const trimmed = p.trim();
        if (trimmed.startsWith("<h2>") || trimmed.startsWith("<blockquote>") || trimmed.startsWith("<pre>")) {
          return trimmed;
        }
        return `<p class="text-lg leading-relaxed mb-6 font-serif text-gray-800">${trimmed}</p>`;
      })
      .join("\n");

    const defaultTag = isZh ? "故事" : "Story";

    setTimeout(() => {
      onPublish({
        title: finalTitle,
        subtitle: subtitle.trim() || (isZh ? "一篇来自我博客的速读文章。" : "A quick read from My Blog."),
        content: formattedContent,
        category: "Story",
        category_zh: "故事",
        coverImage: finalImage,
        tags: tags.length > 0 ? tags : [defaultTag],
        tags_zh: tags.length > 0 ? tags : [defaultTag],
      });
      setIsPublishing(false);
    }, 800);
  };

  return (
    <div id="write-view" className="bg-white min-h-screen pb-24">
      {/* Sticky Top actions */}
      <div className="sticky top-16 z-30 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <button
            id="write-back-btn"
            onClick={onBack}
            className="group flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-black transition-colors"
          >
            <ArrowLeft className="h-4 w-4 transform group-hover:-translate-x-0.5 transition-transform" />
            <span>{t.drafts || "Drafts"}</span>
          </button>

          <button
            id="publish-btn"
            onClick={handlePublish}
            disabled={!content.trim() || isPublishing}
            className="flex items-center space-x-2 rounded-full bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isPublishing ? (t.publishing || "Publishing...") : (t.publishStory || "Publish Story")}</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 pt-10">
        <form onSubmit={handlePublish} className="space-y-6">
          {/* Title Editor */}
          <input
            id="story-title-input"
            type="text"
            placeholder={t.titlePlaceholder || "Title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full serif-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 border-0 outline-hidden placeholder:text-gray-200 focus:ring-0 leading-tight"
          />

          {/* Subtitle Editor */}
          <input
            id="story-subtitle-input"
            type="text"
            placeholder={t.subtitlePlaceholder || "Tell your story subtitle..."}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full text-lg sm:text-xl font-normal text-gray-500 border-0 outline-hidden placeholder:text-gray-300 focus:ring-0 leading-relaxed"
          />

          {/* Meta Configuration Expandable Grid */}
          <div className="bg-gray-50/70 rounded-2xl p-5 border border-gray-100 space-y-4 font-sans text-sm">
            <h4 className="font-semibold text-gray-800 flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4 text-green-600" />
              <span>{t.storySettings || "Story Settings"}</span>
            </h4>

            <div className="space-y-1">
              {/* Tags Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t.tagsLabel || "Tags (Press Enter/Comma)"}
                </label>
                <input
                  id="story-tags-input"
                  type="text"
                  placeholder={t.tagsPlaceholder || "e.g. Design, Web, Life"}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-300 transition-colors"
                />
              </div>
            </div>

            {/* Display tag list */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center bg-white border border-gray-200 text-gray-600 text-xs px-2.5 py-1 rounded-full space-x-1.5"
                  >
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-gray-400 hover:text-red-500 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Cover Image Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t.coverPhotoLabel || "Cover Photo"}
                </label>
                <label className="flex items-center space-x-1.5 text-xs text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeCoverImage}
                    onChange={(e) => setIncludeCoverImage(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-3.5 w-3.5"
                  />
                  <span className="font-medium text-gray-600">{t.includeCoverImageLabel || "Include Cover Image"}</span>
                </label>
              </div>
              
              {includeCoverImage && (
                <>
                  {/* Presets */}
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_IMAGES.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => {
                          setCoverImage(img.url);
                          setCustomImageUrl("");
                        }}
                        className={`aspect-video rounded-md overflow-hidden cursor-pointer border-2 relative ${
                          coverImage === img.url && !customImageUrl
                            ? "border-green-600 shadow-sm scale-102"
                            : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                        title={img.name}
                      >
                        <img src={img.url} alt={img.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>

                  {/* Custom Image Input */}
                  <div className="pt-1">
                    <input
                      id="story-image-input"
                      type="text"
                      placeholder={t.customImagePlaceholder || "Or paste custom image URL..."}
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-300 transition-colors"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick formatting toolbar */}
          <div className="flex items-center space-x-1 border-y border-gray-100 py-2 sticky top-[112px] bg-white z-20">
            <button
              type="button"
              onClick={() => insertFormatting("<h2>", "</h2>")}
              title={t.addHeading || "Add heading"}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <Heading className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("<strong>", "</strong>")}
              title={t.bold || "Bold"}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("<em>", "</em>")}
              title={t.italic || "Italic"}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<blockquote class="border-l-4 border-black pl-6 my-8 italic text-xl font-serif text-gray-800">"', '"</blockquote>')}
              title={t.blockquote || "Add blockquote"}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <Quote className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('<pre class="bg-gray-50 border border-gray-100 rounded-lg p-6 font-mono text-sm overflow-x-auto my-6 text-gray-800">', "</pre>")}
              title={t.codeSnippet || "Add code snippet"}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <Code className="h-4 w-4" />
            </button>
          </div>

          {/* Distraction-free body textarea */}
          <textarea
            id="story-textarea"
            placeholder={t.tellYourStory || "Tell your story... Use the formatting toolbar above or write HTML. Separate paragraphs with double Enters."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[400px] border-0 outline-hidden font-serif text-lg leading-relaxed text-gray-800 placeholder:text-gray-300 focus:ring-0 resize-y"
          />
        </form>
      </div>
    </div>
  );
}
