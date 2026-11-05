/**
 * PROPOSAL, FOR BEN TO DECIDE — this knowingly breaks CLAUDE.md rule 1: raw
 * hex colours (the system has no pink), a hand-drawn SVG cast to LucideIcon
 * because Carousel only takes Lucide glyphs, and an inline size that overrides
 * the badge's 32px. If it stays, the clean version is a component request:
 * Carousel accepts an illustration, and a pink token joins Layer 1.
 *
 * A pink elephant riding a unicorn riding a witch's broom, which would really
 * rather buy an ice cream.
 */
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

function PinkElephant(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: 88, height: 88, overflow: 'visible', stroke: 'none', fill: 'none' }}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* the broom */}
      <line x1="8" y1="100" x2="88" y2="92" style={{ stroke: '#8a5a2b', strokeWidth: 4 }} />
      <polygon points="86,86 114,78 117,106 86,99" style={{ fill: '#e8c15a', stroke: '#a7812a', strokeWidth: 1.5 }} />
      <line x1="90" y1="92" x2="115" y2="88" style={{ stroke: '#a7812a', strokeWidth: 1 }} />
      <line x1="90" y1="95" x2="116" y2="97" style={{ stroke: '#a7812a', strokeWidth: 1 }} />
      <circle cx="97" cy="89" r="1.8" style={{ fill: '#3a2a1a' }} />
      <circle cx="104" cy="88" r="1.8" style={{ fill: '#3a2a1a' }} />

      {/* ...dreaming of an ice cream */}
      <circle cx="111" cy="76" r="1.5" style={{ fill: '#fff', stroke: '#9a8aa0', strokeWidth: 1 }} />
      <circle cx="113" cy="69" r="2.5" style={{ fill: '#fff', stroke: '#9a8aa0', strokeWidth: 1 }} />
      <circle cx="104" cy="52" r="12" style={{ fill: '#fff', stroke: '#9a8aa0', strokeWidth: 1.2 }} />
      <polygon points="99.5,53 108.5,53 104,64" style={{ fill: '#e0a96d', stroke: '#b07a40', strokeWidth: 1 }} />
      <circle cx="104" cy="49" r="5" style={{ fill: '#a8e6cf' }} />
      <circle cx="104" cy="43.5" r="1.6" style={{ fill: '#e5383b' }} />

      {/* the unicorn */}
      <line x1="46" y1="86" x2="43" y2="96" style={{ stroke: '#7a6a80', strokeWidth: 3 }} />
      <line x1="53" y1="88" x2="51" y2="96" style={{ stroke: '#7a6a80', strokeWidth: 3 }} />
      <line x1="68" y1="88" x2="70" y2="95" style={{ stroke: '#7a6a80', strokeWidth: 3 }} />
      <line x1="75" y1="86" x2="78" y2="94" style={{ stroke: '#7a6a80', strokeWidth: 3 }} />
      <path d="M83 78 q10 -2 9 8 q-1 6 -5 4" style={{ stroke: '#b388eb', strokeWidth: 3 }} />
      <ellipse cx="60" cy="80" rx="24" ry="10" style={{ fill: '#fff', stroke: '#7a6a80', strokeWidth: 1.5 }} />
      <polygon points="40,78 30,62 38,58 48,74" style={{ fill: '#fff', stroke: '#7a6a80', strokeWidth: 1.5 }} />
      <ellipse cx="28" cy="62" rx="9" ry="6" style={{ fill: '#fff', stroke: '#7a6a80', strokeWidth: 1.5 }} />
      <polygon points="27,56.5 23,42 32,55.5" style={{ fill: '#f5c542', stroke: '#c79a1c', strokeWidth: 1 }} />
      <circle cx="37" cy="58" r="2.6" style={{ fill: '#ff6b6b' }} />
      <circle cx="40" cy="63" r="2.6" style={{ fill: '#ffa94d' }} />
      <circle cx="43" cy="68" r="2.6" style={{ fill: '#ffd43b' }} />
      <circle cx="46" cy="73" r="2.6" style={{ fill: '#69db7c' }} />
      <circle cx="25" cy="61" r="1.3" style={{ fill: '#3a2a3a' }} />

      {/* the pink elephant, on top of it all */}
      <ellipse cx="60" cy="75" rx="4" ry="6" style={{ fill: '#f7a8c8', stroke: '#c45d8a', strokeWidth: 1.2 }} />
      <ellipse cx="64" cy="62" rx="14" ry="13" style={{ fill: '#f7a8c8', stroke: '#c45d8a', strokeWidth: 1.5 }} />
      <ellipse cx="67" cy="42" rx="8" ry="10" style={{ fill: '#fbc6dc', stroke: '#c45d8a', strokeWidth: 1.5 }} />
      <circle cx="56" cy="42" r="11" style={{ fill: '#f7a8c8', stroke: '#c45d8a', strokeWidth: 1.5 }} />
      <path d="M47 46 q-8 2 -10 -6 q-1 -4 2 -5" style={{ stroke: '#f7a8c8', strokeWidth: 5 }} />
      <path d="M47 46 q-8 2 -10 -6 q-1 -4 2 -5" style={{ stroke: '#c45d8a', strokeWidth: 1, opacity: 0.6 }} />
      <circle cx="52" cy="39" r="1.6" style={{ fill: '#3a2a3a' }} />
      <path d="M52 47 q3 2 6 0" style={{ stroke: '#c45d8a', strokeWidth: 1.2 }} />
      <polygon points="57,53 52,50 52,56" style={{ fill: '#4dabf7' }} />
      <polygon points="57,53 62,50 62,56" style={{ fill: '#4dabf7' }} />
    </svg>
  );
}

export const PinkElephantGlyph = PinkElephant as unknown as LucideIcon;
