// Logo Agora : une colonne grecque (la démocratie athénienne) d'où partent des ondes de voix
// (la parole libre qui porte), sur fond rouge.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Logo Agora">
      <rect width="64" height="64" rx="14" fill="#e4002b" />
      <g fill="none" stroke="#ffd400" strokeWidth="3.2" strokeLinecap="round">
        <path d="M17.5 20 A16 16 0 0 0 17.5 36" />
        <path d="M11.5 16 A22 22 0 0 0 11.5 40" />
        <path d="M46.5 20 A16 16 0 0 1 46.5 36" />
        <path d="M52.5 16 A22 22 0 0 1 52.5 40" />
      </g>
      <g fill="#fff">
        <rect x="20" y="13" width="24" height="3.5" rx="1" />
        <rect x="22" y="16.5" width="20" height="3" rx="1" />
        <circle cx="22.5" cy="18" r="2.2" />
        <circle cx="41.5" cy="18" r="2.2" />
        <rect x="25" y="19.5" width="14" height="27" />
        <rect x="22" y="46.5" width="20" height="3" rx="1" />
        <rect x="18" y="49.5" width="28" height="4" rx="1.5" />
      </g>
      <g stroke="#e4002b" strokeWidth="1.3" strokeLinecap="round">
        <path d="M28.5 22.5 V44" />
        <path d="M32 22.5 V44" />
        <path d="M35.5 22.5 V44" />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark size={32} />
      <span className="logo-text">Agora</span>
    </span>
  );
}
