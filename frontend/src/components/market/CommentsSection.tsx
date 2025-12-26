'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';

interface CommentsSectionProps {
  marketId: string;
  marketSlug?: string;
}

export default function CommentsSection({ marketId, marketSlug }: CommentsSectionProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
      <p className="text-lg font-medium text-gray-300">Comments</p>
      <p className="text-sm text-gray-500">Coming soon</p>
    </div>
  );
}
