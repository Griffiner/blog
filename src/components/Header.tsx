import { useState } from "react";
import { BookOpen, Search, Edit3, Bell, Bookmark, LogOut, Key, Menu, X, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"
import { Author } from "../types";

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentUser: { name: string; avatar: string; uid?: number };
  onResetData: () => void;
  lang: "en" | "zh";
  onChangeLang: (lang: "en" | "zh") => void;
  t: any;
  isLoggedIn: boolean;
  onLogout: () => void;
  onOpenLoginModal: () => void;
  authors?: Author[];
  onNavigateToAuthorProfile?: (author: Author) => void;
}

export default function Header({
  currentView,
  onNavigate,
  searchQuery,
  onSearchChange,
  currentUser,
  onResetData,
  lang,
  onChangeLang,
  t,
  isLoggedIn,
  onLogout,
  onOpenLoginModal,
  authors = [],
  onNavigateToAuthorProfile,
}: HeaderProps) {
  const isZh = lang === "zh";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isUserSearch = searchQuery.trim().startsWith("@");
  const userSearchTerm = isUserSearch ? searchQuery.trim().substring(1).toLowerCase() : "";

  const matchingAuthors = isUserSearch
    ? authors.filter((author) => {
        const nameMatch = author.name.toLowerCase().includes(userSearchTerm);
        const idMatch = author.id.toLowerCase().includes(userSearchTerm);
        return nameMatch || idMatch;
      })
    : [];

  const handleMobileNavigate = (view: string) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <header id="main-header" className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-12">
        {/* Left: Logo & Search */}
        <div className="flex items-center space-x-6 flex-1">
          <div
            id="logo"
            onClick={() => handleMobileNavigate("feed")}
            className="flex cursor-pointer items-center transition-opacity hover:opacity-85"
          >
            <span className="font-serif text-xl font-bold tracking-tight text-gray-900">
              {t.logoName}
            </span>
          </div>

          {/* Search Bar (Desktop only) */}
          <div className="relative max-w-xs flex-1 hidden md:block">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              id="search-input"
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-full bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-950 outline-none transition-all placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:ring-gray-200"
            />

            {isUserSearch && (
              <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-xl border border-gray-100 bg-white p-2 shadow-xl z-50">
                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                  {isZh ? "匹配的用户" : "Matching Users"}
                </div>
                {matchingAuthors.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-gray-400">
                    {isZh ? "未找到该用户" : "No user found"}
                  </div>
                ) : (
                  matchingAuthors.map((author) => (
                    <div
                      key={author.id}
                      onClick={() => {
                        onNavigateToAuthorProfile?.(author);
                        onSearchChange("");
                      }}
                      className="flex items-center space-x-3 rounded-lg px-2 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <img
                        src={author.avatar}
                        alt={author.name}
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 rounded-full border border-gray-100 object-cover bg-white"
                      />
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-gray-900 leading-tight">
                          {author.name}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">
                          @{author.id}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions (Desktop and Tablet sizes - Adaptive text) */}
        <div className="hidden md:flex items-center space-x-3 md:space-x-4">
          {/* Language Selector */}
          <button
            id="language-toggle-btn"
            onClick={() => onChangeLang(lang === "en" ? "zh" : "en")}
            className="flex items-center space-x-1.5 rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none cursor-pointer"
            title={lang === "en" ? "切换为中文" : "Switch to English"}
          >
            <span className={lang === "en" ? "font-bold text-black" : "text-gray-400"}>EN</span>
            <span className="text-gray-300">/</span>
            <span className={lang === "zh" ? "font-bold text-black" : "text-gray-400"}>中</span>
          </button>

          {/* Write Button - Icon is always shown; Text is hidden when screen size gets small (hidden below lg screen) */}
          <button
            id="write-article-btn"
            onClick={() => onNavigate("write")}
            className={`flex items-center space-x-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              currentView === "write"
                ? "bg-black text-white hover:bg-neutral-800"
                : "text-gray-600 hover:bg-gray-50 hover:text-black"
            }`}
          >
            <Edit3 className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">{t.write}</span>
          </button>

          {/* Bookmarks Icon Button */}
          <button
            id="bookmarks-btn"
            onClick={() => onNavigate("bookmarks")}
            className={`rounded-full p-2 transition-colors relative cursor-pointer ${
              currentView === "bookmarks"
                ? "bg-gray-100 text-black"
                : "text-gray-500 hover:bg-gray-50 hover:text-black"
            }`}
            title={t.bookmarks}
          >
            <Bookmark className="h-5 w-5" />
          </button>

          {/* Login / Verification State */}
          {isLoggedIn ? (
            <div className="flex items-center space-x-2.5">
              <button
                onClick={onLogout}
                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-2 border border-transparent hover:border-red-100 font-medium font-sans flex items-center justify-center transition-all cursor-pointer"
                title={t.logout}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenLoginModal}
                className="rounded-full bg-neutral-900 hover:bg-black text-white px-3.5 py-1.5 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-3xs active:scale-95 cursor-pointer"
              >
                <Key className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden lg:inline">{t.loginButton}</span>
              </button>
            </div>
          )}
        </div>

        {/* Hamburger Toggle (Mobile/Tablet only - under md 768px) */}
        <div className="flex md:hidden items-center space-x-3">
          {/* Quick Language Toggle */}
          <button
            onClick={() => onChangeLang(lang === "en" ? "zh" : "en")}
            className="flex items-center space-x-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span>{lang === "en" ? "EN" : "中"}</span>
          </button>

          {/* Hamburger button toggler */}
          <button
            id="mobile-menu-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-50 hover:text-black transition-colors focus:outline-none cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Collapsed Menu Dropdown (再小折叠栏) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden md:hidden border-t border-gray-100 bg-white shadow-lg divide-y divide-gray-50"
          >
            {/* 1. Mobile Search Bar */}
            <div className="p-4 bg-gray-50/50 relative">
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  id="mobile-search-input"
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full rounded-full bg-white border border-gray-150 py-2.5 pl-9 pr-4 text-sm text-gray-950 outline-none transition-all placeholder:text-gray-400 focus:ring-1 focus:ring-gray-200"
                />
              </div>

              {isUserSearch && (
                <div className="absolute left-4 right-4 mt-2 max-h-60 overflow-y-auto rounded-xl border border-gray-150 bg-white p-2 shadow-lg z-50">
                  <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                    {isZh ? "匹配的用户" : "Matching Users"}
                  </div>
                  {matchingAuthors.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-gray-400">
                      {isZh ? "未找到该用户" : "No user found"}
                    </div>
                  ) : (
                    matchingAuthors.map((author) => (
                      <div
                        key={author.id}
                        onClick={() => {
                          onNavigateToAuthorProfile?.(author);
                          onSearchChange("");
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center space-x-3 rounded-lg px-2 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <img
                          src={author.avatar}
                          alt={author.name}
                          referrerPolicy="no-referrer"
                          className="h-8 w-8 rounded-full border border-gray-100 object-cover bg-white"
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-gray-900 leading-tight">
                            {author.name}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">
                            @{author.id}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 2. Navigation List */}
            <div className="flex flex-col py-2 px-4 space-y-1">
              {/* Write new story */}
              <button
                onClick={() => handleMobileNavigate("write")}
                className={`flex items-center space-x-3 w-full rounded-xl px-4 py-3.5 text-sm font-semibold transition-all border cursor-pointer ${
                  currentView === "write"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100/60"
                    : "text-gray-700 border-transparent hover:bg-gray-50"
                }`}
              >
                <Edit3 className="h-4.5 w-4.5 shrink-0" />
                <span>{t.write}</span>
              </button>

              {/* Bookmarks link */}
              <button
                onClick={() => handleMobileNavigate("bookmarks")}
                className={`flex items-center space-x-3 w-full rounded-xl px-4 py-3.5 text-sm font-semibold transition-all border cursor-pointer ${
                  currentView === "bookmarks"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100/60"
                    : "text-gray-700 border-transparent hover:bg-gray-50"
                }`}
              >
                <Bookmark className="h-4.5 w-4.5 shrink-0" />
                <span>{t.bookmarks}</span>
              </button>

              {/* Profile Link (only if logged in) */}
              {isLoggedIn && (
                <button
                  onClick={() => handleMobileNavigate("profile")}
                  className={`flex items-center space-x-3 w-full rounded-xl px-4 py-3.5 text-sm font-semibold transition-all border cursor-pointer ${
                    currentView === "profile"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100/60"
                      : "text-gray-700 border-transparent hover:bg-gray-50"
                  }`}
                >
                  <img
                    src={currentUser.avatar || undefined}
                    alt={currentUser.name}
                    referrerPolicy="no-referrer"
                    className="h-6 w-6 rounded-full object-cover shrink-0 border border-gray-150 bg-white"
                  />
                  <div className="flex flex-col items-start leading-tight">
                    <span className={`font-semibold ${currentView === "profile" ? "text-emerald-800" : "text-gray-800"}`}>{currentUser.name}</span>
                    {currentUser.uid && <span className={`text-[10px] font-mono ${currentView === "profile" ? "text-emerald-500" : "text-gray-400"}`}>UID #{currentUser.uid}</span>}
                  </div>
                </button>
              )}
            </div>

            {/* 3. Authentication Footer */}
            <div className="p-4">
              {isLoggedIn ? (
                <button
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center space-x-2 w-full rounded-full border border-red-200 text-red-600 hover:bg-red-50 py-2.5 text-sm font-semibold transition-all cursor-pointer"
                >
                  <LogOut className="h-4.5 w-4.5 shrink-0" />
                  <span>{t.logout}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onOpenLoginModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center space-x-2 w-full rounded-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 text-sm font-bold transition-all shadow-3xs cursor-pointer"
                >
                  <Key className="h-4.5 w-4.5 shrink-0" />
                  <span>{t.loginButton}</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
