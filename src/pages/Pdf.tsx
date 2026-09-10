import { useEffect, useState } from 'react';
import { PageHeading, Panel, Icon, Notice, usePageTitle } from '../components/UI';
const pdf = '/bass_complete_reference_practice_improv_v5-1.pdf';
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function Pdf() {
  usePageTitle('The complete reference PDF');
  const [embed, setEmbed] = useState(false),
    [cached, setCached] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [prompt, setPrompt] = useState<InstallPrompt | null>(null),
    [installMessage, setInstallMessage] = useState('');
  useEffect(() => {
    if ('caches' in window)
      caches
        .match(pdf)
        .then((response) => setCached(!!response))
        .catch(() => {});
    const handle = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', handle);
    return () => window.removeEventListener('beforeinstallprompt', handle);
  }, []);
  const save = async () => {
    setBusy(true);
    try {
      const response = await fetch(pdf);
      if (!response.ok) throw new Error();
      const cache = await caches.open('bass-pdf-v1');
      await cache.put(pdf, response);
      setCached(true);
      setMessage('The complete PDF is now available offline.');
    } catch {
      setMessage('Could not save the PDF. Connect to the internet and try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="10 / THE COMPLETE BOOK"
        title="The original reference"
        description="The complete 77-page Bass Guitar Fretboard & Complete Reference, exactly as supplied."
      />
      <div className="pdf-layout">
        <div className="book-cover">
          <div className="book-cover-top">
            STANDARD FOUR-STRING BASS<span>E — A — D — G</span>
          </div>
          <div>
            <span className="eyebrow">THE COMPLETE EDITION</span>
            <h2>
              Bass Guitar
              <br />
              Fretboard &<br />
              Complete
              <br />
              Reference
            </h2>
            <p>Reference · Practice · Improvisation</p>
          </div>
          <div className="book-cover-bottom">
            <span>
              40 EXERCISES
              <br />
              10 PRACTICE PROGRAMS
            </span>
            <span>REVISION 5</span>
          </div>
        </div>
        <div>
          <Panel title="Keep the book close">
            <p>
              The interactive pages are built from this book. Use the PDF when you want the full
              static reference, the original page layouts, or a printable copy.
            </p>
            <div className="pdf-actions">
              <a className="button primary" href={pdf} target="_blank" rel="noreferrer">
                <Icon name="book" />
                Open complete PDF
              </a>
              <a className="button" href={pdf} download>
                <Icon name="download" />
                Download PDF
              </a>
              <button onClick={() => setEmbed((v) => !v)}>
                {embed ? 'Hide reading view' : 'Read inside the app'}
              </button>
            </div>
            <p className="pdf-file-info">77 pages · 556 KB · Original PDF</p>
          </Panel>
          <Panel title="Offline & installation">
            <p>
              The installed app runs locally in your browser. Core reference pages, notation,
              search, and practice tools are cached after the first successful production load.
            </p>
            <div className="pdf-actions">
              <button onClick={save} disabled={cached || busy}>
                <Icon name={cached ? 'check' : 'download'} />
                {busy ? 'Saving…' : cached ? 'PDF saved offline' : 'Save PDF for offline use'}
              </button>
              <button
                onClick={async () => {
                  if (prompt) {
                    await prompt.prompt();
                    const choice = await prompt.userChoice;
                    setInstallMessage(
                      choice.outcome === 'accepted'
                        ? 'Installation requested.'
                        : 'You can install later from your browser menu.',
                    );
                    setPrompt(null);
                  } else
                    setInstallMessage(
                      'Use your browser’s Install app or Add to Home Screen command. Installation is available from HTTPS hosting, or localhost when supported.',
                    );
                }}
              >
                Install app
              </button>
            </div>
            {message && <p role="status">{message}</p>}
            {installMessage && <p role="status">{installMessage}</p>}
            <p className="pdf-file-info">
              Favorites, progress, roots and practice logs stay on this device.
            </p>
          </Panel>
        </div>
      </div>
      {embed && (
        <Panel title="Complete reference · reading view">
          <iframe className="pdf-reader" title="Complete bass reference PDF" src={pdf} />
          <p>If the browser cannot show the PDF inline, use Open complete PDF above.</p>
        </Panel>
      )}
      <Notice>
        The PDF remains unchanged. The app uses the LaTeX source for content and derives notation
        and TAB from shared physical fingerings. Documented source inconsistencies are clarified in
        the relevant exercise pages.
      </Notice>
    </>
  );
}
