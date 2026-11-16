import { LOGO_ID, LOGO_MARK } from '@/lib/logoData';

/** The PMC mark. */
export function Mark({ className = 'mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 2582 1454" fill="currentColor" aria-hidden="true">
      {LOGO_MARK.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/** The mark with "ID" beside it. */
export function IdLockup({ className = 'mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${LOGO_ID.w} 1454`} fill="currentColor" role="img" aria-label="PMC ID">
      <rect x="2520" y="1281.33" width={LOGO_ID.w - 2524} height="172.09" />
      {LOGO_MARK.map((d, i) => <path key={i} d={d} />)}
      {LOGO_ID.d.map((d, i) => <path key={'i' + i} d={d} />)}
    </svg>
  );
}

/** A real app logo (Coe, Coe Mini, PMC Tools). */
export function AppLogo({ id }: { id: 'coe' | 'mini' | 'tools' }) {
  return <span className="rw-ic logo" aria-hidden="true"><img alt="" src={`/img/logo-${id}.svg`} /></span>;
}
