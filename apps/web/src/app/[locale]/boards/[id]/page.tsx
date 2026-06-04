// Design Ref: §5 Phase 4 — 게시글 상세 (평문 content, 줄바꿈 보존)
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import type { Locale } from '@wolf/shared';
import { getDictionary } from '@/i18n/dictionaries';
import { getBoard, type BoardType } from '@/lib/queries/boards';

export const dynamic = 'force-dynamic';

export default async function BoardPostPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const locale = params.locale as Locale;
  const [dict, post] = await Promise.all([getDictionary(locale), getBoard(params.id)]);

  if (!post || post.status !== 'open') notFound();

  const label = post.board_type ? dict.boards[post.board_type as BoardType] : null;

  return (
    <article className="container-wolf max-w-2xl py-8">
      <Link
        href={`/${locale}/boards`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-grey-500 hover:text-black"
      >
        <ChevronLeft size={16} /> {dict.boards.title}
      </Link>

      <div className="flex items-center gap-3 border-b border-grey-200 pb-4">
        {label && (
          <span className="rounded-pill bg-grey-100 px-2.5 py-1 text-xs font-medium text-grey-600">
            {label}
          </span>
        )}
        <time className="text-xs text-grey-400">{String(post.created_at).slice(0, 10)}</time>
      </div>

      <h1 className="mt-4 font-display text-2xl uppercase tracking-tight md:text-3xl">
        {post.title || '—'}
      </h1>

      <div className="mt-6 whitespace-pre-wrap text-grey-800">{post.content}</div>
    </article>
  );
}
