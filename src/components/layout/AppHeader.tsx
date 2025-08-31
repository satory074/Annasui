"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import UserProfileDropdown from "@/components/features/auth/UserProfileDropdown";
import { useAuth } from "@/contexts/AuthContext";

interface AppHeaderProps {
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  variant?: "home" | "player" | "default";
}

export default function AppHeader({
  showSearch = false,
  searchPlaceholder = "検索...",
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  variant = "default"
}: AppHeaderProps) {
  const { user, isApproved } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit(e);
    }
    setIsSearchOpen(false);
  };

  const navigationItems = [
    {
      href: "/",
      label: "メドレー一覧",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
        </svg>
      ),
    },
    {
      href: "/my-medleys",
      label: "マイメドレー",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
      requiresAuth: true,
      requiresApproval: true,
    }
  ];

  const headerBg = variant === "home" 
    ? "bg-white border-b border-gray-200" 
    : "bg-gradient-to-r from-gray-800 to-gray-900 text-white";

  return (
    <header className={`${headerBg} shadow-sm sticky top-0 z-40`}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-6">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <Logo size="md" />
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-sm">
                ALPHA
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => {
                // Skip auth-required items if user is not logged in
                if (item.requiresAuth && !user) return null;
                
                // Skip approval-required items if user is not approved
                if (item.requiresApproval && !isApproved) return null;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      variant === "home"
                        ? "text-gray-700 hover:text-orange-600 hover:bg-orange-50"
                        : "text-gray-300 hover:text-white hover:bg-gray-700"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side - Search, Actions, User Profile */}
          <div className="flex items-center space-x-3">
            {/* Search Toggle (Mobile) */}
            {showSearch && (
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`md:hidden p-2 rounded-lg transition-colors ${
                  variant === "home"
                    ? "text-gray-600 hover:text-orange-600 hover:bg-orange-50"
                    : "text-gray-300 hover:text-white hover:bg-gray-700"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            {/* Desktop Search */}
            {showSearch && (
              <form 
                onSubmit={handleSearchSubmit} 
                className="hidden md:flex items-center space-x-2"
              >
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                  </svg>
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="pl-10 pr-4 py-2 w-64 text-gray-900 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>検索</span>
                </button>
              </form>
            )}

            {/* Feedback Button */}
            <a
              href="https://github.com/anthropics/claude-code/issues"
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden sm:flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                variant === "home"
                  ? "text-gray-700 hover:text-orange-600 hover:bg-orange-50 border border-gray-200"
                  : "text-gray-300 hover:text-white hover:bg-gray-700 bg-gray-700"
              }`}
              title="フィードバック・バグ報告"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>フィードバック</span>
            </a>

            {/* User Profile */}
            <UserProfileDropdown />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                variant === "home"
                  ? "text-gray-600 hover:text-orange-600 hover:bg-orange-50"
                  : "text-gray-300 hover:text-white hover:bg-gray-700"
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && isSearchOpen && (
          <div className="md:hidden border-t border-gray-200 px-4 py-3">
            <form onSubmit={handleSearchSubmit} className="flex space-x-2">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                </svg>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-10 pr-4 py-2 text-gray-900 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <button 
                type="submit" 
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                検索
              </button>
            </form>
          </div>
        )}

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div ref={mobileMenuRef} className={`md:hidden border-t ${variant === "home" ? "border-gray-200" : "border-gray-700"}`}>
            <div className="px-2 py-3 space-y-1">
              {navigationItems.map((item) => {
                // Skip auth-required items if user is not logged in
                if (item.requiresAuth && !user) return null;
                
                // Skip approval-required items if user is not approved
                if (item.requiresApproval && !isApproved) return null;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                      variant === "home"
                        ? "text-gray-700 hover:text-orange-600 hover:bg-orange-50"
                        : "text-gray-300 hover:text-white hover:bg-gray-700"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              
              {/* Mobile Feedback Link */}
              <a
                href="https://github.com/anthropics/claude-code/issues"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                  variant === "home"
                    ? "text-gray-700 hover:text-orange-600 hover:bg-orange-50"
                    : "text-gray-300 hover:text-white hover:bg-gray-700"
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span>フィードバック</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}