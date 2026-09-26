import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { scales, programs, exercises, exercisePath, theoryPages, search } from '../data/catalog';
import { Icon, RootSelector, ScaleSelector } from './UI';
import { ThemeToggle } from './ThemeToggle';
import { areas, areaForPath, areaPath, areaPresentation } from '../data/navigation';
import type { AreaId } from '../data/navigation';
import { textDe } from '../lib/i18n';
import { chords } from '../data/chords';
import { chordFamilies } from '../lib/chord-types';
import { useRhythm } from '../lib/rhythm-store';
import { useStore } from '../lib/store';
import { instrumentProfile } from '../lib/instrument';
import type { InstrumentId } from '../lib/instrument';
export const chapters = areas.map((area) => area.title);
interface MenuItem {
  title: string;
  path: string;
  group: string;
}
export function chapterItems(chapter: string, instrument: InstrumentId = 'bass'): MenuItem[] {
  const area = areas.find((a) => a.id === chapter);
  if (area) return [...areaPresentation(area, instrument).items];
  if (chapter === 'practice')
    return [...areas.find((a) => a.id === 'bass')!.items.filter((i) => i.group === 'Üben')];
  if (chapter === 'tools')
    return [
      { title: 'Drum-Maschine', path: '/drums', group: 'Rhythmus' },
      { title: 'Metronom', path: '/tools/metronome', group: 'Rhythmus' },
    ];
  if (chapter === 'scales')
    return [
      ...scales
        .filter((s) => s.category === 'Core')
        .map((s) => ({ title: s.name, path: `/scales/${s.id}`, group: s.category })),
      { title: 'Ionisch (= Dur)', path: '/scales/ionian', group: 'Modes' },
      ...scales
        .filter((s) => s.category === 'Modes' && s.id !== 'locrian')
        .map((s) => ({ title: s.name, path: `/scales/${s.id}`, group: s.category })),
      { title: 'Äolisch (= natürliches Moll)', path: '/scales/aeolian', group: 'Modes' },
      { title: 'Lokrisch', path: '/scales/locrian', group: 'Modes' },
      ...scales
        .filter((s) => s.category === 'Minor systems')
        .map((s) => ({ title: s.name, path: `/scales/${s.id}`, group: s.category })),
    ];
  if (chapter === 'chords' || chapter === 'arpeggios')
    return chordFamilies
      .filter((family) => chords.some((chord) => chord.family === family.id))
      .flatMap((family) =>
        chords
          .filter((chord) => chord.family === family.id)
          .map((chord) => ({
            title: chord.nameDe,
            path: `/chords/${chord.id}`,
            group: family.name,
          })),
      );
  if (chapter === 'exercises')
    return exercises.map((e) => ({
      title: `${e.id} · ${e.title.replace(/^D /, '')}`,
      path: exercisePath(e),
      group: e.category === 'physical' ? 'Technik' : 'Musikalisch',
    }));
  if (chapter === 'programs')
    return programs.map((p) => ({
      title: p.name,
      path: `/programs/${p.id}`,
      group: '30-Minuten-Programme',
    }));
  if (chapter === 'theory')
    return theoryPages.map(([id, title]) => ({
      title: textDe(title),
      path: `/theory/${id}`,
      group: 'Kurz nachschlagen',
    }));
  if (chapter === 'basslines')
    return [
      {
        title: instrument === 'guitar' ? 'Gitarrenlinie bauen' : 'Basslinie bauen',
        path: '/basslines',
        group: 'Gestalten',
      },
      { title: 'Salsa / Latin', path: '/basslines/latin', group: 'Anwendung' },
    ];
  if (chapter === 'improvisation')
    return [
      { title: 'Improvisieren', path: '/improvisation', group: 'Vor dem Spielen' },
      { title: 'Mitspielen', path: '/improvisation/play', group: 'Beim Spielen' },
      { title: 'Salsa / Latin', path: '/improvisation/latin', group: 'Anwendung' },
    ];
  if (chapter === 'chords' || chapter === 'harmony')
    return [
      { title: 'Akkorde', path: '/chords', group: 'Harmonie' },
      { title: 'Diatonische Harmonie', path: '/harmony', group: 'Harmonie' },
    ];
  return [];
}
export function ChapterSidebar() {
  const { instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const { pathname } = useLocation();
  const areaId = areaForPath(pathname);
  const area = areas.find((candidate) => candidate.id === areaId);
  const presentation = area ? areaPresentation(area, instrument) : undefined;
  const items = presentation ? [...presentation.items] : [];
  const navigate = useNavigate();
  if (!areaId || areaId === 'drums' || !presentation || !items.length) return null;
  const groups = [...new Set(items.map((i) => i.group))];
  const sectionPath =
    pathname.startsWith('/harmony') || pathname.startsWith('/arpeggios')
      ? '/chords'
      : pathname.startsWith('/theory') || pathname.startsWith('/pdf')
        ? '/grundlagen'
        : pathname;
  const current =
    [...items]
      .sort((a, b) => b.path.length - a.path.length)
      .find((item) => sectionPath === item.path || sectionPath.startsWith(`${item.path}/`))?.path ??
    areaPath(areaId);
  return (
    <aside className="chapter-sidebar">
      <Link to={areaPath(areaId)} className="chapter-title">
        <Icon name={areaId === 'musiktheorie' ? 'book' : 'grid'} />
        {presentation.title}
      </Link>
      <label className="mobile-chapter">
        <span>BEREICHSNAVIGATION</span>
        <select
          aria-label={`${presentation.title}: Seite wählen`}
          value={current}
          onChange={(e) => navigate(e.target.value)}
        >
          <option value={areaPath(areaId)}>Bereichsübersicht</option>
          {groups.map((g) => (
            <optgroup key={g} label={textDe(g)}>
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
      <nav aria-label={`${presentation.title}: Bereichsnavigation`} className="sidebar-links">
        {groups.map((g) => (
          <div key={g} className="sidebar-group">
            <div className="eyebrow">{textDe(g)}</div>
            {items
              .filter((i) => i.group === g)
              .map((i) => (
                <NavLink
                  key={i.path}
                  to={i.path}
                  className={({ isActive }) => (isActive || current === i.path ? 'active' : '')}
                >
                  {i.title}
                </NavLink>
              ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <span className="mini-rule" />
        {instrument === 'guitar' ? 'STANDARD-SECHSSAITER' : 'STANDARD-VIERSAITER'}
        <br />
        <strong>{profile.tuningLabel}</strong>
        <span>Nachschlagen • Üben • Improvisieren</span>
      </div>
    </aside>
  );
}
export function Navigation() {
  const [menu, setMenu] = useState(''),
    [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { instrument, setInstrument } = useStore();
  const profile = instrumentProfile(instrument);
  const { stop } = useRhythm();
  const header = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);
  useEffect(() => {
    setMenu('');
    if (previousPath.current !== pathname) stop();
    previousPath.current = pathname;
  }, [pathname, stop]);
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
  const active = areaForPath(pathname);
  return (
    <>
      <a className="skip-link" href="#main">
        Zum Inhalt springen
      </a>
      <header className="app-header" ref={header}>
        <div className="topbar">
          <button
            type="button"
            className="brand instrument-brand-toggle"
            aria-label={`${profile.name} ausgewählt. Zu ${instrument === 'bass' ? 'Gitarre' : 'Bass'} wechseln`}
            title={`Zu ${instrument === 'bass' ? 'Gitarre' : 'Bass'} wechseln`}
            onClick={() => {
              const next = instrument === 'bass' ? 'guitar' : 'bass';
              setInstrument(next);
              if (pathname === '/gitarrenakkorde' && next === 'bass') navigate('/bass');
            }}
          >
            <span className={`brand-mark ${instrument}`} aria-hidden="true">
              {profile.stringsHighToLow.map((string) => (
                <i key={string.id} />
              ))}
            </span>
            <span className="instrument-switch-mobile" aria-hidden="true">
              {profile.nameUpper} ↔
            </span>
            <div>
              {profile.nameUpper}
              <span>REFERENCE</span>
            </div>
            <small>
              {profile.tagline}
              <b>↔ INSTRUMENT WECHSELN</b>
            </small>
          </button>
          <div className="topbar-actions">
            <button
              aria-label="Workstation durchsuchen"
              className="search-trigger"
              onClick={() => setSearchOpen(true)}
            >
              <Icon name="search" />
              <span>Workstation durchsuchen…</span>
              <kbd>Ctrl K</kbd>
            </button>
            <ThemeToggle />
            <RootSelector />
            <ScaleSelector />
          </div>
        </div>
        <nav className="top-nav" aria-label="Hauptbereiche">
          <NavLink to="/" end className="home-link" aria-label="Startseite">
            <Icon name="home" size={17} />
          </NavLink>
          {areas.map((sourceArea) => {
            const { id, title: ch } = areaPresentation(sourceArea, instrument);
            const items = id === 'drums' ? [] : chapterItems(id, instrument);
            return (
              <div key={id} className={`nav-chapter ${active === id ? 'active' : ''}`}>
                <NavLink to={areaPath(id)} aria-current={active === id ? 'page' : undefined}>
                  {ch}
                </NavLink>
                {items.length > 0 && (
                  <button
                    aria-label={`${ch}: Menü öffnen`}
                    aria-expanded={menu === id}
                    onClick={() => setMenu(menu === id ? '' : id)}
                  >
                    <Icon name="chevron" size={12} />
                  </button>
                )}
              </div>
            );
          })}
          <div className={`nav-chapter ${pathname === '/tools/metronome' ? 'active' : ''}`}>
            <NavLink
              to="/tools/metronome"
              aria-current={pathname === '/tools/metronome' ? 'page' : undefined}
            >
              METRONOM
            </NavLink>
          </div>
          <span className="nav-edition">DEINE {profile.nameUpper} WORKSTATION</span>
        </nav>
        {menu && (
          <div className="mega-menu">
            <div className="mega-title">
              <span className="eyebrow">{menu === 'bass' ? profile.nameUpper : menu}</span>
              <Link to={areaPath(menu as AreaId)} onClick={() => setMenu('')}>
                Bereichsübersicht <Icon name="arrow" size={14} />
              </Link>
              <button
                className="icon-button"
                aria-label="Bereichsmenü schließen"
                onClick={() => setMenu('')}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="mega-groups">
              {[...new Set(chapterItems(menu, instrument).map((i) => i.group))].map((g) => (
                <div key={g}>
                  <h3>{textDe(g)}</h3>
                  {chapterItems(menu, instrument)
                    .filter((i) => i.group === g)
                    .map((i) => (
                      <Link
                        to={i.path}
                        key={i.path}
                        onClick={() => {
                          setMenu('');
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
      aria-label="Workstation durchsuchen"
    >
      <div className="search-field">
        <Icon name="search" size={22} />
        <input
          autoFocus
          aria-label="Tonleitern, Übungen und Theorie suchen"
          placeholder="Tonleiter, Formel, Übung, Begriff…"
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
        <button className="icon-button" aria-label="Suche schließen" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="search-results">
        <div className="eyebrow">{query ? `${results.length} Treffer` : 'DIREKT ÖFFNEN'}</div>
        {results.map((r, i) => (
          <button
            className={`search-result ${selected === i ? 'selected' : ''}`}
            key={r.path + r.title}
            onClick={() => go(r.path)}
            onFocus={() => setSelected(i)}
          >
            <span>
              <strong>{r.title}</strong>
              <small>{textDe(r.category)}</small>
            </span>
            <Icon name="arrow" />
          </button>
        ))}
        {!results.length && (
          <p className="empty-state">
            Keine Treffer. Probiere „Dorisch“, „1 b3 5“, „Dämpfen“ oder „Übung 14“.
          </p>
        )}
      </div>
      <div className="search-foot">
        ↑ ↓ wählen · Enter öffnen · Esc schließen<span>Auch offline</span>
      </div>
    </dialog>
  );
}
