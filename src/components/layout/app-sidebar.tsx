'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Circle,
  Layers,
  Calendar,
  BookOpen,
  Inbox,
  Bell,
  Settings,
  ChevronDown,
  Table,
  GanttChart,
  Milestone,
  BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Project = {
  id: string;
  name: string;
  identifier: string;
};

type Props = {
  workspaceSlug: string;
  projects: Project[];
  currentProjectId?: string;
};

const PROJECT_NAV = [
  { label: 'Issues', href: 'issues', icon: Circle },
  { label: 'Board', href: 'board', icon: LayoutDashboard },
  { label: 'Spreadsheet', href: 'spreadsheet', icon: Table },
  { label: 'Gantt', href: 'gantt', icon: GanttChart },
  { label: 'Cycles', href: 'cycles', icon: Calendar },
  { label: 'Modules', href: 'modules', icon: Layers },
  { label: 'Epics', href: 'epics', icon: Milestone },
  { label: 'Pages', href: 'pages', icon: BookOpen },
  { label: 'Intake', href: 'intake', icon: Inbox },
  { label: 'Analytics', href: 'analytics', icon: BarChart2 },
];

export function AppSidebar({ workspaceSlug, projects, currentProjectId }: Props) {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-gray-900 text-gray-100 flex flex-col h-full">
      {/* Workspace header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <div className="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center text-xs">
            {workspaceSlug[0]?.toUpperCase()}
          </div>
          <span className="truncate">{workspaceSlug}</span>
          <ChevronDown className="h-4 w-4 ml-auto opacity-60" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        <Link
          href={`/${workspaceSlug}/notifications`}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-gray-800',
            pathname === `/${workspaceSlug}/notifications` && 'bg-gray-800',
          )}
        >
          <Bell className="h-4 w-4" />
          Notifications
        </Link>
        <Link
          href={`/${workspaceSlug}/initiatives`}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-gray-800',
            pathname.startsWith(`/${workspaceSlug}/initiatives`) && 'bg-gray-800',
          )}
        >
          <Milestone className="h-4 w-4" />
          Initiatives
        </Link>

        <div className="mt-4">
          <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Projects
          </div>

          {projects.map((project) => {
            const base = `/${workspaceSlug}/projects/${project.id}`;
            const isActive = pathname.startsWith(base);

            return (
              <div key={project.id}>
                <Link
                  href={`${base}/issues`}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-gray-800 mt-1',
                    isActive && 'bg-gray-800',
                  )}
                >
                  <div className="w-5 h-5 bg-gray-600 rounded flex items-center justify-center text-xs font-bold">
                    {project.identifier[0]}
                  </div>
                  <span className="truncate">{project.name}</span>
                </Link>

                {isActive && currentProjectId === project.id && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {PROJECT_NAV.map(({ label, href, icon: Icon }) => (
                      <Link
                        key={href}
                        href={`${base}/${href}`}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded text-xs hover:bg-gray-800 text-gray-300',
                          pathname.includes(`/${href}`) && 'bg-gray-800 text-white',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700">
        <Link
          href={`/${workspaceSlug}/settings`}
          className="flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-gray-800"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}
