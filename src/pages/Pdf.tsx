import { useEffect, useState } from 'react';
import { PageHeading, Panel, Icon, Notice, usePageTitle } from '../components/UI';
const pdf = '/bass_complete_reference_practice_improv_v5-1.pdf';
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function Pdf() {
  usePageTitle('Das Originalbuch');
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
      setMessage('Das vollständige PDF ist jetzt offline verfügbar.');
    } catch {
      setMessage(
        'Das PDF konnte nicht gespeichert werden. Prüfe die Internetverbindung und versuche es erneut.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="MUSIKTHEORIE / ORIGINALBUCH"
        title="Das Originalbuch"
        description="Das vollständige englischsprachige Original: Bass Guitar Fretboard & Complete Reference, 77 Seiten, unverändert."
      />
      <div className="pdf-layout">
        <div className="book-cover">
          <div className="book-cover-top">
            STANDARD-VIERSAITER<span>E — A — D — G</span>
          </div>
          <div>
            <span className="eyebrow">DIE VOLLSTÄNDIGE AUSGABE</span>
            <h2>
              Bass Guitar
              <br />
              Fretboard &<br />
              Complete
              <br />
              Reference
            </h2>
            <p>Nachschlagen · Üben · Improvisieren</p>
          </div>
          <div className="book-cover-bottom">
            <span>
              40 ÜBUNGEN
              <br />
              10 ÜBEPROGRAMME
            </span>
            <span>AUSGABE 5</span>
          </div>
        </div>
        <div>
          <Panel title="Das Buch griffbereit">
            <p>
              Die interaktiven Seiten basieren auf diesem Buch. Das englischsprachige PDF bietet die
              vollständige Referenz im Original-Layout und eignet sich zum Ausdrucken.
            </p>
            <div className="pdf-actions">
              <a className="button primary" href={pdf} target="_blank" rel="noreferrer">
                <Icon name="book" />
                Vollständiges PDF öffnen
              </a>
              <a className="button" href={pdf} download>
                <Icon name="download" />
                PDF herunterladen
              </a>
              <button onClick={() => setEmbed((v) => !v)}>
                {embed ? 'Leseansicht ausblenden' : 'In der App lesen'}
              </button>
            </div>
            <p className="pdf-file-info">77 Seiten · 556 KB · Englisches Original-PDF</p>
          </Panel>
          <Panel title="Offline & Installation">
            <p>
              Die installierte App läuft lokal im Browser. Referenzseiten, Notation, Suche und
              Übewerkzeuge werden nach dem ersten erfolgreichen Laden der veröffentlichten App
              zwischengespeichert.
            </p>
            <div className="pdf-actions">
              <button onClick={save} disabled={cached || busy}>
                <Icon name={cached ? 'check' : 'download'} />
                {busy
                  ? 'Wird gespeichert…'
                  : cached
                    ? 'PDF offline gespeichert'
                    : 'PDF offline speichern'}
              </button>
              <button
                onClick={async () => {
                  if (prompt) {
                    await prompt.prompt();
                    const choice = await prompt.userChoice;
                    setInstallMessage(
                      choice.outcome === 'accepted'
                        ? 'Installation angefordert.'
                        : 'Du kannst die App später über das Browser-Menü installieren.',
                    );
                    setPrompt(null);
                  } else
                    setInstallMessage(
                      'Nutze im Browser „App installieren“ oder „Zum Startbildschirm hinzufügen“. Die Installation ist bei HTTPS-Verbindungen oder auf unterstützten localhost-Seiten verfügbar.',
                    );
                }}
              >
                App installieren
              </button>
            </div>
            {message && <p role="status">{message}</p>}
            {installMessage && <p role="status">{installMessage}</p>}
            <p className="pdf-file-info">
              Grundtöne, Tempo und gespeicherte Patterns bleiben auf diesem Gerät.
            </p>
          </Panel>
        </div>
      </div>
      {embed && (
        <Panel title="Vollständiges Referenzbuch · Leseansicht">
          <iframe
            className="pdf-reader"
            title="Vollständiges Bass-Referenz-PDF (Englisch)"
            src={pdf}
          />
          <p>
            Falls dein Browser das PDF hier nicht anzeigt, nutze oben „Vollständiges PDF öffnen“.
          </p>
        </Panel>
      )}
      <Notice>
        Das englischsprachige Original-PDF bleibt unverändert. Die App nutzt dessen LaTeX-Quelle und
        erzeugt Notation und TAB aus denselben Fingersätzen. Bekannte Unstimmigkeiten der Quelle
        werden auf den jeweiligen Übungsseiten erläutert.
      </Notice>
    </>
  );
}
