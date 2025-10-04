"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import VersionInfoModal from "@/components/ui/VersionInfoModal";

interface AppHeaderProps {
  variant?: "home" | "player" | "default";
}

export default function AppHeader({
  variant = "default"
}: AppHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
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


  const navigationItems = [
    {
      href: "/",
      label: "メドレー一覧",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
        </svg>
      ),
    }
  ];

  const headerBg = variant === "home" 
    ? "bg-white border-b border-gray-200" 
    : "bg-gradient-to-r from-gray-800 to-gray-900 text-white";

  return (
    <header className={`${headerBg} shadow-sm fixed top-0 left-0 right-0 z-[100] w-full`}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-6">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <Logo size="md" />
              </Link>
              <button 
                onClick={() => setIsVersionModalOpen(true)}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-pointer"
                title="バージョン情報を表示"
              >
                ALPHA
              </button>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => (
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
              ))}
            </nav>
          </div>

          {/* Right side - Actions, User Profile */}
          <div className="flex items-center space-x-3">

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


        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div ref={mobileMenuRef} className={`md:hidden border-t ${variant === "home" ? "border-gray-200" : "border-gray-700"}`}>
            <div className="px-2 py-3 space-y-1">
              {navigationItems.map((item) => (
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
              ))}
              
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
      
      <VersionInfoModal 
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
      />
    </header>
  );
}