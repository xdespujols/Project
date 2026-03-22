'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PropertyType =
  | 'text'
  | 'number'
  | 'checkbox'
  | 'date'
  | 'select'
  | 'multi_select'
  | 'url'
  | 'email'
  | 'member';

type CustomProperty = {
  id: string;
  name: string;
  type: PropertyType;
  isRequired: boolean;
  sortOrder: number;
};

const TYPE_LABELS: Record<PropertyType, string> = {
  text: 'Text',
  number: 'Number',
  checkbox: 'Checkbox',
  date: 'Date',
  select: 'Select',
  multi_select: 'Multi-select',
  url: 'URL',
  email: 'Email',
  member: 'Member',
};

export function CustomPropertiesManager({
  properties,
  projectId,
}: {
  properties: CustomProperty[];
  projectId: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('text');
  const [loading, setLoading] = useState(false);

  async function createProperty(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/v1/projects/${projectId}/custom-properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type }),
    });
    setLoading(false);
    setAdding(false);
    setName('');
    setType('text');
    router.refresh();
  }

  async function deleteProperty(id: string) {
    await fetch(`/api/v1/projects/${projectId}/custom-properties/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {properties.map((prop) => (
        <div key={prop.id} className="flex items-center gap-3 border rounded-lg px-4 py-3 bg-white">
          <div className="flex-1">
            <span className="font-medium text-sm">{prop.name}</span>
            <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {TYPE_LABELS[prop.type]}
            </span>
            {prop.isRequired && (
              <span className="ml-2 text-xs text-red-500">Required</span>
            )}
          </div>
          <button
            onClick={() => deleteProperty(prop.id)}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {adding ? (
        <form onSubmit={createProperty} className="flex gap-2 border rounded-lg px-4 py-3 bg-gray-50">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Property name"
            className="flex-1 h-8 text-sm"
            required
          />
          <Select value={type} onValueChange={(v) => setType(v as PropertyType)}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" type="submit" disabled={loading}>Add</Button>
          <Button size="sm" type="button" variant="outline" onClick={() => { setAdding(false); setName(''); }}>
            Cancel
          </Button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 mt-2"
        >
          <Plus className="h-4 w-4" /> Add property
        </button>
      )}
    </div>
  );
}
