import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  scales,
  arpeggios,
  programs,
  exercises,
  exercisePath,
  theoryPages,
  search,
} from '../data/catalog';
import { Icon, RootSelector } from './UI';
import { Metronome } from './Metronome';
export const chapters = [
  'Fretboard',
  'Scales',
  'Arpeggios',
  'Chords',
  'Basslines',
  'Improvisation',
  'Exercises',
  'Programs',
  'Theory',
  'PDF',
];
interface MenuItem {
  title: string;
  path: string;
  group: string;
}
export function chapterItems(chapter: string): MenuItem[] {
  if (chapter === 'scales')
    return [
      ...scales
        .filter((s) => s.category === 'Core')
        .map((s) => ({ title: s.name, path: `/scales/${s.id}`, group: s.category })),
      { title: 'Ionian (= Major)', path: '/scales/ionian', group: 'Modes' },
      ...scales
        .filter((s) => s.category === 'Modes' && s.id !== 'locrian')
        .map((s) => ({ title: s.name, path: `/scales/${s.id}`, group: s.category })),
      { title: 'Aeolian (= Natural minor)', path: '/scales/aeolian', group: 'Modes' },
      { title: 'Locrian', path: '/scales/locrian', group: 'Modes' },
      ...scales
        .filter((s) => s.category === 'Minor systems')
        .map((s) => ({ title: s.name, path: `/scales/${s.id}`, group: s.category })),
    ];
  if (chapter === 'arpeggios')
    return arpeggios.map((s) => ({ title: s.name, path: `/arpeggios/${s.id}`, group: s.category }));
  if (chapter === 'exercises')
    return exercises.map((e) => ({
      title: `${e.id} · ${e.title.replace(/^D /, '')}`,
      path: exercisePath(e),
      group: e.category === 'physical' ? 'Physical' : 'Musical',
    }));
  if (chapter === 'programs')
    return programs.map((p) => ({
      title: p.name,
      path: `/programs/${p.id}`,
      group: '30-minute programs',
    }));
  if (chapter === 'theory')
    return theoryPages.map(([id, title]) => ({
      title,
      path: `/theory/${id}`,
      group: 'Quick reference',
    }));
  if (chapter === 'basslines')
    return [
      { title: 'Build a bassline', path: '/basslines', group: 'Construction' },
      { title: 'Salsa / Latin', path: '/basslines/latin', group: 'Application' },
    ];
  if (chapter === 'improvisation')
    return [
      { title: 'Quick impro guide', path: '/improvisation', group: 'Before playing' },
      { title: 'Play-along screen', path: '/improvisation/play', group: 'While playing' },
      { title: 'Salsa / Latin', path: '/improvisation/latin', group: 'Application' },
    ];
  if (chapter === 'chords' || chapter === 'harmony')
    return [
      { title: 'Chord formulas', path: '/chords', group: 'Harmony' },
      { title: 'Diatonic harmony', path: '/harmony', group: 'Harmony' },
    ];
  return [];
}
export function ChapterSidebar() {
  const { pathname } = useLocation();
  const chapter = pathname.split('/')[1];
  const items = chapterItems(chapter);
  const navigate = useNavigate();
  if (!items.length) return null;
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <aside className="chapter-sidebar">
      <Link to={'/' + (chapter === 'harmony' ? 'chords' : chapter)} className="chapter-title">
        <Icon name={chapter === 'scales' ? 'layers' : 'book'} />
        {chapter === 'harmony' ? 'Chords' : chapter[0].toUpperCase() + chapter.slice(1)}
      </Link>
      <label className="mobile-chapter">
        <span>IN THIS CHAPTER</span>
        <select
          aria-label="Chapter page"
          value={pathname}
          onChange={(e) => navigate(e.target.value)}
        >
          <option value={'/' + chapter}>Chapter overview</option>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {items
                .filter((i) => i.group === g)
                .map((i) => (
                  <option key={i.path} value={i.path}>
                    {i.title}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <nav aria-label="Chapter navigation" className="sidebar-links">
        {groups.map((g) => (
          <div key={g} className="sidebar-group">
            <div className="eyebrow">{g}</div>
            {items
              .filter((i) => i.group === g)
              .map((i) => (
                <NavLink key={i.path} to={i.path} end>
                  {i.title}
                </NavLink>
              ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <span className="mini-rule" />
        STANDARD FOUR-STRING
        <br />
        <strong>E · A · D · G</strong>
        <span>Reference • Practice • Improv</span>
      </div>
    </aside>
  );
}
export function Navigation() {
  const [menu, setMenu] = useState(''),
    [mobile, setMobile] = useState(false),
    [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    setMenu('');
    setMobile(false);
  }, [pathname]);
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        (e.target.matches('input,textarea,select') || e.target.isContentEditable);
      if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setMenu('');
        setMobile(false);
      }
    };
    const click = (e: PointerEvent) => {
      if (!header.current?.contains(e.target as Node)) setMenu('');
    };
    document.addEventListener('keydown', keyboard);
    document.addEventListener('pointerdown', click);
    return () => {
      document.removeEventListener('keydown', keyboard);
      document.removeEventListener('pointerdown', click);
    };
  }, []);
  const active = pathname.split('/')[1] === 'harmony' ? 'chords' : pathname.split('/')[1];
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header" ref={header}>
        <div className="topbar">
          <Link to="/" className="brand" aria-label="Bass Reference home">
            <span className="brand-mark">
              <i />
              <i />
              <i />
              <i />
            </span>
            <div>
              BASS<span>REFERENCE</span>
            </div>
            <small>THE FOUR-STRING COMPANION</small>
          </Link>
          <div className="topbar-actions">
            <button
              aria-label="Search the reference…"
              className="search-trigger"
              onClick={() => setSearchOpen(true)}
            >
              <Icon name="search" />
              <span>Search the reference…</span>
              <kbd>Ctrl K</kbd>
            </button>
            <RootSelector />
            <button
              className="mobile-toggle icon-button"
              aria-label="Toggle navigation"
              aria-expanded={mobile}
              onClick={() => setMobile((v) => !v)}
            >
              <Icon name={mobile ? 'close' : 'menu'} />
            </button>
          </div>
        </div>
        <nav className={`top-nav ${mobile ? 'expanded' : ''}`} aria-label="Main chapters">
          <NavLink to="/" end className="home-link" aria-label="Workstation home">
            <Icon name="home" size={17} />
          </NavLink>
          {chapters.map((ch) => {
            const id = ch.toLowerCase(),
              items = chapterItems(id);
            return (
              <div key={id} className={`nav-chapter ${active === id ? 'active' : ''}`}>
                <NavLink to={'/' + id} aria-current={active === id ? 'page' : undefined}>
                  {ch}
                </NavLink>
                {items.length > 0 && (
                  <button
                    aria-label={`Open ${ch} chapter menu`}
                    aria-expanded={menu === id}
                    onClick={() => setMenu(menu === id ? '' : id)}
                  >
                    <Icon name="chevron" size={12} />
                  </button>
                )}
              </div>
            );
          })}
          <span className="nav-edition">COMPLETE EDITION · 01</span>
        </nav>
        {menu && (
          <div className="mega-menu">
            <div className="mega-title">
              <span className="eyebrow">{menu}</span>
              <Link to={'/' + menu} onClick={() => setMenu('')}>
                Chapter overview <Icon name="arrow" size={14} />
              </Link>
              <button
                className="icon-button"
                aria-label="Close chapter menu"
                onClick={() => setMenu('')}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="mega-groups">
              {[...new Set(chapterItems(menu).map((i) => i.group))].map((g) => (
                <div key={g}>
                  <h3>{g}</h3>
                  {chapterItems(menu)
                    .filter((i) => i.group === g)
                    .map((i) => (
                      <Link
                        to={i.path}
                        key={i.path}
                        onClick={() => {
                          setMenu('');
                          setMobile(false);
                        }}
                      >
                        {i.title}
                      </Link>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>
      <footer className="utility-bar">
        <div className="utility-note">
          <span className="status-dot" />
          YOUR PERSONAL BASS WORKSTATION
        </div>
        <Metronome />
        <span className="utility-tip">
          Press <kbd>/</kbd> to search
        </span>
      </footer>
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </>
  );
}
function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState(''),
    [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const results = search(query);
  const previousFocus = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => previousFocus.current?.focus();
  }, []);
  const go = (path: string) => {
    navigate(path);
    onClose();
  };
  return (
    <dialog
      className="search-dialog"
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
      aria-label="Search reference"
    >
      <div className="search-field">
        <Icon name="search" size={22} />
        <input
          autoFocus
          aria-label="Search scales, exercises and theory"
          placeholder="Scale, formula, exercise, concept…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelected((v) => Math.min(v + 1, results.length - 1));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelected((v) => Math.max(0, v - 1));
            }
            if (e.key === 'Enter' && results[selected]) go(results[selected].path);
          }}
        />
        <button className="icon-button" aria-label="Close search" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="search-results">
        <div className="eyebrow">{query ? `${results.length} results` : 'JUMP TO A REFERENCE'}</div>
        {results.map((r, i) => (
          <button
            className={`search-result ${selected === i ? 'selected' : ''}`}
            key={r.path + r.title}
            onClick={() => go(r.path)}
            onFocus={() => setSelected(i)}
          >
            <span>
              <strong>{r.title}</strong>
              <small>{r.category}</small>
            </span>
            <Icon name="arrow" />
          </button>
        ))}
        {!results.length && (
          <p className="empty-state">
            No results. Try “Dorian”, “1 b3 5”, “muting”, or “exercise 14”.
          </p>
        )}
      </div>
      <div className="search-foot">
        ↑ ↓ to choose · Enter to open · Esc to close<span>Works offline</span>
      </div>
    </dialog>
  );
}
