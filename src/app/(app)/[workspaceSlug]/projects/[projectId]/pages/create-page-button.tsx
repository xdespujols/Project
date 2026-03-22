'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function CreatePageButton({ projectId, workspaceSlug }: { projectId: string; workspaceSlug: string }) {
  const router = useRouter();

  async function create() {
    const res = await fetch(`/api/v1/projects/${projectId}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled' }),
    });
    if (res.ok) {
      const { data } = await res.json();
      router.push(`/${workspaceSlug}/projects/${projectId}/pages/${data.id}`);
    }
  }

  return (
    <Button size="sm" onClick={create}>
      <Plus className="h-4 w-4 mr-1" />New page
    </Button>
  );
}
