import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { StoreProvider } from './lib/store';
import { Navigation, ChapterSidebar } from './components/Navigation';
import { Home } from './pages/Home';
import { FretboardPage } from './pages/FretboardPage';
import { ExerciseLibrary, ExercisePage } from './pages/Exercises';
import { ProgramLibrary, ProgramPage } from './pages/Programs';
import { Chords, Harmony, Theory } from './pages/Theory';
import { Basslines, Latin } from './pages/Basslines';
import { Improvisation, PlayAlong } from './pages/Improvisation';
import { Pdf } from './pages/Pdf';
import { ReferenceIndex, ReferencePage } from './pages/Reference';
import { PageHeading } from './components/UI';
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
  return (
    <>
      <Navigation />
      <ScrollReset />
      <div className={`app-layout ${pathname === '/' ? 'home-layout' : ''}`}>
        <ChapterSidebar />
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/scales" element={<ReferenceIndex kind="scales" />} />
            <Route path="/scales/:id" element={<ReferencePage kind="scales" />} />
            <Route path="/arpeggios" element={<ReferenceIndex kind="arpeggios" />} />
            <Route path="/arpeggios/:id" element={<ReferencePage kind="arpeggios" />} />
            <Route path="/fretboard" element={<FretboardPage />} />
            <Route path="/exercises" element={<ExerciseLibrary />} />
            <Route path="/exercises/:category" element={<ExerciseLibrary />} />
            <Route path="/exercises/:category/:number" element={<ExercisePage />} />
            <Route path="/programs" element={<ProgramLibrary />} />
            <Route path="/programs/:id" element={<ProgramPage />} />
            <Route path="/chords" element={<Chords />} />
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
                  eyebrow="REFERENCE"
                  title="Page not found"
                  description="Choose a chapter to return to the reference."
                  actions={<Link to="/">Return to workstation</Link>}
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
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </StoreProvider>
  );
}
