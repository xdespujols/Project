'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { cn } from '@/lib/utils';

type Page = {
  id: string;
  title: string;
  content: unknown;
  updatedAt: Date;
};

type Props = {
  page: Page;
  projectId: string;
  workspaceSlug: string;
};

export function PageEditor({ page, projectId, workspaceSlug }: Props) {
  const [title, setTitle] = useState(page.title);
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  async function save(updates: Partial<{ title: string; content: object; contentText: string }>) {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/v1/projects/${projectId}/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setSaved(true);
    }, 800);
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full px-8 py-6">
      <div className="flex items-center gap-3 mb-6 text-sm text-gray-500">
        <Link
          href={`/${workspaceSlug}/projects/${projectId}/pages`}
          className="flex items-center gap-1 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Pages
        </Link>
        <span>•</span>
        <span className={cn(saved ? 'text-green-600' : 'text-amber-500')}>
          {saved ? 'Saved' : 'Saving…'}
        </span>
      </div>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          save({ title: e.target.value });
        }}
        placeholder="Page title"
        className="text-3xl font-bold border-0 focus:outline-none mb-6 bg-transparent w-full"
      />

      <div className="flex-1">
        <RichTextEditor
          content={(page.content as object) ?? undefined}
          placeholder="Start writing…"
          onChange={(json, text) => save({ content: json, contentText: text })}
          className="border-0"
        />
      </div>

      <div className="text-xs text-gray-400 mt-4">
        Last updated {new Date(page.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}
