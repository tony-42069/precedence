'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Heart, Clock, Users, Activity, ChevronDown } from 'lucide-react';

interface Comment {
  id?: string;
  text: string;
  username?: string;
  user?: {
    name?: string;
    username?: string;
    profileImage?: string;
  };
  createdAt?: string;
  timestamp?: string;
  likes?: number;
  replies?: number;
  position?: string; // e.g., "1.5K Yes"
}

interface CommentsSectionProps {
  marketId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function CommentsSection({ marketId }: CommentsSectionProps) {
  const [activeTab, setActiveTab] = useState<'comments' | 'holders' | 'activity'>('comments');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    async function fetchComments() {
      if (!marketId) return;

      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/markets/${marketId}/comments?limit=50`);

        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
          setCommentCount(data.total || data.count || data.comments?.length || 0);
        }
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, [marketId]);

  // Format timestamp to relative time
  const formatTimeAgo = (timestamp: string | undefined) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get username from comment object
  const getUsername = (comment: Comment) => {
    return comment.user?.username || comment.user?.name || comment.username || 'Anonymous';
  };

  // Get avatar initial
  const getAvatarInitial = (comment: Comment) => {
    const name = getUsername(comment);
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="bg-[#12131A] rounded-xl border border-gray-800">
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
            activeTab === 'comments'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <MessageCircle size={16} />
          Comments {commentCount > 0 && `(${commentCount.toLocaleString()})`}
        </button>
        <button
          onClick={() => setActiveTab('holders')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
            activeTab === 'holders'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users size={16} />
          Top Holders
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
            activeTab === 'activity'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Activity size={16} />
          Activity
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {activeTab === 'comments' && (
          <div>
            {/* Add Comment Input (disabled) */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  disabled
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-500 placeholder-gray-600 cursor-not-allowed"
                />
                <button
                  disabled
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-gray-700 text-gray-500 rounded-md text-sm cursor-not-allowed"
                >
                  Post
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">
                Sign in with Polymarket to comment
              </p>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-3 mb-4">
              <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 rounded-lg text-sm text-white">
                Newest
                <ChevronDown size={14} />
              </button>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="checkbox" className="rounded bg-gray-800 border-gray-700" />
                Holders
              </label>
            </div>

            {/* Comments List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment, index) => (
                  <div
                    key={comment.id || index}
                    className="flex gap-3 p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {comment.user?.profileImage ? (
                        <img
                          src={comment.user.profileImage}
                          alt={getUsername(comment)}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {getAvatarInitial(comment)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-sm">
                          {getUsername(comment)}
                        </span>
                        {comment.position && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            {comment.position}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={10} />
                          {formatTimeAgo(comment.createdAt || comment.timestamp)}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {comment.text}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <button className="flex items-center gap-1 text-gray-500 hover:text-red-400 transition-colors text-sm">
                          <Heart size={14} />
                          {comment.likes || 0}
                        </button>
                        {comment.replies !== undefined && comment.replies > 0 && (
                          <button className="text-gray-500 hover:text-blue-400 transition-colors text-sm">
                            {comment.replies} {comment.replies === 1 ? 'reply' : 'replies'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle size={48} className="mx-auto mb-3 opacity-50" />
                <p>No comments yet</p>
                <p className="text-sm text-gray-600 mt-1">Be the first to share your thoughts</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'holders' && (
          <div className="text-center py-12 text-gray-500">
            <Users size={48} className="mx-auto mb-3 opacity-50" />
            <p>Top Holders</p>
            <p className="text-sm text-gray-600 mt-1">Coming soon</p>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="text-center py-12 text-gray-500">
            <Activity size={48} className="mx-auto mb-3 opacity-50" />
            <p>Recent Activity</p>
            <p className="text-sm text-gray-600 mt-1">Coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
