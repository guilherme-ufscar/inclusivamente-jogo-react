/**
 * Simple SVG icons (no emoji) for navigation and pill themes.
 * stroke/fill use currentColor so parent can color them.
 */
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function Icon({ children, className = "h-8 w-8", size }) {
  const s = size || undefined;
  return (
    <svg
      {...base}
      className={className}
      width={s}
      height={s}
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconBook(p) {
  return (
    <Icon {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Icon>
  );
}

export function IconMath(p) {
  return (
    <Icon {...p}>
      <path d="M4 7h6M7 4v6" />
      <path d="M14 6l6 6M20 6l-6 6" />
      <path d="M4 17h8M14 15h6M14 19h6" />
    </Icon>
  );
}

export function IconStar(p) {
  return (
    <Icon {...p}>
      <polygon points="12 2 15 9 22 9 17 14 19 22 12 17 5 22 7 14 2 9 9 9" />
    </Icon>
  );
}

export function IconPlay(p) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M10 8l6 4-6 4V8z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconAbc(p) {
  return (
    <Icon {...p}>
      <path d="M4 18V8l4 10 4-10v10" />
      <path d="M16 12h4a2 2 0 0 1 0 4h-4V8h5" />
    </Icon>
  );
}

export function IconSound(p) {
  return (
    <Icon {...p}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a10 10 0 0 1 0 14" />
    </Icon>
  );
}

export function IconPencil(p) {
  return (
    <Icon {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </Icon>
  );
}

export function IconNumbers(p) {
  return (
    <Icon {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Icon>
  );
}

export function IconShapes(p) {
  return (
    <Icon {...p}>
      <circle cx="8" cy="8" r="4" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
      <path d="M16 3l4 7h-8l4-7z" />
    </Icon>
  );
}

export function IconBody(p) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 8v5M8 11l4 2 4-2M9 21l3-8 3 8" />
    </Icon>
  );
}

export function IconMoney(p) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5c.5-1 1.5-1.5 2.5-1.5s2 .6 2 1.75-1 1.5-2.5 1.9-2.5.7-2.5 1.85 1 1.75 2.5 1.75 2-.5 2.5-1.5" />
    </Icon>
  );
}

export function IconMap(p) {
  return (
    <Icon {...p}>
      <polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21" />
      <line x1="8" y1="3" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="21" />
    </Icon>
  );
}

export function IconHeart(p) {
  return (
    <Icon {...p}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </Icon>
  );
}

export function IconArt(p) {
  return (
    <Icon {...p}>
      <circle cx="13.5" cy="6.5" r="2" />
      <circle cx="17.5" cy="10.5" r="2" />
      <circle cx="8.5" cy="7.5" r="2" />
      <circle cx="6.5" cy="12.5" r="2" />
      <path d="M12 22a9 9 0 0 1-7.5-14" />
      <path d="M12 22c2-3 4-5 8-6" />
    </Icon>
  );
}

export function IconGame(p) {
  return (
    <Icon {...p}>
      <rect x="2" y="7" width="20" height="12" rx="3" />
      <path d="M6 13h4M8 11v4" />
      <circle cx="16" cy="12" r="1" fill="currentColor" />
      <circle cx="18.5" cy="14" r="1" fill="currentColor" />
    </Icon>
  );
}

export function IconNature(p) {
  return (
    <Icon {...p}>
      <path d="M12 22V10" />
      <path d="M12 10c-4-1-7 1-8 5 5 0 8-2 8-5z" />
      <path d="M12 13c4-1 7 1 8 5-5 0-8-2-8-5z" />
      <path d="M12 8c-2-4 0-6 0-6s2 2 0 6z" />
    </Icon>
  );
}

export function IconClock(p) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

export function IconChat(p) {
  return (
    <Icon {...p}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </Icon>
  );
}

export function IconHome(p) {
  return (
    <Icon {...p}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </Icon>
  );
}

export function IconSpark(p) {
  return (
    <Icon {...p}>
      <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function IconBack(p) {
  return (
    <Icon {...p} className={p.className || "h-6 w-6"}>
      <path d="M15 18l-6-6 6-6" />
    </Icon>
  );
}

export function IconYear({ n = 1, className = "h-10 w-10" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <circle cx="24" cy="24" r="22" fill="currentColor" opacity="0.2" />
      <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="3" />
      <text
        x="24"
        y="29"
        textAnchor="middle"
        fontSize="18"
        fontWeight="900"
        fill="currentColor"
        fontFamily="Nunito, system-ui, sans-serif"
      >
        {String(n)}
      </text>
    </svg>
  );
}

/** Pick icon component from title keywords / matter */
export function iconForTitle(title, matterCode) {
  const t = String(title || "").toUpperCase();
  if (/DINHEIRO|REAL|CENTAVO|COMPRA/.test(t)) return IconMoney;
  if (/CORPO|HIGIENE|SAUDE|SAÚDE|RESPIRAT|DIGEST/.test(t)) return IconBody;
  if (/LOCALIZ|ESPA[CÇ]O|MAPA|TERRIT/.test(t)) return IconMap;
  if (/ARTE|EXPRESS[AÃ]O ART|COR|DESENH/.test(t)) return IconArt;
  if (/JOGO|BRINCAD|SIMB[OÓ]LIC/.test(t)) return IconGame;
  if (/NATUREZA|ANIMAL|PLANTA|ALIMENTAR/.test(t)) return IconNature;
  if (/TEMPO|HORA|LINHA DO TEMPO/.test(t)) return IconClock;
  if (/ORAL|FALA|HIST[OÓ]RIA|ESCUTA|CHAT|CONVERSA/.test(t)) return IconChat;
  if (/SOM|S[IÍ]LAB|FONO|LETRA|ALFABETO/.test(t)) return IconSound;
  if (/LEITURA|PALAVRA|TEXTO|FRASE|ESCRITA|BILHETE|PONTUA/.test(t)) return IconBook;
  if (/N[UÚ]MERO|CONT|SOMA|MULTIP|DIVIS|QUANT|MEDID|OPERAC|PROBLEMA|PADR[AÃ]O|SEQU/.test(t))
    return IconNumbers;
  if (/FORMA|GEOMETR|CLASSIFIC/.test(t)) return IconShapes;
  if (/ESCREV|L[AÁ]PIS|PRODU[CÇ]/.test(t)) return IconPencil;
  if (/BNCC|REFOR[CÇ]O/.test(t)) return IconSpark;
  if (matterCode === "ma" || matterCode === "mt") return IconMath;
  if (matterCode === "lp" || matterCode === "pt") return IconBook;
  return IconStar;
}
