'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Star, Shield, Users, CheckCircle, MapPin,
  Phone, Clock, Wrench, Package, BookOpen, ChevronRight,
  Zap, Home, Leaf, Snowflake, Brush, Hammer
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

// ─── SVG Illustrations ────────────────────────────────────────────────────────

function HeroIllustration() {
  return (
    <svg viewBox="0 0 520 420" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Ciel dégradé */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#fed7aa" />
        </linearGradient>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <linearGradient id="house1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="house2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fecaca" />
          <stop offset="100%" stopColor="#fca5a5" />
        </linearGradient>
        <linearGradient id="house3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bbf7d0" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>
        <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="sunGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* Fond ciel */}
      <rect width="520" height="420" fill="url(#sky)" rx="20" />

      {/* Soleil */}
      <circle cx="420" cy="70" r="45" fill="url(#sunGrad)" opacity="0.9" />
      <circle cx="420" cy="70" r="55" fill="#fbbf24" opacity="0.15" />
      <circle cx="420" cy="70" r="65" fill="#fbbf24" opacity="0.08" />

      {/* Nuages */}
      <ellipse cx="80" cy="60" rx="50" ry="22" fill="white" opacity="0.85" />
      <ellipse cx="110" cy="50" rx="35" ry="20" fill="white" opacity="0.85" />
      <ellipse cx="55" cy="55" rx="30" ry="18" fill="white" opacity="0.85" />

      <ellipse cx="300" cy="40" rx="40" ry="18" fill="white" opacity="0.7" />
      <ellipse cx="325" cy="32" rx="28" ry="16" fill="white" opacity="0.7" />

      {/* Mer */}
      <path d="M0 300 Q130 280 260 295 Q390 310 520 290 L520 420 L0 420 Z" fill="url(#sea)" />
      <path d="M0 320 Q130 305 260 315 Q390 325 520 310 L520 420 L0 420 Z" fill="#0284c7" opacity="0.5" />

      {/* Reflets mer */}
      <path d="M30 325 Q60 320 90 325" stroke="white" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
      <path d="M150 315 Q190 310 230 315" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
      <path d="M350 320 Q390 315 430 320" stroke="white" strokeWidth="2" strokeOpacity="0.35" strokeLinecap="round" />

      {/* Collines vertes */}
      <path d="M-10 310 Q80 230 180 260 Q250 280 320 240 Q400 200 530 250 L530 320 L-10 320 Z" fill="url(#hillGrad)" />
      <path d="M-10 320 Q80 265 170 285 Q260 305 350 270 Q430 245 530 270 L530 330 L-10 330 Z" fill="#15803d" opacity="0.6" />

      {/* Arbres maquis */}
      <ellipse cx="60" cy="270" rx="18" ry="22" fill="#16a34a" />
      <rect x="57" y="285" width="6" height="15" fill="#92400e" rx="2" />

      <ellipse cx="130" cy="260" rx="15" ry="19" fill="#15803d" />
      <rect x="127" y="274" width="6" height="12" fill="#92400e" rx="2" />

      <ellipse cx="430" cy="255" rx="20" ry="24" fill="#166534" />
      <rect x="426" y="272" width="8" height="16" fill="#92400e" rx="2" />

      <ellipse cx="475" cy="262" rx="14" ry="18" fill="#16a34a" />
      <rect x="472" y="275" width="5" height="12" fill="#92400e" rx="2" />

      {/* Maison principale (grande, centre) */}
      <rect x="190" y="220" width="90" height="75" fill="url(#house1)" rx="3" />
      <polygon points="185,222 275,222 232,175" fill="url(#roofGrad)" />
      {/* Porte */}
      <rect x="220" y="262" width="24" height="33" fill="#b45309" rx="3" />
      <circle cx="241" cy="279" r="2" fill="#92400e" />
      {/* Fenêtres */}
      <rect x="198" y="235" width="18" height="16" fill="#7dd3fc" rx="2" />
      <rect x="254" y="235" width="18" height="16" fill="#7dd3fc" rx="2" />
      {/* Cheminée */}
      <rect x="248" y="178" width="10" height="20" fill="#78350f" rx="2" />
      {/* Fumée */}
      <path d="M253 175 Q258 165 253 155 Q248 145 255 138" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />

      {/* Maison gauche */}
      <rect x="80" y="245" width="70" height="60" fill="url(#house2)" rx="3" />
      <polygon points="75,247 155,247 115,208" fill="#b45309" />
      <rect x="105" y="277" width="20" height="28" fill="#9a3412" rx="2" />
      <rect x="88" y="258" width="16" height="14" fill="#7dd3fc" rx="2" />
      <rect x="132" y="258" width="16" height="14" fill="#7dd3fc" rx="2" />

      {/* Maison droite */}
      <rect x="340" y="235" width="80" height="65" fill="url(#house3)" rx="3" />
      <polygon points="335,237 425,237 380,196" fill="#b45309" />
      <rect x="369" y="268" width="22" height="32" fill="#15803d" rx="2" />
      <rect x="346" y="250" width="17" height="14" fill="#7dd3fc" rx="2" />
      <rect x="397" y="250" width="17" height="14" fill="#7dd3fc" rx="2" />

      {/* Route */}
      <path d="M150 300 Q260 295 380 300" stroke="#d1d5db" strokeWidth="6" strokeLinecap="round" />
      <path d="M195 298 Q260 295 325 298" stroke="white" strokeWidth="2" strokeDasharray="12 8" strokeLinecap="round" />

      {/* Bateau dans la mer */}
      <path d="M60 355 Q80 345 100 355 L95 365 L65 365 Z" fill="white" />
      <path d="M80 345 L80 330" stroke="#374151" strokeWidth="1.5" />
      <path d="M80 330 L95 340 L80 345 Z" fill="#f97316" />

      {/* Oiseaux */}
      <path d="M200 100 Q208 95 216 100" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M225 90 Q233 85 241 90" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M180 115 Q186 111 192 115" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* Soleil rayons */}
      {[0,45,90,135,180,225,270,315].map((angle, i) => (
        <line
          key={i}
          x1={420 + Math.cos(angle * Math.PI / 180) * 50}
          y1={70 + Math.sin(angle * Math.PI / 180) * 50}
          x2={420 + Math.cos(angle * Math.PI / 180) * 62}
          y2={70 + Math.sin(angle * Math.PI / 180) * 62}
          stroke="#fbbf24"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.6"
        />
      ))}
    </svg>
  );
}

function ArtisanIllustration() {
  return (
    <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="bgArt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff7ed" />
          <stop offset="100%" stopColor="#ffedd5" />
        </linearGradient>
        <linearGradient id="toolBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="shirtGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill="url(#bgArt)" rx="16" />

      {/* Fond cercles décoratifs */}
      <circle cx="320" cy="60" r="70" fill="#fed7aa" opacity="0.35" />
      <circle cx="70" cy="240" r="50" fill="#bfdbfe" opacity="0.3" />

      {/* Mur avec carreaux */}
      <rect x="60" y="60" width="280" height="160" fill="#f8fafc" rx="8" />
      <rect x="60" y="60" width="280" height="160" fill="none" stroke="#e2e8f0" strokeWidth="1" rx="8" />
      {/* Grille carrelage */}
      {[0,1,2,3].map(row => [0,1,2,3,4,5].map(col => (
        <rect key={`${row}-${col}`}
          x={68 + col * 44} y={68 + row * 37}
          width="40" height="33"
          fill={row % 2 === col % 2 ? "#f1f5f9" : "#e8f0fe"}
          rx="2"
          stroke="#dde3ec" strokeWidth="0.5"
        />
      )))}

      {/* Personnage artisan */}
      {/* Tête */}
      <circle cx="200" cy="90" r="28" fill="#fdba74" />
      {/* Casque de chantier */}
      <ellipse cx="200" cy="76" rx="34" ry="14" fill="url(#toolBg)" />
      <rect x="170" y="70" width="60" height="16" fill="#f97316" rx="8" />
      {/* Yeux */}
      <circle cx="190" cy="91" r="4" fill="#1e293b" />
      <circle cx="210" cy="91" r="4" fill="#1e293b" />
      <circle cx="191" cy="89" r="1.5" fill="white" />
      <circle cx="211" cy="89" r="1.5" fill="white" />
      {/* Sourire */}
      <path d="M191 102 Q200 110 209 102" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Moustache */}
      <path d="M192 97 Q200 100 208 97" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Corps - salopette */}
      <rect x="170" y="116" width="60" height="80" fill="url(#shirtGrad)" rx="8" />
      {/* Bavette salopette */}
      <rect x="180" y="116" width="40" height="30" fill="#2563eb" rx="4" />
      {/* Poche */}
      <rect x="185" y="122" width="30" height="18" fill="#1d4ed8" rx="3" />
      {/* Stylo dans poche */}
      <rect x="198" y="120" width="3" height="14" fill="#fbbf24" rx="1" />

      {/* Bras gauche */}
      <rect x="145" y="120" width="28" height="14" fill="url(#shirtGrad)" rx="7" />
      <circle cx="145" cy="127" r="12" fill="#fdba74" />
      {/* Clé dans main gauche */}
      <g transform="translate(120, 115) rotate(-30)">
        <rect x="0" y="0" width="30" height="7" fill="#6b7280" rx="3.5" />
        <circle cx="5" cy="3.5" r="6" fill="none" stroke="#6b7280" strokeWidth="3" />
        <rect x="24" y="2" width="5" height="3" fill="#6b7280" rx="1" />
        <rect x="24" y="6" width="8" height="3" fill="#6b7280" rx="1" />
      </g>

      {/* Bras droit */}
      <rect x="227" y="120" width="28" height="14" fill="url(#shirtGrad)" rx="7" />
      <circle cx="255" cy="127" r="12" fill="#fdba74" />
      {/* Perceuse dans main droite */}
      <g transform="translate(260, 108)">
        <rect x="0" y="8" width="35" height="18" fill="#374151" rx="4" />
        <rect x="-5" y="12" width="10" height="10" fill="#4b5563" rx="2" />
        <rect x="35" y="10" width="16" height="4" fill="#6b7280" rx="2" />
        <circle cx="7" cy="30" r="6" fill="#1f2937" />
        <circle cx="28" cy="30" r="6" fill="#1f2937" />
        <rect x="10" y="6" width="18" height="8" fill="#f97316" rx="2" />
      </g>

      {/* Jambes */}
      <rect x="178" y="192" width="20" height="45" fill="#1e3a5f" rx="5" />
      <rect x="202" y="192" width="20" height="45" fill="#1e3a5f" rx="5" />
      {/* Chaussures */}
      <rect x="170" y="230" width="32" height="14" fill="#1f2937" rx="5" />
      <rect x="198" y="230" width="32" height="14" fill="#1f2937" rx="5" />

      {/* Étoiles rating autour */}
      <g transform="translate(50, 40)">
        <polygon points="15,0 18,10 29,10 20,16 23,27 15,21 7,27 10,16 1,10 12,10" fill="#fbbf24" />
        <text x="34" y="19" fontSize="14" fill="#374151" fontWeight="bold">4.9</text>
      </g>

      {/* Badge vérifié */}
      <g transform="translate(290, 35)">
        <rect width="90" height="30" rx="15" fill="#dcfce7" />
        <circle cx="20" cy="15" r="8" fill="#16a34a" />
        <path d="M16 15 L19 18 L25 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="33" y="20" fontSize="11" fill="#15803d" fontWeight="600">Vérifié</text>
      </g>

      {/* Outils au sol */}
      <g transform="translate(65, 220)">
        {/* Seau */}
        <path d="M0 20 Q10 15 20 20 L18 40 Q10 44 2 40 Z" fill="#fb923c" />
        <path d="M2 20 Q10 16 18 20" stroke="#ea580c" strokeWidth="2" />
        <path d="M5 17 Q10 12 15 17" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
      </g>

      <g transform="translate(295, 215)">
        {/* Pinceau */}
        <rect x="0" y="0" width="6" height="50" fill="#92400e" rx="3" />
        <ellipse cx="3" cy="52" rx="8" ry="6" fill="#1d4ed8" />
        <ellipse cx="3" cy="54" rx="6" ry="4" fill="#3b82f6" />
      </g>
    </svg>
  );
}

function CommunityIllustration() {
  return (
    <svg viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="commBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eff6ff" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>
      </defs>

      <rect width="400" height="280" fill="url(#commBg)" rx="16" />

      {/* Maisons connectées */}
      {[
        { x: 30, y: 140, color: "#fed7aa", roof: "#b45309", scale: 0.8 },
        { x: 150, y: 100, color: "#bbf7d0", roof: "#166534", scale: 1 },
        { x: 280, y: 130, color: "#fecaca", roof: "#991b1b", scale: 0.85 },
      ].map(({ x, y, color, roof, scale }, i) => (
        <g key={i} transform={`translate(${x}, ${y}) scale(${scale})`}>
          <rect x="0" y="40" width="80" height="60" fill={color} rx="4" />
          <polygon points="-8,42 88,42 40,0" fill={roof} />
          <rect x="30" y="72" width="20" height="28" fill={roof} rx="3" />
          <rect x="8" y="52" width="18" height="16" fill="#7dd3fc" rx="2" />
          <rect x="54" y="52" width="18" height="16" fill="#7dd3fc" rx="2" />
        </g>
      ))}

      {/* Lignes de connexion entre maisons */}
      <path d="M110 180 Q200 140 280 170" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="8 5" strokeLinecap="round" opacity="0.6" />
      <path d="M80 180 Q140 200 200 190" stroke="#f97316" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" opacity="0.5" />
      <path d="M280 185 Q330 170 370 185" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" opacity="0.5" />

      {/* Nœuds de connexion */}
      <circle cx="110" cy="180" r="8" fill="#3b82f6" />
      <circle cx="280" cy="172" r="8" fill="#3b82f6" />
      <circle cx="200" cy="155" r="10" fill="#f97316" />
      <circle cx="200" cy="155" r="6" fill="white" />
      <circle cx="200" cy="155" r="3" fill="#f97316" />

      {/* Personnes */}
      {[
        { cx: 110, cy: 210, color: "#fdba74" },
        { cx: 200, cy: 225, color: "#a78bfa" },
        { cx: 290, cy: 215, color: "#6ee7b7" },
      ].map(({ cx, cy, color }, i) => (
        <g key={i}>
          <circle cx={cx} cy={cy - 18} r="14" fill={color} />
          <rect x={cx - 18} y={cy} width="36" height="30" fill={color} opacity="0.7" rx="8" />
          <circle cx={cx - 5} cy={cy - 21} r="3" fill="#1e293b" />
          <circle cx={cx + 5} cy={cy - 21} r="3" fill="#1e293b" />
          <path d={`M${cx - 5} ${cy - 10} Q${cx} ${cy - 7} ${cx + 5} ${cy - 10}`} stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      ))}

      {/* Bulles de chat */}
      <g transform="translate(60, 230)">
        <rect width="70" height="28" rx="14" fill="#3b82f6" />
        <polygon points="20,28 10,38 30,28" fill="#3b82f6" />
        <text x="12" y="18" fontSize="10" fill="white">Bonjour 👋</text>
      </g>

      <g transform="translate(310, 200)">
        <rect width="75" height="28" rx="14" fill="#10b981" />
        <polygon points="55,28 70,38 65,28" fill="#10b981" />
        <text x="8" y="18" fontSize="10" fill="white">Merci ! ⭐</text>
      </g>

      {/* Étoiles décorations */}
      {[[350, 40], [30, 60], [380, 200]].map(([x, y], i) => (
        <polygon key={i}
          points={`${x},${y - 8} ${x + 3},${y - 2} ${x + 9},${y - 2} ${x + 4},${y + 2} ${x + 6},${y + 9} ${x},${y + 5} ${x - 6},${y + 9} ${x - 4},${y + 2} ${x - 9},${y - 2} ${x - 3},${y - 2}`}
          fill="#fbbf24" opacity="0.5"
        />
      ))}
    </svg>
  );
}

function MaterialIllustration() {
  return (
    <svg viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="matBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#dcfce7" />
        </linearGradient>
      </defs>
      <rect width="400" height="280" fill="url(#matBg)" rx="16" />

      {/* Étagère */}
      <rect x="40" y="60" width="320" height="12" fill="#92400e" rx="4" />
      <rect x="40" y="160" width="320" height="12" fill="#92400e" rx="4" />
      <rect x="40" y="58" width="10" height="120" fill="#78350f" rx="3" />
      <rect x="350" y="58" width="10" height="120" fill="#78350f" rx="3" />

      {/* Outils sur étagère 1 */}
      {/* Perceuse */}
      <g transform="translate(60, 20)">
        <rect x="0" y="10" width="45" height="22" fill="#374151" rx="5" />
        <rect x="-6" y="14" width="12" height="14" fill="#4b5563" rx="3" />
        <rect x="45" y="13" width="20" height="5" fill="#6b7280" rx="2" />
        <rect x="12" y="5" width="22" height="10" fill="#f97316" rx="3" />
        <circle cx="8" cy="36" r="7" fill="#1f2937" />
        <circle cx="37" cy="36" r="7" fill="#1f2937" />
        <text x="4" y="54" fontSize="9" fill="#374151">Perceuse</text>
      </g>

      {/* Marteau */}
      <g transform="translate(140, 15)">
        <rect x="20" y="0" width="10" height="30" fill="#6b7280" rx="2" />
        <rect x="0" y="0" width="50" height="14" fill="#374151" rx="4" />
        <text x="4" y="44" fontSize="9" fill="#374151">Marteau</text>
      </g>

      {/* Niveau */}
      <g transform="translate(215, 22)">
        <rect x="0" y="8" width="80" height="14" fill="#0ea5e9" rx="7" />
        <circle cx="40" cy="15" r="5" fill="#e0f2fe" />
        <circle cx="40" cy="15" r="2" fill="#0ea5e9" />
        <text x="15" y="38" fontSize="9" fill="#374151">Niveau</text>
      </g>

      {/* Outils sur étagère 2 */}
      {/* Escabeau */}
      <g transform="translate(55, 88)">
        <path d="M0 65 L15 0 L30 0 L45 65" stroke="#92400e" strokeWidth="5" strokeLinecap="round" fill="none" />
        <line x1="5" y1="20" x2="40" y2="20" stroke="#92400e" strokeWidth="3" />
        <line x1="8" y1="38" x2="37" y2="38" stroke="#92400e" strokeWidth="3" />
        <line x1="10" y1="55" x2="35" y2="55" stroke="#92400e" strokeWidth="3" />
        <text x="-2" y="80" fontSize="9" fill="#374151">Escabeau</text>
      </g>

      {/* Tronçonneuse */}
      <g transform="translate(150, 90)">
        <rect x="0" y="5" width="55" height="30" fill="#374151" rx="6" />
        <rect x="55" y="12" width="35" height="10" fill="#4b5563" rx="2" />
        {[0,1,2,3,4,5].map(i => (
          <rect key={i} x={57 + i * 5} y={11} width="3" height="12" fill="#6b7280" rx="1" />
        ))}
        <rect x="15" y="0" width="25" height="10" fill="#f97316" rx="3" />
        <text x="8" y="52" fontSize="9" fill="#374151">Tronçonneuse</text>
      </g>

      {/* Karcher */}
      <g transform="translate(265, 88)">
        <rect x="10" y="0" width="55" height="35" fill="#fbbf24" rx="6" />
        <rect x="0" y="10" width="15" height="20" fill="#f59e0b" rx="4" />
        <rect x="65" y="12" width="20" height="4" fill="#374151" rx="2" />
        <circle cx="25" cy="52" r="10" fill="#374151" />
        <circle cx="55" cy="52" r="10" fill="#374151" />
        <text x="8" y="72" fontSize="9" fill="#374151">Nettoyeur HP</text>
      </g>

      {/* Flèches d'échange */}
      <g transform="translate(170, 195)">
        <path d="M0 15 Q30 0 60 15" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" fill="none" markerEnd="url(#arrow)" />
        <path d="M60 25 Q30 40 0 25" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <polygon points="57,20 65,25 57,30" fill="#f97316" />
        <polygon points="3,10 -5,15 3,20" fill="#10b981" />
        <text x="15" y="52" fontSize="10" fill="#16a34a" fontWeight="600">Prêt gratuit</text>
      </g>

      {/* Personnes aux extrémités */}
      <g transform="translate(30, 185)">
        <circle cx="25" cy="12" r="14" fill="#fdba74" />
        <rect x="7" y="24" width="36" height="28" fill="#3b82f6" rx="8" />
      </g>
      <g transform="translate(320, 185)">
        <circle cx="25" cy="12" r="14" fill="#a78bfa" />
        <rect x="7" y="24" width="36" height="28" fill="#10b981" rx="8" />
      </g>
    </svg>
  );
}

function ForumIllustration() {
  return (
    <svg viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="forumBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fdf4ff" />
          <stop offset="100%" stopColor="#fae8ff" />
        </linearGradient>
      </defs>
      <rect width="400" height="280" fill="url(#forumBg)" rx="16" />

      {/* Post 1 */}
      <rect x="30" y="25" width="340" height="65" fill="white" rx="12" />
      <rect x="30" y="25" width="340" height="65" fill="none" stroke="#e9d5ff" strokeWidth="1.5" rx="12" />
      <circle cx="57" cy="52" r="16" fill="#a78bfa" />
      <text x="50" y="58" fontSize="14" fill="white" fontWeight="bold">M</text>
      <rect x="82" y="35" width="180" height="8" fill="#7c3aed" rx="4" opacity="0.7" />
      <rect x="82" y="50" width="240" height="6" fill="#ddd6fe" rx="3" />
      <rect x="82" y="62" width="200" height="6" fill="#ddd6fe" rx="3" />
      <g transform="translate(310, 68)">
        <polygon points="0,0 6,8 12,0" fill="#7c3aed" opacity="0.5" />
      </g>
      <text x="48" y="80" fontSize="8" fill="#6d28d9">★ 12 réponses</text>

      {/* Post 2 */}
      <rect x="30" y="105" width="340" height="65" fill="white" rx="12" />
      <rect x="30" y="105" width="340" height="65" fill="none" stroke="#fde68a" strokeWidth="1.5" rx="12" />
      {/* Épinglé */}
      <rect x="30" y="105" width="70" height="18" fill="#fbbf24" rx="9" />
      <text x="38" y="118" fontSize="9" fill="white" fontWeight="600">📌 Épinglé</text>
      <circle cx="57" cy="135" r="16" fill="#f59e0b" />
      <text x="50" y="141" fontSize="14" fill="white" fontWeight="bold">A</text>
      <rect x="82" y="115" width="200" height="8" fill="#92400e" rx="4" opacity="0.7" />
      <rect x="82" y="130" width="240" height="6" fill="#fef3c7" rx="3" />
      <rect x="82" y="142" width="160" height="6" fill="#fef3c7" rx="3" />
      <text x="48" y="162" fontSize="8" fill="#b45309">💬 8 réponses · 145 vues</text>

      {/* Post 3 */}
      <rect x="30" y="185" width="340" height="65" fill="white" rx="12" />
      <rect x="30" y="185" width="340" height="65" fill="none" stroke="#bbf7d0" strokeWidth="1.5" rx="12" />
      <circle cx="57" cy="212" r="16" fill="#10b981" />
      <text x="50" y="218" fontSize="14" fill="white" fontWeight="bold">S</text>
      <rect x="82" y="195" width="220" height="8" fill="#065f46" rx="4" opacity="0.7" />
      <rect x="82" y="210" width="240" height="6" fill="#d1fae5" rx="3" />
      <rect x="82" y="222" width="180" height="6" fill="#d1fae5" rx="3" />
      <text x="48" y="242" fontSize="8" fill="#047857">✅ Résolu · 4 réponses</text>

      {/* Bouton nouveau sujet */}
      <rect x="265" y="250" width="110" height="22" fill="#7c3aed" rx="11" />
      <text x="277" y="265" fontSize="10" fill="white" fontWeight="600">+ Nouveau sujet</text>
    </svg>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────

const trades = [
  { icon: '🚿', label: 'Plomberie', href: '/artisans?categorie=plomberie', color: 'from-blue-400 to-blue-600', bg: 'bg-blue-50 hover:bg-blue-100 border-blue-100 hover:border-blue-200' },
  { icon: '⚡', label: 'Électricité', href: '/artisans?categorie=electricite', color: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-100 hover:border-yellow-200' },
  { icon: '🧱', label: 'Maçonnerie', href: '/artisans?categorie=maconnerie', color: 'from-stone-400 to-stone-600', bg: 'bg-stone-50 hover:bg-stone-100 border-stone-100 hover:border-stone-200' },
  { icon: '🎨', label: 'Peinture', href: '/artisans?categorie=peinture', color: 'from-pink-400 to-rose-500', bg: 'bg-pink-50 hover:bg-pink-100 border-pink-100 hover:border-pink-200' },
  { icon: '🪵', label: 'Menuiserie', href: '/artisans?categorie=menuiserie', color: 'from-amber-400 to-amber-700', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-100 hover:border-amber-200' },
  { icon: '❄️', label: 'Climatisation', href: '/artisans?categorie=climatisation', color: 'from-cyan-400 to-cyan-600', bg: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-100 hover:border-cyan-200' },
  { icon: '🌿', label: 'Jardinage', href: '/artisans?categorie=jardinage', color: 'from-green-400 to-green-600', bg: 'bg-green-50 hover:bg-green-100 border-green-100 hover:border-green-200' },
  { icon: '🔨', label: 'Bricolage', href: '/artisans?categorie=bricolage', color: 'from-orange-400 to-orange-600', bg: 'bg-orange-50 hover:bg-orange-100 border-orange-100 hover:border-orange-200' },
];

const stats = [
  { value: '150+', label: 'Artisans vérifiés', icon: Shield, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100' },
  { value: '500+', label: 'Habitants inscrits', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  { value: '4.9★', label: 'Note moyenne', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  { value: '100%', label: 'Local & gratuit', icon: MapPin, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
];

const sections = [
  {
    icon: Wrench,
    title: 'Marketplace artisans',
    subtitle: 'Artisans vérifiés',
    description: 'Trouvez un plombier, électricien, maçon ou tout autre artisan local qualifié et validé par notre équipe.',
    href: '/artisans',
    gradient: 'from-orange-500 to-red-600',
    accentColor: 'text-orange-600',
    accentBg: 'bg-orange-50',
    Illustration: ArtisanIllustration,
  },
  {
    icon: Package,
    title: 'Petites annonces',
    subtitle: 'Locaux & gratuit',
    description: 'Vendez, cherchez ou offrez du matériel et des services à vos voisins. Simple et efficace.',
    href: '/annonces',
    gradient: 'from-blue-500 to-indigo-600',
    accentColor: 'text-blue-600',
    accentBg: 'bg-blue-50',
    Illustration: CommunityIllustration,
  },
  {
    icon: Package,
    title: 'Prêt de matériel',
    subtitle: 'Entre voisins',
    description: 'Empruntez une perceuse, un escabeau, une remorque… sans acheter. La solidarité de quartier.',
    href: '/materiel',
    gradient: 'from-green-500 to-teal-600',
    accentColor: 'text-green-600',
    accentBg: 'bg-green-50',
    Illustration: MaterialIllustration,
  },
  {
    icon: BookOpen,
    title: 'Forum communauté',
    subtitle: 'Entraide locale',
    description: 'Discutez, recommandez et échangez avec les habitants de Biguglia. La vie de quartier en ligne.',
    href: '/forum',
    gradient: 'from-purple-500 to-violet-600',
    accentColor: 'text-purple-600',
    accentBg: 'bg-purple-50',
    Illustration: ForumIllustration,
  },
];

const steps = [
  {
    num: '01', emoji: '📝', title: 'Décrivez votre besoin',
    desc: 'Sélectionnez le type de travaux, rédigez votre demande et ajoutez des photos pour être plus précis.',
    color: 'from-orange-400 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200',
  },
  {
    num: '02', emoji: '💬', title: 'Contactez un artisan',
    desc: 'Parcourez les profils vérifiés, envoyez votre demande et échangez par messagerie sécurisée.',
    color: 'from-blue-400 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
  },
  {
    num: '03', emoji: '📅', title: 'Planifiez l\'intervention',
    desc: 'Convenez d\'un rendez-vous, suivez l\'avancement et laissez un avis authentique.',
    color: 'from-green-400 to-green-600', bg: 'bg-green-50', border: 'border-green-200',
  },
];

const testimonials = [
  { name: 'Marie-Hélène C.', role: 'Habitante de Biguglia', avatar: '👩', color: 'from-pink-400 to-rose-500',
    text: 'J\'ai trouvé un plombier en 2 heures ! Intervention le lendemain, travail impeccable. La plateforme est vraiment pratique.', rating: 5 },
  { name: 'Pierre-Antoine M.', role: 'Électricien certifié', avatar: '👨‍🔧', color: 'from-blue-400 to-indigo-500',
    text: 'Depuis que je suis sur Biguglia Connect, j\'ai doublé mon nombre de clients locaux. La validation rassure vraiment.', rating: 5 },
  { name: 'Sophie L.', role: 'Résidente', avatar: '👩‍🦱', color: 'from-green-400 to-teal-500',
    text: 'J\'ai emprunté une perceuse à un voisin, offert ma tondeuse le temps d\'un été. La communauté est super sympa !', rating: 5 },
];

// ─── Sous-composants ──────────────────────────────────────────────────────────

function StatCard({ value, label, icon: Icon, color, bg, border }: typeof stats[0]) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`flex flex-col items-center text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <div className={`w-14 h-14 rounded-2xl ${bg} ${border} border-2 flex items-center justify-center mb-3 shadow-sm`}>
        <Icon className={`w-7 h-7 ${color}`} />
      </div>
      <div className={`text-3xl sm:text-4xl font-black ${color} mb-1 tabular-nums`}>{value}</div>
      <div className="text-sm text-gray-500 font-medium">{label}</div>
    </div>
  );
}

function TradeCard({ icon, label, href, bg, color }: typeof trades[0]) {
  return (
    <Link href={href}
      className={`group flex flex-col items-center gap-3 p-4 rounded-2xl border-2 ${bg} transition-all duration-300 hover:shadow-lg hover:-translate-y-1.5`}>
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-3xl shadow-md group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <span className="text-xs sm:text-sm font-bold text-gray-700 text-center leading-tight">{label}</span>
    </Link>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function HomePage() {
  const { profile } = useAuthStore();
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setActiveTestimonial(p => (p + 1) % testimonials.length), 4500);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="overflow-hidden">

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section className="relative min-h-[94vh] flex items-center overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50/60 to-white">

        {/* Pattern de fond */}
        <div className="absolute inset-0 pattern-dots opacity-50" />

        {/* Blobs décoratifs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-orange-200/30 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-20 left-1/3 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute top-1/4 -left-20 w-60 h-60 bg-amber-200/20 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* — Texte — */}
            <div>
              {/* Badge */}
              <div className={`inline-flex items-center gap-2.5 bg-white border border-orange-200 rounded-full px-5 py-2.5 mb-8 shadow-sm transition-all duration-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-500" />
                  <span className="text-sm font-bold text-gray-800">Biguglia, Haute-Corse</span>
                </div>
                <span className="w-px h-4 bg-gray-200" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-500 font-medium">Plateforme active</span>
                </div>
              </div>

              {/* Titre */}
              <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.02] mb-6 transition-all duration-700 delay-100 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                Votre commune,
                <br />
                <span className="relative">
                  <span className="gradient-text">vos artisans.</span>
                  <svg className="absolute -bottom-3 left-0 w-full h-3" viewBox="0 0 300 10" preserveAspectRatio="none">
                    <path d="M0 8 Q75 2 150 6 Q225 10 300 4" stroke="url(#ul)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                    <defs>
                      <linearGradient id="ul" x1="0" y1="0" x2="1" y2="0">
                        <stop stopColor="#f97316" /><stop offset="1" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
              </h1>

              <p className={`text-lg sm:text-xl text-gray-600 leading-relaxed mb-8 max-w-lg transition-all duration-700 delay-200 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}>
                Trouvez un artisan de confiance, échangez des services, prêtez du matériel et rejoignez la communauté de Biguglia.
              </p>

              {/* CTAs */}
              <div className={`flex flex-col sm:flex-row gap-3 mb-10 transition-all duration-700 delay-300 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <Link href="/artisans"
                  className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white px-8 py-4 rounded-2xl font-bold text-base hover:from-brand-600 hover:to-brand-700 transition-all duration-300 shadow-lg shadow-orange-200 hover:shadow-xl hover:-translate-y-0.5">
                  <Wrench className="w-5 h-5" />
                  Trouver un artisan
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                {!profile && (
                  <Link href="/inscription"
                    className="group inline-flex items-center justify-center gap-2 bg-white text-gray-800 px-8 py-4 rounded-2xl font-bold text-base border-2 border-gray-200 hover:border-brand-300 hover:bg-orange-50 transition-all duration-300 shadow-sm">
                    Rejoindre la communauté
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>

              {/* Trust pills */}
              <div className={`flex flex-wrap gap-3 transition-all duration-700 delay-500 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}>
                {[
                  { icon: Shield, text: 'Artisans vérifiés', bg: 'bg-orange-100 text-orange-700' },
                  { icon: CheckCircle, text: 'Inscription gratuite', bg: 'bg-green-100 text-green-700' },
                  { icon: Star, text: 'Noté 4.9/5', bg: 'bg-amber-100 text-amber-700' },
                ].map(({ icon: I, text, bg }) => (
                  <div key={text} className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${bg}`}>
                    <I className="w-3.5 h-3.5" />{text}
                  </div>
                ))}
              </div>
            </div>

            {/* — Illustration — */}
            <div className={`relative transition-all duration-1000 delay-400 ${heroLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
              {/* Cadre décoratif */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white animate-float">
                <HeroIllustration />
                {/* Overlay léger */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none rounded-3xl" />
              </div>

              {/* Carte flottante artisan */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-64 animate-float" style={{ animationDelay: '1.5s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-xl shadow">🔧</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">Jean-Pierre M.</div>
                    <div className="text-xs text-gray-500">Plombier · Biguglia</div>
                  </div>
                  <span className="ml-auto text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">● Dispo</span>
                </div>
                <div className="flex gap-0.5 mb-1">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                  <span className="text-xs text-gray-500 ml-1">4.9 (23)</span>
                </div>
                <div className="text-xs text-gray-400">Plomberie · Chauffe-eau · Débouchage</div>
              </div>

              {/* Badge notification */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2 animate-bounce-soft">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-base">✅</div>
                <div className="text-xs">
                  <div className="font-bold text-gray-800">Artisan trouvé !</div>
                  <div className="text-gray-400">Réponse en 2h</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vague basse */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full fill-white" preserveAspectRatio="none">
            <path d="M0,40 C360,65 1080,15 1440,45 L1440,60 L0,60 Z" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════
          STATS
      ══════════════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10">
            {stats.map(s => <StatCard key={s.label} {...s} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          À PROPOS — Corse & Mission
      ══════════════════════════════════════ */}
      <section className="py-20 bg-gradient-to-b from-orange-50/60 to-white relative overflow-hidden">
        <div className="absolute inset-0 pattern-grid opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">

            {/* Illustration côté gauche */}
            <div className="relative order-2 lg:order-1">
              <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <HeroIllustration />
              </div>
              {/* Badge flottant */}
              <div className="absolute -top-5 -right-5 bg-white rounded-2xl shadow-xl border border-orange-100 p-4 flex items-center gap-3 animate-float" style={{ animationDelay: '0.8s' }}>
                <span className="text-3xl">🏝️</span>
                <div>
                  <div className="font-black text-gray-900 text-sm">Biguglia</div>
                  <div className="text-xs text-gray-400">Haute-Corse 20620</div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-lg border border-green-100 p-3 flex items-center gap-2.5 animate-bounce-soft">
                <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-gray-800">150+ artisans</div>
                  <div className="text-gray-400">tous vérifiés ✓</div>
                </div>
              </div>
            </div>

            {/* Texte côté droit */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-4 py-2 mb-6">
                <span className="text-brand-600 text-sm font-bold">✦ Notre mission</span>
              </div>

              <h2 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight mb-6">
                La force du réseau{' '}
                <span className="gradient-text">local</span>{' '}
                à portée de main
              </h2>

              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Biguglia Connect connecte les habitants et les artisans de la commune en toute confiance. Fini les recherches interminables — votre artisan est à quelques clics.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Shield, text: 'Chaque artisan est vérifié manuellement avant validation', color: 'bg-orange-100 text-orange-700' },
                  { icon: Star, text: 'Système d\'avis vérifiés par de vrais habitants', color: 'bg-amber-100 text-amber-700' },
                  { icon: Clock, text: 'Réponse rapide — interventions sous 24 à 48h', color: 'bg-blue-100 text-blue-700' },
                  { icon: Phone, text: 'Messagerie directe sécurisée intégrée', color: 'bg-green-100 text-green-700' },
                ].map(({ icon: Icon, text, color }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-gray-700 text-sm leading-snug pt-2.5">{text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Link href="/confiance" className="inline-flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700 transition-colors group">
                  En savoir plus sur notre démarche
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          MÉTIERS
      ══════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-full px-4 py-2 mb-5">
              <span className="text-gray-600 text-sm font-bold">🛠️ Corps de métier</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
              Quel artisan cherchez-vous ?
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Tous les métiers dont vous avez besoin, à Biguglia et dans les communes alentours
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 lg:gap-4">
            {trades.map(t => <TradeCard key={t.href} {...t} />)}
          </div>

          <div className="text-center mt-10">
            <Link href="/artisans" className="inline-flex items-center gap-2 font-bold text-brand-600 hover:text-brand-700 transition-colors group">
              Voir tous les artisans disponibles
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          4 MODULES — Avec illustrations SVG
      ══════════════════════════════════════ */}
      <section className="py-24 bg-gray-50 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Une plateforme complète pour faciliter la vie des habitants et des artisans de Biguglia
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
            {sections.map(({ icon: Icon, title, subtitle, description, href, gradient, accentColor, accentBg, Illustration }) => (
              <Link key={href} href={href}
                className="group bg-white rounded-3xl overflow-hidden border-2 border-gray-100 hover:border-transparent transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-1.5">
                {/* Illustration */}
                <div className="relative h-52 overflow-hidden bg-gray-50">
                  <Illustration />
                  {/* Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${accentBg} ${accentColor} border border-current/20 shadow-sm`}>
                      {subtitle}
                    </span>
                  </div>
                  {/* Gradient hover overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-t-3xl`} />
                </div>

                {/* Contenu */}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className={`text-xl font-black text-gray-900 group-hover:${accentColor} transition-colors`}>{title}</h3>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">{description}</p>
                  <div className={`inline-flex items-center gap-1.5 ${accentColor} text-sm font-bold`}>
                    Découvrir <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Barre de couleur animée */}
                <div className={`h-1 bg-gradient-to-r ${gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left`} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          COMMENT ÇA MARCHE
      ══════════════════════════════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-5">
              <span className="text-blue-600 text-sm font-bold">⚡ Simple & rapide</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Comment ça marche ?</h2>
            <p className="text-gray-500 text-lg">En 3 étapes, trouvez votre artisan et planifiez votre intervention</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Ligne de connexion desktop */}
            <div className="hidden md:block absolute top-14 left-[22%] right-[22%] h-0.5 bg-gradient-to-r from-orange-200 via-blue-200 to-green-200" />

            {steps.map(({ num, emoji, title, desc, color, bg, border }) => (
              <div key={num} className="relative flex flex-col items-center text-center group">
                <div className={`relative w-28 h-28 rounded-3xl bg-gradient-to-br ${color} flex items-center justify-center text-5xl shadow-xl mb-6 group-hover:scale-110 transition-all duration-300 group-hover:shadow-2xl`}>
                  {emoji}
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-black text-gray-800 shadow-md border-2 border-gray-100">
                    {num}
                  </div>
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm max-w-xs">{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-14">
            <Link href="/artisans"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white px-8 py-4 rounded-2xl font-bold text-base hover:from-brand-600 hover:to-brand-700 transition-all duration-300 shadow-lg shadow-orange-200 hover:shadow-xl hover:-translate-y-0.5">
              Commencer maintenant <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TÉMOIGNAGES
      ══════════════════════════════════════ */}
      <section className="py-24 bg-gradient-to-br from-orange-50 via-amber-50/40 to-white relative overflow-hidden">
        <div className="absolute inset-0 pattern-dots opacity-40" />

        {/* Illustration déco côté droit */}
        <div className="absolute right-0 top-0 bottom-0 w-80 hidden xl:flex items-center justify-center opacity-15 pointer-events-none">
          <ArtisanIllustration />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white border border-amber-200 rounded-full px-4 py-2 mb-5 shadow-sm">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-gray-700 text-sm font-bold">Ils nous font confiance</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
              Ce que disent nos membres
            </h2>
          </div>

          {/* Carrousel */}
          <div className="relative min-h-[220px]">
            {testimonials.map((t, i) => (
              <div key={i} className={`transition-all duration-700 ${i === activeTestimonial ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'}`}>
                <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 max-w-2xl mx-auto">
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 text-lg leading-relaxed mb-6 italic">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${t.color} rounded-2xl flex items-center justify-center text-2xl shadow-sm`}>
                      {t.avatar}
                    </div>
                    <div>
                      <div className="font-black text-gray-900">{t.name}</div>
                      <div className="text-sm text-gray-500">{t.role}</div>
                    </div>
                    <div className="ml-auto">
                      <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full">Vérifié ✓</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Indicateurs */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setActiveTestimonial(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === activeTestimonial ? 'w-8 bg-brand-500' : 'w-3 bg-gray-300 hover:bg-gray-400'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES — Grille avantages
      ══════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
              Pourquoi choisir Biguglia Connect ?
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Une plateforme pensée pour la confiance et la simplicité
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Shield, title: 'Artisans 100% vérifiés', desc: 'Chaque artisan est validé manuellement : SIRET, assurance, références. Vous êtes entre de bonnes mains.', color: 'from-orange-400 to-red-500', bg: 'bg-orange-50', border: 'border-orange-100' },
              { icon: Star, title: 'Avis authentiques', desc: 'Seuls les clients ayant utilisé le service peuvent noter. Pas de faux avis possibles.', color: 'from-amber-400 to-yellow-500', bg: 'bg-amber-50', border: 'border-amber-100' },
              { icon: MapPin, title: '100% local', desc: 'Uniquement des artisans de Biguglia et des communes proches. Circuits courts et réactivité maximale.', color: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50', border: 'border-blue-100' },
              { icon: Home, title: 'Messagerie sécurisée', desc: 'Échangez photos, plans et devis directement dans l\'application, sans divulguer vos coordonnées.', color: 'from-green-400 to-teal-500', bg: 'bg-green-50', border: 'border-green-100' },
              { icon: Users, title: 'Communauté active', desc: 'Forum, entraide, prêt de matériel… plus qu\'une plateforme, une vraie vie de quartier digitale.', color: 'from-purple-400 to-violet-500', bg: 'bg-purple-50', border: 'border-purple-100' },
              { icon: CheckCircle, title: 'Gratuit pour tous', desc: 'Inscription et utilisation entièrement gratuites pour les habitants. Aucun engagement, résiliation libre.', color: 'from-pink-400 to-rose-500', bg: 'bg-pink-50', border: 'border-pink-100' },
            ].map(({ icon: Icon, title, desc, color, bg, border }) => (
              <div key={title} className={`group ${bg} ${border} border-2 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-black text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA FINAL
      ══════════════════════════════════════ */}
      {!profile && (
        <section className="relative py-24 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="absolute inset-0 pattern-dots opacity-10" />
          {/* Cercles décoratifs */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float-slow" />

          {/* Illustration de fond */}
          <div className="absolute right-0 bottom-0 w-[600px] h-[400px] opacity-5 pointer-events-none">
            <CommunityIllustration />
          </div>

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex p-3 bg-brand-500/20 rounded-2xl mb-6 border border-brand-500/30">
              <Users className="w-8 h-8 text-brand-400" />
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
              Rejoignez la communauté
              <br />
              <span className="gradient-text">de Biguglia</span>
            </h2>

            <p className="text-gray-400 text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Que vous soyez habitant ou artisan, inscrivez-vous gratuitement et commencez dès aujourd&apos;hui.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
              <Link href="/inscription"
                className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white px-8 py-4 rounded-2xl font-bold text-base hover:from-brand-600 hover:to-brand-700 transition-all duration-300 shadow-xl shadow-orange-900/30 hover:-translate-y-0.5">
                🏠 Créer un compte habitant
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/inscription?role=artisan"
                className="group inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur text-white px-8 py-4 rounded-2xl font-bold text-base border-2 border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300">
                🔨 Rejoindre en tant qu&apos;artisan
              </Link>
            </div>

            {/* Chiffres */}
            <div className="flex flex-wrap justify-center gap-10 pt-8 border-t border-white/10">
              {[
                { v: '150+', l: 'Artisans' },
                { v: '500+', l: 'Habitants' },
                { v: '0€', l: 'Inscription' },
                { v: '4.9★', l: 'Satisfaction' },
              ].map(({ v, l }) => (
                <div key={l} className="text-center">
                  <div className="text-3xl font-black text-white">{v}</div>
                  <div className="text-sm text-gray-400 font-medium">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
