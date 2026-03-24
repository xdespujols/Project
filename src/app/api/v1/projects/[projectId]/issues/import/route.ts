import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import { issues, states, projects, workspaceMembers } from '@/db/schema';
import { eq, and, max } from 'drizzle-orm';
import { apiResponse, apiError } from '@/lib/utils';

/** Minimal CSV parser — handles quoted cells with commas/newlines */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(cell.trim()); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell.trim()); cell = '';
        if (row.some((c) => c !== '')) rows.push(row);
        row = [];
      } else {
        cell += ch;
      }
    }
    i++;
  }

  if (cell || row.length) {
    row.push(cell.trim());
    if (row.some((c) => c !== '')) rows.push(row);
  }

  return rows;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { projectId } = await params;

  const [project] = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return apiError('Not found', 404);

  const [member] = await db
    .select({ id: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, project.workspaceId),
        eq(workspaceMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!member) return apiError('Forbidden', 403);

  const formData = await req.formData();
  const file = formData.get('file');
  if (!file || typeof file === 'string') return apiError('No file provided', 422);

  const text = await (file as File).text();
  const allRows = parseCSV(text);
  if (allRows.length < 2) return apiError('CSV has no data rows', 422);

  const header = allRows[0].map((h) => h.toLowerCase().trim());
  const titleIdx = header.indexOf('title');
  if (titleIdx === -1) return apiError('CSV must have a "Title" column', 422);

  const priorityIdx = header.indexOf('priority');

  // Get default state for project
  const [defaultState] = await db
    .select({ id: states.id })
    .from(states)
    .where(and(eq(states.projectId, projectId), eq(states.isDefault, 1)))
    .limit(1);

  // Get next sequenceId
  const [{ maxSeq }] = await db
    .select({ maxSeq: max(issues.sequenceId) })
    .from(issues)
    .where(eq(issues.projectId, projectId));

  let nextSeq = (maxSeq ?? 0) + 1;

  const VALID_PRIORITIES = ['none', 'urgent', 'high', 'medium', 'low'] as const;
  type Priority = (typeof VALID_PRIORITIES)[number];

  const toInsert = allRows.slice(1).filter((row) => row[titleIdx]?.trim()).map((row) => {
    const rawPriority = row[priorityIdx]?.toLowerCase().trim() as Priority;
    const priority: Priority = VALID_PRIORITIES.includes(rawPriority) ? rawPriority : 'none';
    return {
      projectId,
      sequenceId: nextSeq++,
      title: row[titleIdx],
      priority,
      stateId: defaultState?.id ?? null,
      createdBy: session.user.id,
    };
  });

  if (toInsert.length === 0) return apiError('No valid rows found', 422);

  const created = await db.insert(issues).values(toInsert).returning({ id: issues.id });

  return apiResponse({ imported: created.length });
}
