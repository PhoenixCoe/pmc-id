'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent, ReactNode } from 'react';
import { STRENGTH_WORDS, strength } from '@/lib/validate';
import { Ic } from './Ic';

/** Errors by field id. fail() shows the message under the field and moves focus to it. */
export function useErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fail = useCallback((id: string, msg: string) => {
    setErrors((e) => ({ ...e, [id]: msg }));
    requestAnimationFrame(() => (document.getElementById(id) as HTMLElement | null)?.focus());
    return false;
  }, []);
  const clear = useCallback((id?: string) => setErrors((e) => { if (!id) return {}; if (!e[id]) return e; const n = { ...e }; delete n[id]; return n; }), []);
  const bad = (id: string) => (errors[id] ? { 'aria-invalid': true as const } : {});
  return { errors, fail, clear, bad };
}

export function Field({ id, label, hint, error, children }: { id?: string; label?: ReactNode; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className="f">
      {label ? <label htmlFor={id}>{label}{hint ? <> <small>{hint}</small></> : null}</label> : null}
      {children}
      {error ? <p className="err" role="alert">{error}</p> : null}
    </div>
  );
}

/** A password box with a Show / Hide button. */
export function PwInput({ id, auto, value, onChange, invalid, inputRef }: { id: string; auto: string; value: string; onChange: (v: string) => void; invalid?: boolean; inputRef?: React.Ref<HTMLInputElement> }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input id={id} ref={inputRef} type={show ? 'text' : 'password'} autoComplete={auto} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined} />
      <button className="eye" type="button" aria-pressed={show} onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
    </div>
  );
}

export function Meter({ value }: { value: string }) {
  const l = strength(value);
  return (
    <>
      <div className="meter" id="meter" data-l={l} aria-hidden="true"><i /><i /><i /><i /></div>
      <p className="meter-t" aria-live="polite"><b id="mt">{STRENGTH_WORDS[l]}</b><span>Needs the third bar or more</span></p>
    </>
  );
}

/** Three boxes that type like one: digits only, a full box moves on, backspace in an empty box moves back. */
export function Dob({ d, m, y, set, invalid, label = 'Birthday' }: { d: string; m: string; y: string; set: (k: 'd' | 'm' | 'y', v: string) => void; invalid?: boolean; label?: string }) {
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const keys = ['d', 'm', 'y'] as const, ids = ['dd', 'mm', 'yy'], ph = ['DD', 'MM', 'YYYY'], names = ['Day', 'Month', 'Year'], auto = ['bday-day', 'bday-month', 'bday-year'], max = [2, 2, 4];
  const vals = [d, m, y];
  const onKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !vals[i] && refs[i - 1]) { e.preventDefault(); refs[i - 1].current?.focus(); }
    if ((e.key === '/' || e.key === '-' || e.key === '.') && refs[i + 1]) { e.preventDefault(); refs[i + 1].current?.focus(); }
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const t = (e.clipboardData.getData('text') || '').match(/(\d{1,2})\D+(\d{1,2})\D+(\d{4})/); if (!t) return;
    e.preventDefault(); set('d', t[1]); set('m', t[2]); set('y', t[3]); refs[2].current?.focus();
  };
  return (
    <div className="dob" role="group" aria-label={label}>
      {keys.map((k, i) => (
        <span key={k} style={{ display: 'contents' }}>
          <input id={ids[i]} ref={refs[i]} type="text" inputMode="numeric" maxLength={max[i]} placeholder={ph[i]} aria-label={names[i]} autoComplete={auto[i]} value={vals[i]}
            aria-invalid={(i === 0 && invalid) || undefined} onKeyDown={onKey(i)} onPaste={onPaste}
            onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); set(k, v); if (v.length === max[i] && refs[i + 1]) refs[i + 1].current?.focus(); }} />
          {i < 2 ? <span className="sl" aria-hidden="true">/</span> : null}
        </span>
      ))}
    </div>
  );
}

/** The PMC dropdown: a button and a list, and the keys work like a real select. */
export function PmcSelect({ id, placeholder, options, value, onPick, labelledBy, invalid }: { id: string; placeholder: string; options: string[]; value: string; onPick: (v: string) => void; labelledBy?: string; invalid?: boolean }) {
  const [open, setOpen] = useState(false), [at, setAt] = useState(-1);
  const box = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null), uid = useId();
  const shut = (focus?: boolean) => { setOpen(false); if (focus) btn.current?.focus(); };
  const openList = () => { setOpen(true); setAt(Math.max(0, options.indexOf(value))); };
  const pick = (i: number) => { onPick(options[i]); shut(true); };
  useEffect(() => {
    if (!open) return;
    const h = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', h); return () => document.removeEventListener('pointerdown', h);
  }, [open]);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const named = ['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Escape', 'Home', 'End'];
    if (!named.includes(e.key)) {
      const ch = e.key.length === 1 && e.key.toLowerCase(); if (!ch) return;
      let j = options.findIndex((o, k) => k > at && o.toLowerCase().startsWith(ch)); if (j < 0) j = options.findIndex((o) => o.toLowerCase().startsWith(ch));
      if (j >= 0) { if (!open) setOpen(true); setAt(j); } return;
    }
    e.preventDefault();
    if (!open) { if (e.key !== 'Escape') openList(); return; }
    if (e.key === 'Escape') shut(true);
    else if (e.key === 'ArrowDown') setAt(Math.min(options.length - 1, at + 1));
    else if (e.key === 'ArrowUp') setAt(Math.max(0, at - 1));
    else if (e.key === 'Home') setAt(0);
    else if (e.key === 'End') setAt(options.length - 1);
    else if (at >= 0) pick(at);
  };
  return (
    <div className={'sel block' + (open ? ' open' : '')} id={id} data-sel data-value={value} ref={box}>
      <button className="sel-btn" id={id + '-btn'} ref={btn} type="button" aria-haspopup="listbox" aria-expanded={open} aria-invalid={invalid || undefined}
        {...(labelledBy ? { 'aria-labelledby': `${labelledBy} ${uid}-v` } : { 'aria-label': placeholder })}
        onClick={() => (open ? shut() : openList())} onKeyDown={onKey}>
        <span className={'sel-val' + (value ? '' : ' ph')} id={`${uid}-v`}>{value || placeholder}</span><span className="sel-chev"><Ic n="down" s={18} /></span>
      </button>
      <ul className="sel-list" role="listbox" hidden={!open}>
        {options.map((o, i) => (
          <li key={o} className={'sel-o' + (o === value ? ' on' : '') + (i === at ? ' at' : '')} role="option" aria-selected={o === value} data-v={o} onClick={() => pick(i)} onMouseMove={() => setAt(i)}>
            <span className="sel-t"><span className="sel-n">{o}</span></span>{o === value ? <span className="sel-tick"><Ic n="check" s={18} /></span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Six boxes for the emailed code. A full set submits by itself. */
export function CodeBoxes({ onFull, invalid, resetKey }: { onFull: (code: string) => void; invalid?: boolean; resetKey: number }) {
  const [vals, setVals] = useState(['', '', '', '', '', '']);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { setVals(['', '', '', '', '', '']); refs.current[0]?.focus(); }, [resetKey]);
  const put = (next: string[], i: number) => { setVals(next); if (next.every(Boolean)) onFull(next.join('')); else refs.current[i]?.focus(); };
  return (
    <div className="code" role="group" aria-label="6-digit code">
      {vals.map((v, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} aria-label={`Digit ${i + 1}`} autoComplete={i === 0 ? 'one-time-code' : undefined}
          className={v ? 'fill' : ''} value={v} aria-invalid={(i === 0 && invalid) || undefined}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '');
            if (d.length > 1) { const n = [...vals]; d.slice(0, 6 - i).split('').forEach((c, k) => { n[i + k] = c; }); put(n, Math.min(i + d.length, 5)); return; }
            const n = [...vals]; n[i] = d; put(n, d ? Math.min(i + 1, 5) : i);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !v && i > 0) { const n = [...vals]; n[i - 1] = ''; setVals(n); refs.current[i - 1]?.focus(); e.preventDefault(); }
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => { e.preventDefault(); const d = e.clipboardData.getData('text').replace(/\D/g, ''); const n = [...vals]; d.slice(0, 6 - i).split('').forEach((c, k) => { n[i + k] = c; }); put(n, Math.min(i + d.length, 5)); }} />
      ))}
    </div>
  );
}
