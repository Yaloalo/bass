import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';
import { roots, pretty } from '../lib/music';
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    play: <path d="m8 5 11 7-11 7Z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    book: (
      <>
        <path d="M12 5v15M3 4h5l4 2 4-2h5v15h-5l-4 2-4-2H3Z" />
      </>
    ),
    grid: (
      <>
        <path d="M3 6h18M3 10h18M3 14h18M3 18h18M7 3v18M12 3v18M17 3v18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
    metronome: (
      <>
        <path d="m9 3-5 18h16L15 3ZM12 16l6-9M7 17h10" />
      </>
    ),
    music: (
      <>
        <path d="M9 18V5l11-2v13M9 9l11-2" />
        <ellipse cx="6" cy="18" rx="3" ry="2" />
        <ellipse cx="17" cy="16" rx="3" ry="2" />
      </>
    ),
    repeat: <path d="M4 8h14l-3-3m5 11H6l3 3M20 8v4M4 16v-4" />,
    home: (
      <>
        <path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8" />
      </>
    ),
    layers: <path d="m12 3 10 5-10 5L2 8Zm-9 10 9 5 9-5M3 18l9 5 9-5" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.book}
    </svg>
  );
}
export function RootSelector() {
  const { root, setRoot } = useStore();
  return (
    <label className="root-control">
      <span>ROOT</span>
      <select aria-label="Global root" value={root} onChange={(e) => setRoot(e.target.value)}>
        {roots.map((r) => (
          <option key={r} value={r}>
            {pretty(r)}
          </option>
        ))}
      </select>
    </label>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </header>
  );
}
export function ReferenceActions({ title }: { title: string }) {
  const { pathname } = useLocation();
  const { favorites, toggleFavorite, progress, setStatus } = useStore();
  const starred = favorites.some((x) => x.path === pathname);
  return (
    <div className="reference-actions">
      <button
        className={starred ? 'icon-button starred' : 'icon-button'}
        aria-label={starred ? 'Remove favorite' : 'Add favorite'}
        aria-pressed={starred}
        onClick={() => toggleFavorite({ title, path: pathname })}
      >
        <Icon name="star" />
      </button>
      <select
        aria-label="Study status"
        value={progress[pathname] ?? 'New'}
        onChange={(e) => setStatus(pathname, e.target.value)}
      >
        {['New', 'Learning', 'Known'].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </div>
  );
}
export function Panel({
  title,
  children,
  aside,
  className = '',
  id,
}: {
  title?: string;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
export function Pill({ children }: { children: ReactNode }) {
  return <span className="pill">{children}</span>;
}
export function Segmented({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((x) => (
        <button
          key={x}
          aria-pressed={value === x}
          className={value === x ? 'selected' : ''}
          onClick={() => onChange(x)}
        >
          {x}
        </button>
      ))}
    </div>
  );
}
export function ReferenceTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function ItemLink({
  title,
  description,
  to,
  meta,
}: {
  title: string;
  description?: string;
  to: string;
  meta?: ReactNode;
}) {
  return (
    <Link className="item-link" to={to}>
      <div>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      <span>
        {meta}
        <Icon name="arrow" />
      </span>
    </Link>
  );
}
export function usePageTitle(title: string) {
  const { pathname } = useLocation();
  const { visit } = useStore();
  const old = useRef('');
  useEffect(() => {
    document.title = `${title} · Bass Reference`;
    if (old.current !== pathname) {
      old.current = pathname;
      visit({ title, path: pathname });
    }
  }, [title, pathname, visit]);
}
export function Notice({ children }: { children: ReactNode }) {
  return <div className="notice">{children}</div>;
}
export function AudioError({ error }: { error: string }) {
  return error ? (
    <span role="status" className="error-text">
      {error}
    </span>
  ) : null;
}
export function CopyNotes({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? 'Copied' : 'Copy notes'}
    </button>
  );
}
