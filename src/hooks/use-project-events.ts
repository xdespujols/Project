'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type ProjectEvent = {
  type: 'issue.updated' | 'issue.created' | 'issue.deleted' | 'comment.created';
  issueId?: string;
  projectId?: string;
  [key: string]: unknown;
};

type Options = {
  projectId: string;
  onEvent?: (event: ProjectEvent) => void;
  /** If true, router.refresh() is called on every event (default: true) */
  autoRefresh?: boolean;
};

export function useProjectEvents({ projectId, onEvent, autoRefresh = true }: Options) {
  const router = useRouter();

  const handleEvent = useCallback(
    (event: ProjectEvent) => {
      onEvent?.(event);
      if (autoRefresh) router.refresh();
    },
    [onEvent, autoRefresh, router],
  );

  useEffect(() => {
    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let active = true;

    function connect() {
      es = new EventSource(`/api/v1/projects/${projectId}/events`);

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as ProjectEvent;
          handleEvent(data);
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        es.close();
        if (active) {
          reconnectTimer = setTimeout(connect, 5_000);
        }
      };
    }

    connect();

    return () => {
      active = false;
      clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [projectId, handleEvent]);
}
