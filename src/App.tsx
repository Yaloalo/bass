import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link, Navigate } from 'react-router-dom';
import { StoreProvider, useStore } from './lib/store';
import { instrumentProfile } from './lib/instrument';
import { RhythmProvider } from './lib/rhythm-store';
import { Navigation, ChapterSidebar } from './components/Navigation';
import { areaForPath } from './data/navigation';
import { Home } from './pages/Home';
import { FretboardPage } from './pages/FretboardPage';
import { ExerciseLibrary, ExercisePage } from './pages/Exercises';
import { ProgramLibrary, ProgramPage } from './pages/Programs';
import { Harmony, Theory } from './pages/Theory';
import { ArpeggioRedirect, ChordIndex, ChordPage } from './pages/Chords';
import { Area } from './pages/Area';
import { PianoPage } from './pages/Piano';
import { EarTraining } from './pages/Ear';
import { CircleOfFifths } from './pages/Circle';
import { Fundamentals } from './pages/Fundamentals';
import { Tuner } from './pages/Tuner';
import { Basslines, Latin } from './pages/Basslines';
import { Improvisation, PlayAlong } from './pages/Improvisation';
import { Pdf } from './pages/Pdf';
import { ReferenceIndex, ReferencePage } from './pages/Reference';
import { PageHeading } from './components/UI';
import { ToolsPage } from './pages/Tools';
import { Drums } from './pages/Drums';
import { TheoryMemory } from './pages/TheoryMemory';
import { GuitarChords } from './pages/GuitarChords';
function ScrollReset() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
function Layout() {
  const { pathname } = useLocation();
  const { instrument } = useStore();
  const [areaNavigationOpen, setAreaNavigationOpen] = useState(false);
  const profile = instrumentProfile(instrument);
  // Full-width pages: tools and area hubs, where a chapter
  // list in the margin only invites you to click out of the session you just started.
  const fullWidth =
    pathname === '/drums' ||
    pathname.startsWith('/tools') ||
    ['/musiktheorie', '/bass'].includes(pathname);
  const areaNavigationAvailable =
    pathname !== '/' && !fullWidth && areaForPath(pathname) !== 'drums';
  return (
    <>
      <Navigation />
      <ScrollReset />
      {areaNavigationAvailable && (
        <div className="area-navigation-toggle-strip">
          <button
            type="button"
            className={areaNavigationOpen ? 'active' : ''}
            aria-expanded={areaNavigationOpen}
            aria-controls="area-navigation"
            onClick={() => setAreaNavigationOpen((open) => !open)}
          >
            {areaNavigationOpen ? 'Bereichsnavigation ausblenden' : 'Bereichsnavigation anzeigen'}
          </button>
        </div>
      )}
      <div className={`app-layout ${pathname === '/' || fullWidth ? 'home-layout' : ''}`}>
        {areaNavigationAvailable && areaNavigationOpen && <ChapterSidebar />}
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/drums" element={<Drums />} />
            <Route path="/musiktheorie" element={<Area id="musiktheorie" />} />
            <Route path="/bass" element={<Area id="bass" />} />
            <Route path="/tools" element={<Navigate to="/drums" replace />} />
            <Route path="/piano" element={<PianoPage />} />
            <Route path="/auswendig-lernen" element={<TheoryMemory />} />
            <Route path="/gehoer" element={<EarTraining />} />
            <Route path="/quintenzirkel" element={<CircleOfFifths />} />
            <Route path="/grundlagen" element={<Fundamentals />} />
            <Route path="/tools/drums" element={<Navigate to="/drums" replace />} />
            <Route path="/tools/metronome" element={<ToolsPage />} />
            <Route path="/scales" element={<ReferenceIndex />} />
            <Route path="/scales/:id" element={<ReferencePage />} />
            {/* Arpeggios are chords played in sequence, so they live on the chord pages. */}
            <Route path="/arpeggios" element={<Navigate to="/chords" replace />} />
            <Route path="/arpeggios/:id" element={<ArpeggioRedirect />} />
            <Route path="/fretboard" element={<FretboardPage />} />
            <Route path="/stimmgeraet" element={<Tuner />} />
            <Route path="/gitarrenakkorde" element={<GuitarChords />} />
            <Route path="/exercises" element={<ExerciseLibrary />} />
            <Route path="/exercises/:category" element={<ExerciseLibrary />} />
            <Route path="/exercises/:category/:number" element={<ExercisePage />} />
            <Route path="/programs" element={<ProgramLibrary />} />
            <Route path="/programs/:id" element={<ProgramPage />} />
            <Route path="/chords" element={<ChordIndex />} />
            <Route path="/chords/:id" element={<ChordPage />} />
            <Route path="/harmony" element={<Harmony />} />
            <Route path="/theory" element={<Theory />} />
            <Route path="/theory/:id" element={<Theory />} />
            <Route path="/basslines" element={<Basslines />} />
            <Route path="/basslines/latin" element={<Latin />} />
            <Route path="/improvisation" element={<Improvisation />} />
            <Route path="/improvisation/play" element={<PlayAlong />} />
            <Route path="/improvisation/latin" element={<Latin improvisation />} />
            <Route path="/pdf" element={<Pdf />} />
            <Route
              path="*"
              element={
                <PageHeading
                  eyebrow={`${profile.nameUpper} WORKSTATION`}
                  title="Seite nicht gefunden"
                  description="Wähle einen Bereich aus der Navigation."
                  actions={<Link to="/">Zur Startseite</Link>}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </>
  );
}
export default function App() {
  return (
    <StoreProvider>
      <RhythmProvider>
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      </RhythmProvider>
    </StoreProvider>
  );
}
