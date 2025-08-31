"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/layout/AppHeader";
import { logger } from "@/lib/utils/logger";
import { supabase } from "@/lib/supabase";

interface UserData {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  created_at: string;
  isApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());

  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user || !supabase) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Admin check: user can manage approvals (based on RLS policy)
        const { data, error } = await supabase
          .from('approved_users')
          .select('id')
          .limit(1);

        // If no error, user has admin access
        setIsAdmin(!error);
        
        if (!error) {
          await loadUsers();
        } else {
          logger.warn('User is not admin:', error);
        }
      } catch (error) {
        logger.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  const loadUsers = async () => {
    if (!supabase) return;

    try {
      setLoading(true);

      // Get all users from auth.users via the public.users table
      const { data: publicUsers, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        throw usersError;
      }

      // Get approval status for all users
      const { data: approvals, error: approvalsError } = await supabase
        .from('approved_users')
        .select('user_id, approved_at, approved_by');

      if (approvalsError && approvalsError.code !== 'PGRST116') {
        throw approvalsError;
      }

      // Combine user data with approval status
      const userMap = new Map();
      (publicUsers || []).forEach(user => {
        userMap.set(user.id, {
          ...user,
          isApproved: false,
          approvedAt: null,
          approvedBy: null
        });
      });

      (approvals || []).forEach(approval => {
        if (userMap.has(approval.user_id)) {
          const user = userMap.get(approval.user_id);
          user.isApproved = true;
          user.approvedAt = approval.approved_at;
          user.approvedBy = approval.approved_by;
          userMap.set(approval.user_id, user);
        }
      });

      setUsers(Array.from(userMap.values()));
    } catch (error) {
      logger.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!supabase || !user) return;

    setProcessingUsers(prev => new Set(prev).add(userId));

    try {
      const { error } = await supabase
        .from('approved_users')
        .insert({
          user_id: userId,
          approved_by: user.id,
          notes: 'Approved by admin'
        });

      if (error) {
        throw error;
      }

      logger.info('User approved successfully:', userId);
      await loadUsers(); // Reload users
    } catch (error) {
      logger.error('Error approving user:', error);
      alert('承認に失敗しました: ' + (error as Error).message);
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleRevoke = async (userId: string) => {
    if (!supabase) return;

    const confirmed = confirm('このユーザーの承認を取り消しますか？');
    if (!confirmed) return;

    setProcessingUsers(prev => new Set(prev).add(userId));

    try {
      const { error } = await supabase
        .from('approved_users')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      logger.info('User approval revoked:', userId);
      await loadUsers(); // Reload users
    } catch (error) {
      logger.error('Error revoking approval:', error);
      alert('承認取り消しに失敗しました: ' + (error as Error).message);
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader variant="default" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader variant="default" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">管理者ページ</h1>
            <p className="text-gray-600">このページにアクセスするにはログインが必要です。</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader variant="default" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス拒否</h1>
            <p className="text-gray-600">このページにアクセスする権限がありません。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader variant="default" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
            <button
              onClick={loadUsers}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600"
            >
              更新
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    承認状態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userData) => (
                  <tr key={userData.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-full"
                            src={userData.avatar_url || '/default-avatar.svg'}
                            alt=""
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {userData.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {userData.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(userData.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {userData.isApproved ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          承認済み
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          未承認
                        </span>
                      )}
                      {userData.approvedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(userData.approvedAt).toLocaleDateString('ja-JP')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {userData.isApproved ? (
                        <button
                          onClick={() => handleRevoke(userData.id)}
                          disabled={processingUsers.has(userData.id)}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingUsers.has(userData.id) ? '処理中...' : '承認取り消し'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApprove(userData.id)}
                          disabled={processingUsers.has(userData.id)}
                          className="text-orange-600 hover:text-orange-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingUsers.has(userData.id) ? '処理中...' : '承認'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">ユーザーが見つかりません</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}