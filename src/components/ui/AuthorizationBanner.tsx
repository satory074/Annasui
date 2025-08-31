"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function AuthorizationBanner() {
  const { user, isApproved, approvalLoading } = useAuth();

  // Show nothing if not logged in or approved
  if (!user || isApproved || approvalLoading) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 mb-4 rounded-lg">
      <div className="flex items-center">
        <svg className="w-5 h-5 text-yellow-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div>
          <h3 className="text-sm font-medium text-yellow-800">
            承認待ち
          </h3>
          <p className="text-sm text-yellow-700">
            メドレーの作成・編集には管理者の承認が必要です。承認をお待ちください。
          </p>
        </div>
      </div>
    </div>
  );
}