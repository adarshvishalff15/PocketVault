/**
 * Fluent UI SVG Icons — Windows 11 Remote File Server.
 * High-quality, faithful Fluent System Icon SVGs.
 * All icons are inline SVG for offline reliability and crisp rendering.
 */

const ICONS = {
  // Brand & System
  win11: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8.5v8.5H3V3zm9.5 0H21v8.5h-8.5V3zM3 12.5h8.5V21H3v-8.5zm9.5 0H21V21h-8.5v-8.5z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  mouse: `<svg viewBox="0 0 32 32" fill="none"><rect x="8" y="4" width="16" height="24" rx="8" stroke="#38BDF8" stroke-width="2" fill="rgba(56,189,248,0.15)"/><line x1="16" y1="4" x2="16" y2="14" stroke="#38BDF8" stroke-width="2"/><circle cx="16" cy="11" r="1.5" fill="#38BDF8"/></svg>`,

  // Folders & Storage (Windows-authentic yellow folder)
  folder: `<svg viewBox="0 0 32 32" fill="none"><path d="M4 8a2 2 0 012-2h7l2 2.5H26a2 2 0 012 2V24a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" fill="#FFB900"/><path d="M4 12h24v12a2 2 0 01-2 2H6a2 2 0 01-2-2V12z" fill="#FFC83D"/><path d="M4 11.5h24v1H4v-1z" fill="#FFB900" opacity=".5"/></svg>`,
  folderOpen: `<svg viewBox="0 0 32 32" fill="none"><path d="M4 8a2 2 0 012-2h7l2 2.5H26a2 2 0 012 2V24a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" fill="#FFB900"/><path d="M2 14a2 2 0 012-2h20l3 12H4a2 2 0 01-2-2V14z" fill="#FFC83D"/></svg>`,
  drive: `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="7" cy="15" r="1" fill="#38bdf8"/><line x1="15" y1="15" x2="18" y2="15"/></svg>`,
  desktop2: `<svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,

  // File Types — Fluent style icons
  video: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="5" width="28" height="22" rx="3" fill="#8B5CF6"/><polygon points="12,10 24,16 12,22" fill="white"/></svg>`,
  audio: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="4" fill="#EC4899"/><circle cx="16" cy="16" r="6" fill="white"/><circle cx="16" cy="16" r="2.5" fill="#EC4899"/><circle cx="16" cy="8" r="1.5" fill="white"/></svg>`,
  image: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="4" fill="#10B981"/><circle cx="10" cy="11" r="3" fill="white" opacity=".9"/><path d="M2 22l8-8 6 6 4-4 10 10H2z" fill="white" opacity=".85"/></svg>`,
  pdf: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="3" fill="#EF4444"/><rect x="6" y="10" width="20" height="2.5" rx="1" fill="white" opacity=".9"/><rect x="6" y="15" width="14" height="2" rx="1" fill="white" opacity=".75"/><rect x="6" y="19.5" width="17" height="2" rx="1" fill="white" opacity=".75"/><text x="5" y="9" fill="white" font-size="6" font-weight="bold" font-family="sans-serif" opacity=".4">PDF</text></svg>`,
  document: `<svg viewBox="0 0 32 32" fill="none"><rect x="4" y="1" width="20" height="27" rx="2" fill="#2563EB"/><path d="M18 1v7h6" fill="none" stroke="#93C5FD" stroke-width="1.5"/><rect x="7" y="12" width="12" height="1.5" rx=".75" fill="white" opacity=".9"/><rect x="7" y="16" width="14" height="1.5" rx=".75" fill="white" opacity=".75"/><rect x="7" y="20" width="10" height="1.5" rx=".75" fill="white" opacity=".75"/></svg>`,
  presentation: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="4" width="28" height="20" rx="3" fill="#EA580C"/><rect x="5" y="7" width="22" height="14" rx="1.5" fill="white" opacity=".2"/><path d="M10 19l4-6 4 4 3-5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><line x1="16" y1="24" x2="16" y2="28" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round"/><line x1="11" y1="28" x2="21" y2="28" stroke="#EA580C" stroke-width="2" stroke-linecap="round"/></svg>`,
  spreadsheet: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="3" fill="#16A34A"/><rect x="5" y="8" width="22" height="16" rx="1" fill="white" opacity=".15"/><line x1="5" y1="14" x2="27" y2="14" stroke="white" opacity=".4" stroke-width="1"/><line x1="5" y1="20" x2="27" y2="20" stroke="white" opacity=".4" stroke-width="1"/><line x1="13" y1="8" x2="13" y2="24" stroke="white" opacity=".4" stroke-width="1"/><line x1="20" y1="8" x2="20" y2="24" stroke="white" opacity=".4" stroke-width="1"/></svg>`,
  archive: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="8" width="28" height="20" rx="3" fill="#CA8A04"/><rect x="2" y="4" width="28" height="8" rx="2" fill="#A16207"/><rect x="12" y="6.5" width="8" height="3" rx="1" fill="white" opacity=".5"/><line x1="16" y1="14" x2="16" y2="28" stroke="white" opacity=".3" stroke-width="4" stroke-dasharray="2 3"/></svg>`,
  text: `<svg viewBox="0 0 32 32" fill="none"><rect x="4" y="1" width="20" height="27" rx="2" fill="#64748B"/><path d="M18 1v7h6" stroke="#94A3B8" stroke-width="1.5" fill="none"/><rect x="7" y="12" width="12" height="1.5" rx=".75" fill="white" opacity=".8"/><rect x="7" y="16" width="14" height="1.5" rx=".75" fill="white" opacity=".65"/><rect x="7" y="20" width="9" height="1.5" rx=".75" fill="white" opacity=".65"/></svg>`,
  executable: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="4" fill="#334155"/><text x="4" y="20" fill="#38BDF8" font-size="9" font-weight="bold" font-family="monospace">EXE</text></svg>`,
  other: `<svg viewBox="0 0 32 32" fill="none"><path d="M6 2a2 2 0 00-2 2v24a2 2 0 002 2h20a2 2 0 002-2V10l-8-8H6z" fill="#94A3B8"/><path d="M18 2v8h8" fill="none" stroke="#CBD5E1" stroke-width="1.5"/></svg>`,

  // Explorer Actions
  newFolder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`,
  rename: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  cut: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="20" r="2"/><circle cx="6" cy="4" r="2"/><line x1="6" y1="6" x2="21" y2="21"/><line x1="6" y1="18" x2="21" y2="3"/></svg>`,
  paste: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`,
  share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  properties: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,

  // Controls
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  minimize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  maximize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="1"/></svg>`,
  restore: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="7" y="7" width="13" height="13" rx="1"/><path d="M5 17V5h12"/></svg>`,

  // Media controls
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
  skipBack: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2"/></svg>`,
  skipFwd: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2"/></svg>`,
  volumeUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>`,
  volumeMute: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
  fullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>`,

  // Theme
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,

  // Navigation
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  forward: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  up: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  sort: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  details: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="4" rx="1"/><rect x="2" y="11" width="20" height="4" rx="1"/><rect x="2" y="17" width="20" height="4" rx="1"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  ellipsis: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`,

  // App icons (Windows 11 styled)
  calculator: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="5" fill="#0078D4"/><rect x="7" y="6" width="18" height="5" rx="1.5" fill="white" opacity=".9"/><circle cx="9" cy="17" r="1.8" fill="white"/><circle cx="16" cy="17" r="1.8" fill="white"/><circle cx="23" cy="17" r="1.8" fill="white"/><circle cx="9" cy="23" r="1.8" fill="white"/><circle cx="16" cy="23" r="1.8" fill="white"/><rect x="21.5" y="21" width="3" height="6" rx="1.2" fill="#60CDFF"/></svg>`,
  calendar: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="4" width="28" height="25" rx="4" fill="#0078D4"/><path d="M2 11h28v-3a4 4 0 00-4-4H6a4 4 0 00-4 4v3z" fill="#1F6FBF"/><rect x="10" y="2" width="3" height="6" rx="1.5" fill="#A8D4F5"/><rect x="19" y="2" width="3" height="6" rx="1.5" fill="#A8D4F5"/><circle cx="9" cy="18" r="1.5" fill="white" opacity=".9"/><circle cx="16" cy="18" r="1.5" fill="white" opacity=".9"/><circle cx="23" cy="18" r="1.5" fill="white" opacity=".9"/><circle cx="9" cy="24" r="1.5" fill="white" opacity=".7"/><circle cx="16" cy="24" r="1.5" fill="white" opacity=".7"/></svg>`,
  clock: `<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" fill="#0078D4"/><circle cx="16" cy="16" r="11" fill="#1F6FBF"/><line x1="16" y1="7" x2="16" y2="16" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="16" x2="22" y2="19" stroke="#60CDFF" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="16" r="1.5" fill="white"/></svg>`,
  notepad: `<svg viewBox="0 0 32 32" fill="none"><rect x="4" y="2" width="22" height="28" rx="3" fill="#0078D4"/><rect x="11" y="1" width="10" height="3" rx="1.5" fill="#1F6FBF"/><rect x="7" y="9" width="16" height="1.5" rx=".75" fill="white" opacity=".9"/><rect x="7" y="13" width="16" height="1.5" rx=".75" fill="white" opacity=".75"/><rect x="7" y="17" width="12" height="1.5" rx=".75" fill="white" opacity=".75"/><rect x="7" y="21" width="14" height="1.5" rx=".75" fill="white" opacity=".6"/></svg>`,
  recycleBin: `<svg viewBox="0 0 32 32" fill="none"><path d="M6 10h20l-2 18H8L6 10z" fill="#64748B"/><path d="M4 8h24" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round"/><path d="M12 5a2 2 0 012-2h4a2 2 0 012 2v3h-8V5z" fill="#94A3B8"/><line x1="12" y1="14" x2="12" y2="24" stroke="white" opacity=".5" stroke-width="1.5" stroke-linecap="round"/><line x1="20" y1="14" x2="20" y2="24" stroke="white" opacity=".5" stroke-width="1.5" stroke-linecap="round"/><line x1="16" y1="14" x2="16" y2="24" stroke="white" opacity=".3" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  storage: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="5" width="28" height="9" rx="3" fill="#0078D4"/><circle cx="7" cy="9.5" r="2" fill="#60CDFF"/><rect x="2" y="17" width="28" height="9" rx="3" fill="#1F6FBF"/><circle cx="7" cy="21.5" r="2" fill="#60CDFF"/><line x1="12" y1="9.5" x2="24" y2="9.5" stroke="white" opacity=".4" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="21.5" x2="20" y2="21.5" stroke="white" opacity=".4" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  transfer: `<svg viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`,
  help: `<svg viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  downloads: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="20" width="28" height="8" rx="3" fill="#10B981"/><path d="M16 3v14m-6-6l6 6 6-6" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  documents: `<svg viewBox="0 0 32 32" fill="none"><rect x="4" y="2" width="20" height="26" rx="2" fill="#3B82F6"/><path d="M18 2v7h6" fill="none" stroke="#93C5FD" stroke-width="1.5"/><rect x="7" y="13" width="12" height="1.5" rx=".75" fill="white" opacity=".85"/><rect x="7" y="17" width="14" height="1.5" rx=".75" fill="white" opacity=".7"/><rect x="7" y="21" width="10" height="1.5" rx=".75" fill="white" opacity=".7"/></svg>`,
  pictures: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="4" width="28" height="24" rx="4" fill="#7C3AED"/><circle cx="10" cy="12" r="3.5" fill="white" opacity=".85"/><path d="M2 24l8-8 7 7 5-5 8 9H2z" fill="white" opacity=".7"/></svg>`,
  music: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="5" fill="#EC4899"/><path d="M12 22V10l12-3v12" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="22" r="3" fill="white" opacity=".9"/><circle cx="21" cy="19" r="3" fill="white" opacity=".9"/></svg>`,

  // Network
  wifi: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>`,
  network: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><line x1="12" y1="8" x2="5" y2="16"/><line x1="12" y1="8" x2="19" y2="16"/></svg>`,

  // User
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
  unlock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  signout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,

  // Status
  checkmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  notification: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  loading: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>`,
  gallery: `<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="18" rx="3" fill="#0099BC"/><circle cx="8" cy="8" r="2.5" fill="#A8E4F8"/><path d="M2 17l6-6 4 4 4-5 6 7H2z" fill="#E0F7FA"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  preview: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
  cloud: `<svg viewBox="0 0 24 24" fill="none" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>`,
  favorites: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  shared: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  recent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  linux: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a4 4 0 00-4 4v4a4 4 0 008 0V6a4 4 0 00-4-4zm-4 9c-2 0-3 2-3 5v2c0 2 2 3 7 3s7-1 7-3v-2c0-3-1-5-3-5h-8z"/></svg>`,
  pc: `<svg viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  driveWin: `<svg viewBox="0 0 48 48" fill="none"><rect x="4" y="10" width="40" height="28" rx="4" fill="#2D3238" stroke="#4B535D" stroke-width="2"/><rect x="8" y="14" width="32" height="18" rx="2" fill="#1E2227"/><circle cx="10" cy="34" r="2" fill="#00D26A"/><line x1="16" y1="34" x2="38" y2="34" stroke="#4B535D" stroke-width="2" stroke-linecap="round"/><rect x="14" y="18" width="5" height="5" fill="#0078D4"/><rect x="20" y="18" width="5" height="5" fill="#0078D4"/><rect x="14" y="24" width="5" height="5" fill="#0078D4"/><rect x="20" y="24" width="5" height="5" fill="#0078D4"/><path d="M30 22v-3a3 3 0 016 0v1" stroke="#60CDFF" stroke-width="1.5" stroke-linecap="round"/><rect x="29" y="22" width="8" height="6" rx="1" fill="#60CDFF"/></svg>`,
  driveWinLocked: `<svg viewBox="0 0 48 48" fill="none"><rect x="4" y="14" width="40" height="24" rx="3" fill="#2E343E" stroke="#505864" stroke-width="1.5"/><rect x="7" y="17" width="34" height="15" rx="1.5" fill="#1A1E24"/><circle cx="10" cy="33" r="1.5" fill="#00D26A"/><line x1="16" y1="33" x2="38" y2="33" stroke="#505864" stroke-width="1.5" stroke-linecap="round"/><path d="M11 20.5l4-0.6v3.2l-4 0.1v-2.7zm4.5 3.3l5-0.1v3.4l-5 0.1v-3.4zm-4.5 3.4l4 0.1v3.2l-4-0.6v-2.7zm4.5 3.4l5 0.1v3.4l-5-0.1v-3.4z" fill="#0078D4"/><path d="M28 13a3.5 3.5 0 017 0v2h-7v-2z" stroke="#E2E8F0" stroke-width="2"/><rect x="26" y="15" width="11" height="8" rx="1.5" fill="#94A3B8"/></svg>`,
  driveWinUnlocked: `<svg viewBox="0 0 48 48" fill="none"><rect x="4" y="14" width="40" height="24" rx="3" fill="#2E343E" stroke="#505864" stroke-width="1.5"/><rect x="7" y="17" width="34" height="15" rx="1.5" fill="#1A1E24"/><circle cx="10" cy="33" r="1.5" fill="#00D26A"/><line x1="16" y1="33" x2="38" y2="33" stroke="#505864" stroke-width="1.5" stroke-linecap="round"/><path d="M27 12a3.5 3.5 0 017 0v2" stroke="#E2E8F0" stroke-width="2" stroke-linecap="round"/><rect x="26" y="15" width="11" height="8" rx="1.5" fill="#94A3B8"/></svg>`,
};

function getFileIcon(category, isDir) {
  if (isDir) return ICONS.folder;
  return ICONS[category] || ICONS.other;
}

function renderIcons(container = document) {
  if (!container || typeof container.querySelectorAll !== "function") container = document;
  container.querySelectorAll("[data-icon]").forEach(el => {
    const name = el.getAttribute("data-icon");
    if (ICONS[name]) el.innerHTML = ICONS[name];
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => renderIcons(document));
} else {
  renderIcons(document);
}
