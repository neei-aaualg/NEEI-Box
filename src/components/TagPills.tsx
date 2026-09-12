import { parseTags, tagKey } from '@/lib/tags';

interface TagPillsProps {
  value: string | null | undefined;
  onSelect?: (tag: string) => void;
}

export default function TagPills({ value, onSelect }: TagPillsProps) {
  const tags = parseTags(value);
  if (tags.length === 0) return null;

  const baseClass =
    'inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800 ring-1 ring-brand-100 transition-colors dark:bg-brand-950 dark:text-brand-300 dark:ring-brand-900';

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const key = tagKey(tag);

        const content = (
          <>
            <svg
              aria-hidden="true"
              className="h-3 w-3 opacity-70"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6h.008v.008H6V6z"
              />
            </svg>
            {tag}
          </>
        );

        if (onSelect) {
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              title={`Filtrar por ${tag}`}
              className={`${baseClass} hover:bg-brand-100 hover:ring-brand-200 dark:hover:bg-brand-900`}
            >
              {content}
            </button>
          );
        }

        return (
          <span key={key} className={baseClass}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
