'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { PlanViewer } from '../components/PlanViewer';
import { SignaturePad, type SignaturePadHandle } from '../components/SignaturePad';
import { plan1 } from '../data/plan-1';
import { plan2 } from '../data/plan-2';
import { sig, signatureActive, signatureConfig } from '../data/signature';
import { App } from '../components/SiteShell';
import { tr, ui, useLang, useT, type Lang } from '../i18n';
import { newRequestId, readSigned, saveSigned, type SignedRecord } from '../lib/signed';
import { withBase } from '../lib/base';

/** Retire la mise en forme des textes : gras, badge et boutons vers d'autres pages */
const plain = (s: string) =>
  s.replace(/\*\*/g, '').replace(/\[\[badge\]\]/g, '« ← badge »').replace(/\s*\[\[plan-2\]\]/g, '').trim();

/** Texte exact présenté au chauffeur : envoyé avec la signature et repris dans le PDF de preuve */
function documentText(lang: Lang) {
  const t = (x: Parameters<typeof tr>[0]) => plain(tr(x, lang));
  return [
    `${t(sig.map)} (${t(sig.version)} ${signatureConfig.version})`,
    t(ui.rules),
    ...plan1.rules.map((r) => `- ${t(r.title)} : ${t(r.text)}`),
    '',
    t(sig.hopper),
    ...plan2.steps.map((s, i) => `${i + 1}. ${t(s)}`),
    ...plan2.notes.map((n) => `- ${t(n.label)} : ${t(n.text)}${n.tel ? ` ${n.tel}` : ''}`),
    '',
    `${t(sig.retention)} ${t(sig.privacy).replace('{r}', signatureConfig.responsable)}`,
  ].join('\n');
}

function SignatureForm() {
  const t = useT();
  const { lang } = useLang();
  const pad = useRef<SignaturePadHandle>(null);
  const [record, setRecord] = useState<SignedRecord | null>(() => readSigned());
  const [fields, setFields] = useState({ name: '', company: '', plate: '', badge: '', website: '' });
  const [accepted, setAccepted] = useState(false);
  const [signed, setSigned] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'missing' | 'error'>('idle');
  // Même identifiant si le chauffeur réessaie : le serveur ne crée pas de doublon
  const requestId = useRef(newRequestId());

  useEffect(() => {
    document.title = `${t(sig.title)} — ${t(ui.site)}`;
  }, [t]);

  const set = (key: keyof typeof fields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const complete = fields.name.trim().length >= 2 && fields.company.trim().length >= 2 && fields.plate.trim().length >= 2;
    if (!complete || !accepted || !signed) {
      setStatus('missing');
      return;
    }
    setStatus('sending');
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 45000);
    try {
      const res = await fetch(signatureConfig.url, {
        method: 'POST',
        // text/plain : Apps Script ne répond pas à la requête préalable qu'exigerait du JSON
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        signal: abort.signal,
        body: JSON.stringify({
          ...fields,
          requestId: requestId.current,
          lang,
          version: signatureConfig.version,
          document: documentText(lang),
          accepted,
          signature: pad.current!.toPng(),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      const r = { version: signatureConfig.version, date: data.date };
      saveSigned(r);
      setRecord(r);
      window.scrollTo(0, 0);
    } catch {
      setStatus('error');
    } finally {
      clearTimeout(timer);
    }
  };

  const restart = () => {
    setRecord(null);
    setFields({ name: '', company: '', plate: '', badge: '', website: '' });
    setAccepted(false);
    setSigned(false);
    setStatus('idle');
    requestId.current = newRequestId();
  };

  const home = withBase('/');

  if (record) {
    return (
      <main className="page-main sign">
        <section className="card sign-done" role="status">
          <h2>{t(sig.doneTitle)}</h2>
          <p>
            {t(sig.signedOn)} {record.date} · {t(sig.version)} {record.version}
          </p>
        </section>
        <button type="button" className="sign-secondary" onClick={restart}>
          {t(sig.another)}
        </button>
        <a className="sign-secondary" href={home}>
          {t(sig.home)}
        </a>
      </main>
    );
  }

  return (
    <main className="page-main sign">
      <section className="card">
        <h2>{t(sig.read)}</h2>
        <h3>{t(sig.map)}</h3>
        <div className="sign-map">
          <PlanViewer
            data={plan1}
            routes={[]}
            activeRouteId=""
            selectedId={null}
            editMode={false}
            onSelect={noop}
            onStepChange={noop}
          />
        </div>
        <a className="sign-open" href={withBase('/plan-1/')} target="_blank" rel="noopener">
          {t(sig.openMap)}
        </a>

        <h3>{t(ui.rules)}</h3>
        <ul className="sign-rules">
          {plan1.rules.map((r, i) => (
            <li key={i}>
              <strong>{t(r.title)}</strong> {plain(t(r.text))}
            </li>
          ))}
        </ul>

        <h3>{t(sig.hopper)}</h3>
        <ol className="sign-steps">
          {plan2.steps.map((s, i) => (
            <li key={i}>{plain(t(s))}</li>
          ))}
        </ol>
        <ul className="sign-rules">
          {plan2.notes.map((n, i) => (
            <li key={i}>
              <strong>{t(n.label)}</strong> {plain(t(n.text))} {n.tel}
            </li>
          ))}
        </ul>
      </section>

      <form className="card sign-form" onSubmit={submit} noValidate>
        <h2>{t(sig.sign)}</h2>
        <label>
          {t(sig.name)}
          <input value={fields.name} onChange={set('name')} autoComplete="name" maxLength={80} required />
        </label>
        <label>
          {t(sig.company)}
          <input value={fields.company} onChange={set('company')} autoComplete="organization" maxLength={80} required />
        </label>
        <label>
          {t(sig.plate)}
          <input value={fields.plate} onChange={set('plate')} autoCapitalize="characters" autoComplete="off" maxLength={20} required />
        </label>
        <label>
          {t(sig.badge)}
          <input value={fields.badge} onChange={set('badge')} autoComplete="off" maxLength={30} />
        </label>
        {/* Piège à robots : champ invisible qu'un humain ne remplit pas */}
        <input className="sign-trap" tabIndex={-1} aria-hidden="true" autoComplete="off" value={fields.website} onChange={set('website')} />

        <label className="sign-accept">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span>{t(sig.accept)}</span>
        </label>

        <div className="sign-pad-block">
          <p>{t(sig.signHere)}</p>
          <SignaturePad ref={pad} label={t(sig.signHere)} onChange={setSigned} />
          <button type="button" className="sign-clear" onClick={() => pad.current?.clear()}>
            {t(sig.clear)}
          </button>
        </div>

        {status === 'missing' && <p className="sign-error" role="alert">{t(sig.missing)}</p>}
        {status === 'error' && <p className="sign-error" role="alert">{t(sig.error)}</p>}

        <p className="sign-privacy">
          <strong>{t(sig.retention)}</strong> {t(sig.privacy).replace('{r}', signatureConfig.responsable)}
        </p>

        <button type="submit" className="sign-submit" disabled={status === 'sending'}>
          {status === 'sending' ? t(sig.sending) : t(sig.submit)}
        </button>
      </form>
    </main>
  );
}

const noop = () => {};

function Page() {
  const t = useT();
  const active = useMemo(signatureActive, []);
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">
          {t(ui.site)} · {t(sig.version)} {signatureConfig.version}
        </p>
        <h1>{t(sig.title)}</h1>
        <p className="lead">{active ? t(sig.lead) : t(sig.notActive)}</p>
      </header>
      {active && <SignatureForm />}
    </>
  );
}

export default function Signature() {
  return (
    <App>
      <Page />
    </App>
  );
}
