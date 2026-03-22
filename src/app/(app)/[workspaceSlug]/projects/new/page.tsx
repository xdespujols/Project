'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NewProjectPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const router = useRouter();

  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    setIdentifier(
      value
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '')
        .slice(0, 4),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch(`/api/v1/workspaces/${workspaceSlug}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, identifier, description }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || 'Failed to create project');
      return;
    }

    const { data } = await res.json();
    router.push(`/${workspaceSlug}/projects/${data.id}/issues`);
  }

  return (
    <div className="max-w-lg mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-8">Create a new project</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="project-name">Project name</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="My Project"
            required
          />
        </div>
        <div>
          <Label htmlFor="project-identifier">Identifier</Label>
          <Input
            id="project-identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="PROJ"
            pattern="[A-Z0-9]+"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Used to prefix issue numbers (e.g. PROJ-1)</p>
        </div>
        <div>
          <Label htmlFor="project-desc">Description (optional)</Label>
          <Input
            id="project-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create project'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${workspaceSlug}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
