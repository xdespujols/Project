import { db } from '@/db';
import { intakeForms } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { PublicIntakeForm } from './public-intake-form';

type Props = { params: Promise<{ formToken: string }> };

export default async function PublicIntakePage({ params }: Props) {
  const { formToken } = await params;

  const [form] = await db
    .select()
    .from(intakeForms)
    .where(eq(intakeForms.formToken, formToken))
    .limit(1);

  if (!form || !form.isActive) notFound();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-2">{form.title}</h1>
        {form.description && (
          <p className="text-gray-500 text-sm mb-6">{form.description}</p>
        )}
        <PublicIntakeForm formToken={formToken} />
      </div>
    </div>
  );
}
