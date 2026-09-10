type Props = {
  id: string;
  size?: 'header' | 'hero' | 'modal';
  className?: string;
};

export function SomnguardLogo({ id, size = 'header', className }: Props) {
  const sizes = {
    header: { w: 40, h: 45, style: undefined as React.CSSProperties | undefined },
    hero: { w: 200, h: 224, style: { width: 200, height: 224 } as React.CSSProperties },
    modal: { w: 80, h: 90, style: { width: 80, height: 90, margin: '0 auto' } as React.CSSProperties },
  };
  const s = sizes[size];
  // ids for clip - must be unique per instance to avoid collision, use suffix by id
  const clipId = `eyeClip-${id}`;
  const pillId = `pill-${id}`;
  const pillClipId = `pillClip-${id}`;
  const pupilId = `pupil-${id}`;
  const mouthId = `mouth-${id}`;

  return (
    <svg id={id} viewBox="0 0 100 112" fill="none" style={s.style} className={className} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect id={pillClipId} x="26" y="38" width="48" height="24" rx="12" ry="12"></rect>
        </clipPath>
      </defs>
      <path d="M50 5 L88 19 L88 55 C88 79 70 97 50 107 C30 97 12 79 12 55 L12 19 Z" fill="#0c1b2e" stroke="#00C8C8" strokeWidth="5.5" strokeLinejoin="round"></path>
      <rect id={pillId} x="26" y="38" width="48" height="24" rx="12" ry="12" fill="#0c1b2e" stroke="#00C8C8" strokeWidth="4"></rect>
      <circle id={pupilId} cx="50" cy="50" r="9" fill="#00C8C8" clipPath={`url(#${clipId})`}></circle>
      <path id={mouthId} d="M41 73 Q50 78 59 73" stroke="#00C8C8" strokeWidth="3.5" strokeLinecap="round" fill="none"></path>
    </svg>
  );
}

// For compatibility we'll override: keep original ids when size header/hero and use generic when modal (no animation).
// We'll provide two versions: if id is headerLogo or heroLogo keep original ids for sync.

export function SomnguardLogoSync({ id }: { id: 'headerLogo' | 'heroLogo' }) {
  const isHeader = id === 'headerLogo';
  const clipId = isHeader ? 'eyeClipHeader' : 'eyeClip';
  const pillId = isHeader ? 'headerPill' : 'pill';
  const pillClipId = isHeader ? 'headerPillClip' : 'pillClip';
  const pupilId = isHeader ? 'headerPupil' : 'pupil';
  const mouthId = isHeader ? 'headerMouth' : 'mouth';
  const style = isHeader ? undefined : ({ width: 200, height: 224 } as React.CSSProperties);

  return (
    <svg id={id} viewBox="0 0 100 112" fill="none" style={style} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect id={pillClipId} x="26" y="38" width="48" height="24" rx="12" ry="12"></rect>
        </clipPath>
      </defs>
      <path d="M50 5 L88 19 L88 55 C88 79 70 97 50 107 C30 97 12 79 12 55 L12 19 Z" fill="#0c1b2e" stroke="#00C8C8" strokeWidth="5.5" strokeLinejoin="round"></path>
      <rect id={pillId} x="26" y="38" width="48" height="24" rx="12" ry="12" fill="#0c1b2e" stroke="#00C8C8" strokeWidth="4"></rect>
      <circle id={pupilId} cx="50" cy="50" r="9" fill="#00C8C8" clipPath={`url(#${clipId})`}></circle>
      <path id={mouthId} d="M41 73 Q50 78 59 73" stroke="#00C8C8" strokeWidth="3.5" strokeLinecap="round" fill="none"></path>
    </svg>
  );
}

export function SomnguardLogoStatic({ size = 80 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 112" fill="none" style={{ width: size, height: (size * 112) / 100, margin: '0 auto', display: 'block' }} aria-hidden>
      <path d="M50 5 L88 19 L88 55 C88 79 70 97 50 107 C30 97 12 79 12 55 L12 19 Z" fill="#0c1b2e" stroke="#00C8C8" strokeWidth="5.5" strokeLinejoin="round"></path>
      <rect x="26" y="38" width="48" height="24" rx="12" ry="12" fill="#0c1b2e" stroke="#00C8C8" strokeWidth="4"></rect>
      <circle cx="50" cy="50" r="9" fill="#00C8C8"></circle>
      <path d="M41 73 Q50 78 59 73" stroke="#00C8C8" strokeWidth="3.5" strokeLinecap="round" fill="none"></path>
    </svg>
  );
}
