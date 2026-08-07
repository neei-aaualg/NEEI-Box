'use client';

import Image from 'next/image';
import {
  getFileType,
  getFileTypeMeta,
  getFileNameFromWebUrl,
} from '@/lib/file-types';

interface MaterialPreviewProps {
  title: string;
  webUrl: string;
  fileName?: string;
}

export default function MaterialPreview({
  title,
  webUrl,
  fileName,
}: MaterialPreviewProps) {
  const displayName = fileName ?? getFileNameFromWebUrl(webUrl);
  const fileType = getFileType(displayName);
  const meta = getFileTypeMeta(fileType);
  const isImage = fileType === 'image';

  return (
    <div
      aria-hidden="true"
      className="relative h-36 overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50 dark:border-white/10 dark:bg-night-800"
    >
      {isImage ? (
        <Image
          src={webUrl}
          alt=""
          fill
          unoptimized
          sizes="(min-width: 640px) 208px, 100vw"
          className="object-cover"
        />
      ) : (
        <div
          className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br ${meta.gradient}`}
        >
          <svg
            className="h-10 w-10 text-white/90"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <span className="text-xs font-bold uppercase tracking-widest text-white">
            {meta.label}
          </span>
        </div>
      )}

      <span
        title={displayName}
        className="absolute left-2 top-2 inline-flex max-w-[75%] items-center gap-1 truncate rounded-full bg-night-950/70 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur"
      >
        <svg
          className="h-3 w-3 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <span className="truncate">{displayName}</span>
      </span>

      <span className="sr-only">{title}</span>
    </div>
  );
}
