'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Upload } from 'lucide-react';

type Props = {
  projectId: string;
};

export function ImportExportButtons({ projectId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const form = new FormData();
    form.append('file', file);

    startTransition(async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/issues/import`, {
        method: 'POST',
        body: form,
      });
      const json = await res.json();
      if (res.ok) {
        setMessage(`${json.data.imported} issues imported`);
        router.refresh();
      } else {
        setMessage(json.error ?? 'Import failed');
      }
      setTimeout(() => setMessage(null), 4000);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {message && (
        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">{message}</span>
      )}
      <a
        href={`/api/v1/projects/${projectId}/issues/export`}
        download
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
        title="Export issues as CSV"
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </a>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
        title="Import issues from CSV"
      >
        <Upload className="h-3.5 w-3.5" />
        {isPending ? 'Importing…' : 'Import'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImport}
      />
    </div>
  );
}
