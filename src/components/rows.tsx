import type { ReactNode } from 'react';
import { AppLogo } from './Logo';
import { Ic } from './Ic';

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="panel"><h2>{title}</h2>{children}</section>;
}

/** A button for the right-hand side of a row. */
export function RowBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return <button className={'btn small' + (danger ? ' danger' : '')} type="button" onClick={onClick}>{label}</button>;
}

/** One row: a tile and a label with a hint on the left, a value and a control on the right. */
export function Rw({ label, val, act, icon, logo, hint, tone, keep }: { keep?: boolean; label: ReactNode; val?: ReactNode; act?: ReactNode; icon?: string; logo?: 'coe' | 'mini' | 'tools'; hint?: ReactNode; tone?: string }) {
  return (
    <div className={keep ? 'rw keep' : 'rw'}>
      <span className="rw-l">
        {logo ? <AppLogo id={logo} /> : icon ? <span className={'rw-ic' + (tone ? ' ' + tone : '')} aria-hidden="true"><Ic n={icon} s={20} /></span> : null}
        <span className="rw-t"><b>{label}</b>{hint ? <small>{hint}</small> : null}</span>
      </span>
      <span className="rw-v">{val}</span>
      {act ?? <span />}
    </div>
  );
}

/** A row that opens into a form. */
export function EdRow({ label, children, onSubmit, onCancel, saveLabel = 'Save', danger, form }: { label: string; children: ReactNode; onSubmit: () => void; onCancel: () => void; saveLabel?: string; danger?: boolean; form?: string }) {
  return (
    <form className="rw ed" data-form={form} noValidate onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <span className="rw-l">{label}</span>
      <div className="rw-f">
        {children}
        <div className="acts">
          <button className="btn" type="button" onClick={onCancel}>Cancel</button>
          <button className={'btn ' + (danger ? 'danger' : 'primary')} type="submit">{saveLabel}</button>
        </div>
      </div>
    </form>
  );
}

export const Ok = ({ text }: { text: string }) => (text ? <p className="ok" role="status">{text}</p> : null);
