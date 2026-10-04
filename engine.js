/* ============================================================================
 * BijoyEngine — Bijoy (ANSI) ⇄ Unicode Bangla conversion engine
 * Written from scratch by Rasel (@iamzahirul) — Day 2 of 100, build in public.
 *
 * The engine implements the publicly documented Bijoy Classic glyph layout.
 *
 * Architecture (Bijoy → Unicode):
 *   1. sequence expansion  — multi-glyph codes (ligatures, Av→আ, ru/rū specials)
 *   2. single-glyph map    — one ANSI char → one Bangla unit
 *   3. nukta composing     — ড+়→ড়, ঢ+়→ঢ়, য+়→য়
 *   4. reph hoisting       — Bijoy stores রেফ AFTER its consonant (ক+র্);
 *                            Unicode wants it BEFORE (র্+ক)
 *   5. pre-kar placement   — Bijoy stores ি ঈ ৈ ে BEFORE the consonant cluster;
 *                            Unicode renders them after. Also merges ে+া→ো, ে+ৗ→ৌ
 *
 * Architecture (Unicode → Bijoy): exact mirror, in reverse order.
 * ========================================================================== */
const BijoyEngine = (function () {
  'use strict';

  const HASANTA = '\u09CD';
  const REPH_MARK = '\u00A9'; // Bijoy glyph for রেফ (র্)

  const CONSONANTS = new Set(
    ('কখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহ\u09DC\u09DD\u09DFৎ').split('')
  );
  const PRE_KARS = new Set(['\u09BF', '\u09C8', '\u09C7']); // ি ৈ ে — Bijoy stores these BEFORE the consonant (ী is a post-kar!)

  /* -------- Tables: Bijoy Classic glyph layout -------- */

  // multi-glyph Bijoy sequences → Unicode (longest keys first at runtime)
  const B2U_SEQ = {

    "m&Z\u00a1": "স্ত্ব",
    "”Q&e": "চ্ছ্ব",
    "M\u00aay": "গ্রু",
    "O&\u00b6": "ঙ্ক্ষ",
    "`\u00aa“": "দ্রু",
    "b&\u00d8": "ন্দ্ব",
    "g&\u00e5": "ম্ভ্র",
    "i‍\u00a8": "র‍্য",
    "l&\u00b5": "ষ্ক্র",
    "\u00af—y": "স্তু",
    "\u00b3&e": "ক্ত্ব",
    "\u00b6&g": "ক্ষ্ম",
    "\u00cb&e": "ত্ত্ব",
    "\u0161—\u00a1": "ন্ত্ব",
    "K\u00a1": "ক্ব",
    "K\u00a8": "ক্য",
    "K\u00a9": "র্ক",
    "K\u00ac": "ক্ল",
    "L\u00a8": "খ্য",
    "L\u00a9": "র্খ",
    "L\u00ab": "খ্র",
    "M\u00a5": "গ্ম",
    "M\u00a8": "গ্য",
    "M\u00a9": "র্গ",
    "M\u00ab": "গ্র",
    "M\u00ad": "গ্ল",
    "M\u0153": "গ্ন",
    "N\u00a8": "ঘ্য",
    "N\u00a9": "র্ঘ",
    "N\u00ab": "ঘ্র",
    "O\u00a8": "ঙ্য",
    "O\u00a9": "র্ঙ",
    "O\u00ab": "ঙ্র",
    "P\u00a8": "চ্য",
    "P\u00a9": "র্চ",
    "P\u00ab": "চ্র",
    "Q\u00a8": "ছ্য",
    "Q\u00a9": "র্ছ",
    "Q\u00ab": "ছ্র",
    "R\u00a1": "জ্ব",
    "R\u00a8": "জ্য",
    "R\u00a9": "র্জ",
    "R\u00ab": "জ্র",
    "S\u00a8": "ঝ্য",
    "S\u00a9": "র্ঝ",
    "S\u00ab": "ঝ্র",
    "T\u00a8": "ঞ্য",
    "T\u00a9": "র্ঞ",
    "T\u00ab": "ঞ্র",
    "U\u00a1": "ট্ব",
    "U\u00a5": "ট্ম",
    "U\u00a8": "ট্য",
    "U\u00a9": "র্ট",
    "U\u00ab": "ট্র",
    "V\u00a8": "ঠ্য",
    "V\u00a9": "র্ঠ",
    "V\u00ab": "ঠ্র",
    "W\u00a8": "ড্য",
    "W\u00a9": "র্ড",
    "W\u00ab": "ড্র",
    "W়": "ড়",
    "X\u00a8": "ঢ্য",
    "X\u00a9": "র্ঢ",
    "X\u00ab": "ঢ্র",
    "X়": "ঢ়",
    "Y^": "ণ্ব",
    "Y\u00a8": "ণ্য",
    "Y\u00a9": "র্ণ",
    "Y\u00ab": "ণ্র",
    "Z\u00a1": "ত্ব",
    "Z\u00a5": "ত্ম",
    "Z\u00a8": "ত্য",
    "Z\u00a9": "র্ত",
    "_\u00a1": "থ্ব",
    "_\u00a8": "থ্য",
    "_\u00a9": "র্থ",
    "_\u00ab": "থ্র",
    "`\u00a8": "দ্য",
    "`\u00a9": "র্দ",
    "`\u00ab": "দ্র",
    "a\u00a5": "ধ্ম",
    "a\u00a8": "ধ্য",
    "a\u00a9": "র্ধ",
    "a\u00ab": "ধ্র",
    "a\u0178": "ধ্ব",
    "b\u00a5": "ন্ম",
    "b\u00a8": "ন্য",
    "b\u00a9": "র্ন",
    "b\u00ab": "ন্র",
    "b\u0153": "ন্ন",
    "c\u00a8": "প্য",
    "c\u00a9": "র্প",
    "c\u00ab": "প্র",
    "c\u00ad": "প্ল",
    "c\u0153": "প্ন",
    "d\u00a8": "ফ্য",
    "d\u00a9": "র্ফ",
    "d\u00ab": "ফ্র",
    "d\u00ac": "ফ্ল",
    "e\u00a8": "ব্য",
    "e\u00a9": "র্ব",
    "e\u00ab": "ব্র",
    "e\u00ad": "ব্ল",
    "e\u0178": "ব্ব",
    "f\u00a8": "ভ্য",
    "f\u00a9": "র্ভ",
    "g\u00a8": "ম্য",
    "g\u00a9": "র্ম",
    "g\u00ab": "ম্র",
    "g\u0153": "ম্ন",
    "h\u00a8": "য্য",
    "h\u00a9": "র্য",
    "h\u00ab": "য্র",
    "h়": "য়",
    "i\u00a9": "র্র",
    "i\u0192": "রূ",
    "i“": "রু",
    "j\u00a5": "ল্ম",
    "j\u00a6": "ল্ব",
    "j\u00a8": "ল্য",
    "j\u00a9": "র্ল",
    "j\u00ab": "ল্র",
    "j\u00f8": "ল্ল",
    "k\u00a5": "শ্ম",
    "k\u00a6": "শ্ব",
    "k\u00a8": "শ্য",
    "k\u00a9": "র্শ",
    "k\u00ab": "শ্র",
    "k\u00f8": "শ্ল",
    "k\u0153": "শ্ন",
    "l\u00a8": "ষ্য",
    "l\u00a9": "র্ষ",
    "l\u00ab": "ষ্র",
    "m\u00a8": "স্য",
    "m\u00a9": "র্স",
    "m\u00ab": "স্র",
    "m\u0153": "স্ন",
    "n\u00a8": "হ্য",
    "n\u00a9": "র্হ",
    "n\u00ab": "হ্র",
    "n\u00ac": "হ্ল",
    "n\u00e8": "হ্ণ",
    "\u00a4^": "ম্ব",
    "\u00a4\u00a2": "ম্ভ",
    "\u00a4\u00a7": "ম্ম",
    "\u00a4\u00ad": "ম্ল",
    "\u00a4\u00fa": "ম্প",
    "\u00ae\u00a7": "ষ্ম",
    "\u00ae\u00fa": "ষ্প",
    "\u00ae‹": "ষ্ক",
    "\u00af^": "স্ব",
    "\u00af\u00a7": "স্ম",
    "\u00af\u00ad": "স্ল",
    "\u00af\u00bf": "স্ত্র",
    "\u00af\u00fa": "স্প",
    "\u00af\u0152": "স্ক্র",
    "\u00af—": "স্ত",
    "\u00af’": "স্থ",
    "\u00af‹": "স্ক",
    "\u00be\u00a1": "জ্জ্ব",
    "\u00f3\u00ab": "ষ্ট্র",
    "\u0161^": "ন্ব",
    "\u0161\u00bf": "ন্ত্র",
    "\u0161—": "ন্ত",
    "\u0161‘": "ন্তু",
    "\u0161’": "ন্থ",
    "\u02dcM": "দ্গ",
    "\u02dcN": "দ্ঘ",
    "”P": "চ্চ",
    "”Q": "চ্ছ",
    "”T": "চ্ঞ",
    "•L": "ঙ্খ",
    "•N": "ঙ্ঘ",
    "›U": "ন্ট",
    "›`": "ন্দ",
    "™\u00a2": "দ্ভ",
    "\u00b0": "ক্ক",
    "\u00b1": "ক্ট",
    "\u00b3": "ক্ত",
    "\u00b5": "ক্র",
    "\u00b6": "ক্ষ",
    "\u00b7": "ক্স",
    "\u00bb": "গ্ধ",
    "\u00bc": "ঙ্ক",
    "\u00bd": "ঙ্গ",
    "\u00be": "জ্জ",
    "\u00c0": "জ্ঝ",
    "\u00c1": "জ্ঞ",
    "\u00c2": "ঞ্চ",
    "\u00c3": "ঞ্ছ",
    "\u00c4": "ঞ্জ",
    "\u00c5": "ঞ্ঝ",
    "\u00c6": "ট্ট",
    "\u00c7": "ড্ড",
    "\u00c8": "ণ্ট",
    "\u00c9": "ণ্ঠ",
    "\u00ca": "ণ্ড",
    "\u00cb": "ত্ত",
    "\u00cc": "ত্থ",
    "\u00ce": "ত্র",
    "\u00cf": "দ্দ",
    "\u00d7": "দ্ধ",
    "\u00d8": "দ্ব",
    "\u00d9": "দ্ম",
    "\u00da": "ন্ঠ",
    "\u00db": "ন্ড",
    "\u00dc": "ন্ধ",
    "\u00dd": "ন্স",
    "\u00de": "প্ট",
    "\u00df": "প্ত",
    "\u00e0": "প্প",
    "\u00e1": "প্স",
    "\u00e2": "ব্জ",
    "\u00e3": "ব্দ",
    "\u00e4": "ব্ধ",
    "\u00e5": "ভ্র",
    "\u00e7": "ম্ফ",
    "\u00e9": "ল্ক",
    "\u00ea": "ল্গ",
    "\u00eb": "ল্ট",
    "\u00ec": "ল্ড",
    "\u00ed": "ল্প",
    "\u00ee": "ল্ফ",
    "\u00ef": "শু",
    "\u00f0": "শ্চ",
    "\u00f2": "ষ্ণ",
    "\u00f3": "ষ্ট",
    "\u00f4": "ষ্ঠ",
    "\u00f5": "ষ্ফ",
    "\u00f6": "স্খ",
    "\u00f7": "স্ট",
    "\u00f9": "স্ফ",
    "\u00fb": "হু",
    "\u00fc": "হৃ",
    "\u00fd": "হ্ন",
    "\u00fe": "হ্ম",
    "Av": "আ",
    "i\u201C": "রু",
    "i\u0192": "রূ"
  };

  // single Bijoy glyphs → Unicode
  const SINGLE = {

    "&": "্",
    "0": "০",
    "1": "১",
    "2": "২",
    "3": "৩",
    "4": "৪",
    "5": "৫",
    "6": "৬",
    "7": "৭",
    "8": "৮",
    "9": "৯",
    "A": "অ",
    "B": "ই",
    "C": "ঈ",
    "D": "উ",
    "E": "ঊ",
    "F": "ঋ",
    "G": "এ",
    "H": "ঐ",
    "I": "ও",
    "J": "ঔ",
    "K": "ক",
    "L": "খ",
    "M": "গ",
    "N": "ঘ",
    "O": "ঙ",
    "P": "চ",
    "Q": "ছ",
    "R": "জ",
    "S": "ঝ",
    "T": "ঞ",
    "U": "ট",
    "V": "ঠ",
    "W": "ড",
    "X": "ঢ",
    "Y": "ণ",
    "Z": "ত",
    "_": "থ",
    "`": "দ",
    "a": "ধ",
    "b": "ন",
    "c": "প",
    "d": "ফ",
    "e": "ব",
    "f": "ভ",
    "g": "ম",
    "h": "য",
    "i": "র",
    "j": "ল",
    "k": "শ",
    "l": "ষ",
    "m": "স",
    "n": "হ",
    "o": "ড়",
    "p": "ঢ়",
    "q": "য়",
    "r": "ৎ",
    "s": "ং",
    "t": "ঃ",
    "u": "ঁ",
    "v": "া",
    "w": "ি",
    "x": "ী",
    "y": "ু",
    "z": "ু",
    "~": "ূ",
    "\u00a8": "্য",
    "\u00a9": "র্",
    "\u00aa": "্র",
    "\u00ab": "্র",
    "\u00b0": "ক্ক",
    "\u00b1": "ক্ট",
    "\u00b3": "ক্ত",
    "\u00b5": "ক্র",
    "\u00b6": "ক্ষ",
    "\u00b7": "ক্স",
    "\u00b8": "গু",
    "\u00bb": "গ্ধ",
    "\u00bc": "ঙ্ক",
    "\u00bd": "ঙ্গ",
    "\u00be": "জ্জ",
    "\u00c0": "জ্ঝ",
    "\u00c1": "জ্ঞ",
    "\u00c2": "ঞ্চ",
    "\u00c3": "ঞ্ছ",
    "\u00c4": "ঞ্জ",
    "\u00c5": "ঞ্ঝ",
    "\u00c6": "ট্ট",
    "\u00c7": "ড্ড",
    "\u00c8": "ণ্ট",
    "\u00c9": "ণ্ঠ",
    "\u00ca": "ণ্ড",
    "\u00cb": "ত্ত",
    "\u00cc": "ত্থ",
    "\u00ce": "ত্র",
    "\u00cf": "দ্দ",
    "\u00d6": "্র",
    "\u00d7": "দ্ধ",
    "\u00d8": "দ্ব",
    "\u00d9": "দ্ম",
    "\u00da": "ন্ঠ",
    "\u00db": "ন্ড",
    "\u00dc": "ন্ধ",
    "\u00dd": "ন্স",
    "\u00de": "প্ট",
    "\u00df": "প্ত",
    "\u00e0": "প্প",
    "\u00e1": "প্স",
    "\u00e2": "ব্জ",
    "\u00e3": "ব্দ",
    "\u00e4": "ব্ধ",
    "\u00e5": "ভ্র",
    "\u00e7": "ম্ফ",
    "\u00e9": "ল্ক",
    "\u00ea": "ল্গ",
    "\u00eb": "ল্ট",
    "\u00ec": "ল্ড",
    "\u00ed": "ল্প",
    "\u00ee": "ল্ফ",
    "\u00ef": "শু",
    "\u00f0": "শ্চ",
    "\u00f2": "ষ্ণ",
    "\u00f3": "ষ্ট",
    "\u00f4": "ষ্ঠ",
    "\u00f5": "ষ্ফ",
    "\u00f6": "স্খ",
    "\u00f7": "স্ট",
    "\u00f9": "স্ফ",
    "\u00fb": "হু",
    "\u00fc": "হৃ",
    "\u00fd": "হ্ন",
    "\u00fe": "হ্ম",
    "\u00ff": "ক্ষ",
    "\u0160": "ৗ",
    "\u02c6": "ৈ",
    "„": "ৃ",
    "†": "ে",
    "‡": "ে",
    "•": "ক্স",
    "…": "ৃ",
    "‰": "ৈ",    "|": "।",
    "\u00d2": "\u201c",
    "\u00d3": "\u201d",
    "\u00d4": "\u2018",
    "\u00d5": "\u2019",

  };

  // special Unicode conjuncts/sequences → Bijoy codes
  const U2B_SEQ = {
    "ড়": "o",
    "ঢ়": "p",
    "য়": "q",
    "আ": "Av",

    "ক্ত্ব": "\u00b3&e",
    "ক্ষ্ম": "\u00b6&g",
    "ঙ্ক্ষ": "O&\u00b6",
    "চ্ছ্ব": "”Q&e",
    "জ্জ্ব": "\u00be\u00a1",
    "ত্ত্ব": "\u00cb&e",
    "ন্ত্ব": "\u0161—\u00a1",
    "ন্ত্র": "\u0161\u00bf",
    "ন্দ্ব": "b&\u00d8",
    "ম্ভ্র": "g&\u00e5",
    "ষ্ক্র": "l&\u00b5",
    "ষ্ট্র": "\u00f3\u00ab",
    "স্ক্র": "\u00af\u0152",
    "স্ত্ব": "m&Z\u00a1",
    "স্ত্র": "\u00af\u00bf",
    "গ্রু": "M\u00aay",
    "দ্রু": "`\u00aa“",
    "ন্তু": "\u0161‘",
    "র‍্য": "i‍\u00a8",
    "স্তু": "\u00af—y",
    "ক্ক": "\u00b0",
    "ক্ট": "\u00b1",
    "ক্ত": "\u00b3",
    "ক্ব": "K\u00a1",
    "ক্য": "K\u00a8",
    "ক্র": "\u00b5",
    "ক্ল": "K\u00ac",
    "ক্ষ": "\u00b6",
    "ক্স": "\u00b7",
    "খ্য": "L\u00a8",
    "খ্র": "L\u00ab",
    "গ্ধ": "\u00bb",
    "গ্ন": "M\u0153",
    "গ্ম": "M\u00a5",
    "গ্য": "M\u00a8",
    "গ্র": "M\u00ab",
    "গ্ল": "M\u00ad",
    "ঘ্য": "N\u00a8",
    "ঘ্র": "N\u00ab",
    "ঙ্ক": "\u00bc",
    "ঙ্খ": "•L",
    "ঙ্গ": "\u00bd",
    "ঙ্ঘ": "•N",
    "ঙ্য": "O\u00a8",
    "ঙ্র": "O\u00ab",
    "চ্চ": "”P",
    "চ্ছ": "”Q",
    "চ্ঞ": "”T",
    "চ্য": "P\u00a8",
    "চ্র": "P\u00ab",
    "ছ্য": "Q\u00a8",
    "ছ্র": "Q\u00ab",
    "জ্জ": "\u00be",
    "জ্ঝ": "\u00c0",
    "জ্ঞ": "\u00c1",
    "জ্ব": "R\u00a1",
    "জ্য": "R\u00a8",
    "জ্র": "R\u00ab",
    "ঝ্য": "S\u00a8",
    "ঝ্র": "S\u00ab",
    "ঞ্চ": "\u00c2",
    "ঞ্ছ": "\u00c3",
    "ঞ্জ": "\u00c4",
    "ঞ্ঝ": "\u00c5",
    "ঞ্য": "T\u00a8",
    "ঞ্র": "T\u00ab",
    "ট্ট": "\u00c6",
    "ট্ব": "U\u00a1",
    "ট্ম": "U\u00a5",
    "ট্য": "U\u00a8",
    "ট্র": "U\u00ab",
    "ঠ্য": "V\u00a8",
    "ঠ্র": "V\u00ab",
    "ড্ড": "\u00c7",
    "ড্য": "W\u00a8",
    "ড্র": "W\u00ab",
    "ঢ্য": "X\u00a8",
    "ঢ্র": "X\u00ab",
    "ণ্ট": "\u00c8",
    "ণ্ঠ": "\u00c9",
    "ণ্ড": "\u00ca",
    "ণ্ব": "Y^",
    "ণ্য": "Y\u00a8",
    "ণ্র": "Y\u00ab",
    "ত্ত": "\u00cb",
    "ত্থ": "\u00cc",
    "ত্ব": "Z\u00a1",
    "ত্ম": "Z\u00a5",
    "ত্য": "Z\u00a8",
    "ত্র": "\u00ce",
    "থ্ব": "_\u00a1",
    "থ্য": "_\u00a8",
    "থ্র": "_\u00ab",
    "দ্গ": "\u02dcM",
    "দ্ঘ": "\u02dcN",
    "দ্দ": "\u00cf",
    "দ্ধ": "\u00d7",
    "দ্ব": "\u00d8",
    "দ্ভ": "™\u00a2",
    "দ্ম": "\u00d9",
    "দ্য": "`\u00a8",
    "দ্র": "`\u00ab",
    "ধ্ব": "a\u0178",
    "ধ্ম": "a\u00a5",
    "ধ্য": "a\u00a8",
    "ধ্র": "a\u00ab",
    "ন্ট": "›U",
    "ন্ঠ": "\u00da",
    "ন্ড": "\u00db",
    "ন্ত": "\u0161—",
    "ন্থ": "\u0161’",
    "ন্দ": "›`",
    "ন্ধ": "\u00dc",
    "ন্ন": "b\u0153",
    "ন্ব": "\u0161^",
    "ন্ম": "b\u00a5",
    "ন্য": "b\u00a8",
    "ন্র": "b\u00ab",
    "ন্স": "\u00dd",
    "প্ট": "\u00de",
    "প্ত": "\u00df",
    "প্ন": "c\u0153",
    "প্প": "\u00e0",
    "প্য": "c\u00a8",
    "প্র": "c\u00ab",
    "প্ল": "c\u00ad",
    "প্স": "\u00e1",
    "ফ্য": "d\u00a8",
    "ফ্র": "d\u00ab",
    "ফ্ল": "d\u00ac",
    "ব্জ": "\u00e2",
    "ব্দ": "\u00e3",
    "ব্ধ": "\u00e4",
    "ব্ব": "e\u0178",
    "ব্য": "e\u00a8",
    "ব্র": "e\u00ab",
    "ব্ল": "e\u00ad",
    "ভ্য": "f\u00a8",
    "ভ্র": "\u00e5",
    "ম্ন": "g\u0153",
    "ম্প": "\u00a4\u00fa",
    "ম্ফ": "\u00e7",
    "ম্ব": "\u00a4^",
    "ম্ভ": "\u00a4\u00a2",
    "ম্ম": "\u00a4\u00a7",
    "ম্য": "g\u00a8",
    "ম্র": "g\u00ab",
    "ম্ল": "\u00a4\u00ad",
    "য্য": "h\u00a8",
    "য্র": "h\u00ab",
    "র্ক": "K\u00a9",
    "র্খ": "L\u00a9",
    "র্গ": "M\u00a9",
    "র্ঘ": "N\u00a9",
    "র্ঙ": "O\u00a9",
    "র্চ": "P\u00a9",
    "র্ছ": "Q\u00a9",
    "র্জ": "R\u00a9",
    "র্ঝ": "S\u00a9",
    "র্ঞ": "T\u00a9",
    "র্ট": "U\u00a9",
    "র্ঠ": "V\u00a9",
    "র্ড": "W\u00a9",
    "র্ঢ": "X\u00a9",
    "র্ণ": "Y\u00a9",
    "র্ত": "Z\u00a9",
    "র্থ": "_\u00a9",
    "র্দ": "`\u00a9",
    "র্ধ": "a\u00a9",
    "র্ন": "b\u00a9",
    "র্প": "c\u00a9",
    "র্ফ": "d\u00a9",
    "র্ব": "e\u00a9",
    "র্ভ": "f\u00a9",
    "র্ম": "g\u00a9",
    "র্য": "h\u00a9",
    "র্র": "i\u00a9",
    "র্ল": "j\u00a9",
    "র্শ": "k\u00a9",
    "র্ষ": "l\u00a9",
    "র্স": "m\u00a9",
    "র্হ": "n\u00a9",
    "ল্ক": "\u00e9",
    "ল্গ": "\u00ea",
    "ল্ট": "\u00eb",
    "ল্ড": "\u00ec",
    "ল্প": "\u00ed",
    "ল্ফ": "\u00ee",
    "ল্ব": "j\u00a6",
    "ল্ম": "j\u00a5",
    "ল্য": "j\u00a8",
    "ল্র": "j\u00ab",
    "ল্ল": "j\u00f8",
    "শ্চ": "\u00f0",
    "শ্ন": "k\u0153",
    "শ্ব": "k\u00a6",
    "শ্ম": "k\u00a5",
    "শ্য": "k\u00a8",
    "শ্র": "k\u00ab",
    "শ্ল": "k\u00f8",
    "ষ্ক": "\u00ae‹",
    "ষ্ট": "\u00f3",
    "ষ্ঠ": "\u00f4",
    "ষ্ণ": "\u00f2",
    "ষ্প": "\u00ae\u00fa",
    "ষ্ফ": "\u00f5",
    "ষ্ম": "\u00ae\u00a7",
    "ষ্য": "l\u00a8",
    "ষ্র": "l\u00ab",
    "স্ক": "\u00af‹",
    "স্খ": "\u00f6",
    "স্ট": "\u00f7",
    "স্ত": "\u00af—",
    "স্থ": "\u00af’",
    "স্ন": "m\u0153",
    "স্প": "\u00af\u00fa",
    "স্ফ": "\u00f9",
    "স্ব": "\u00af^",
    "স্ম": "\u00af\u00a7",
    "স্য": "m\u00a8",
    "স্র": "m\u00ab",
    "স্ল": "\u00af\u00ad",
    "হ্ণ": "n\u00e8",
    "হ্ন": "\u00fd",
    "হ্ম": "\u00fe",
    "হ্য": "n\u00a8",
    "হ্র": "n\u00ab",
    "হ্ল": "n\u00ac",
    "ড়": "W়",
    "ঢ়": "X়",
    "য়": "h়",
    "রু": "i“",
    "রূ": "i\u0192",
    "শু": "\u00ef",
    "হু": "\u00fb",
    "হৃ": "\u00fc",
  };

  // single Unicode units → Bijoy glyphs (canonical choices)
  const CANON = {

    "\u0964": "|",
    "ঁ": "u",
    "ং": "s",
    "ঃ": "t",
    "অ": "A",
    "আ": "Av",
    "ই": "B",
    "ঈ": "C",
    "উ": "D",
    "ঊ": "E",
    "ঋ": "F",
    "এ": "G",
    "ঐ": "H",
    "ও": "I",
    "ঔ": "J",
    "ক": "K",
    "খ": "L",
    "গ": "M",
    "ঘ": "N",
    "ঙ": "O",
    "চ": "P",
    "ছ": "Q",
    "জ": "R",
    "ঝ": "S",
    "ঞ": "T",
    "ট": "U",
    "ঠ": "V",
    "ড": "W",
    "ঢ": "X",
    "ণ": "Y",
    "ত": "Z",
    "থ": "_",
    "দ": "`",
    "ধ": "a",
    "ন": "b",
    "প": "c",
    "ফ": "d",
    "ব": "e",
    "ভ": "f",
    "ম": "g",
    "য": "h",
    "র": "i",
    "ল": "j",
    "শ": "k",
    "ষ": "l",
    "স": "m",
    "হ": "n",
    "া": "v",
    "ি": "w",
    "ী": "x",
    "ু": "y",
    "ূ": "~",
    "ৃ": "…",
    "ে": "‡",
    "ৈ": "‰",
    "ো": "‡v",
    "ৌ": "‡Š",
    "্": "&",
    "ৎ": "r",
    "ৗ": "Š",
    "ড়": "o",
    "ঢ়": "p",
    "য়": "q",
    "০": "0",
    "১": "1",
    "২": "2",
    "৩": "3",
    "৪": "4",
    "৫": "5",
    "৬": "6",
    "৭": "7",
    "৮": "8",
    "৯": "9",
  };

  const B2U_SEQ_MAX = 3; // longest Bijoy sequence key (e.g. দ্রু → `ª“)
  const U2B_SEQ_MAX = 5; // longest Unicode key (e.g. ঙ্ক্ষ, চ্ছ্ব)

  /* -------- generic longest-match expansion -------- */
  function expand(text, table, maxLen) {
    let out = '';
    let i = 0;
    while (i < text.length) {
      let matched = null;
      const limit = Math.min(maxLen, text.length - i);
      for (let len = limit; len >= 1; len--) {
        const key = text.substr(i, len);
        if (Object.prototype.hasOwnProperty.call(table, key)) { matched = key; break; }
      }
      if (matched !== null) { out += table[matched]; i += matched.length; }
      else { out += text[i]; i++; }
    }
    return out;
  }

  /* -------- nukta composing (both directions use the same idea) -------- */
  function composeNukta(s) {
    return s
      .replace(/\u09A1\u09BC/g, '\u09DC') // ড়
      .replace(/\u09DD\u09BC/g, '\u09DD') // ঢ়
      .replace(/\u09AF\u09BC/g, '\u09DF'); // য়
  }

  /* -------- Bijoy → Unicode passes -------- */

  // Bijoy writes রেফ as consonant+র্ ; Unicode wants র্+consonant
  function hoistReph(s) {
    let out = '';
    let i = 0;
    while (i < s.length) {
      if (
        CONSONANTS.has(s[i]) &&
        s[i + 1] === '\u09B0' && // র
        s[i + 2] === HASANTA     // ্
      ) {
        out += '\u09B0' + HASANTA + s[i];
        i += 3;
      } else {
        out += s[i];
        i++;
      }
    }
    return out;
  }

  // pre-kars (ি ঈ ৈ ে) jump over their consonant cluster; merge ো/ৌ
  function placePreKars(s) {
    let out = '';
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (PRE_KARS.has(ch) && i + 1 < s.length && CONSONANTS.has(s[i + 1])) {
        let j = i + 1;
        j++; // the consonant itself
        while (j + 1 < s.length && s[j] === HASANTA && CONSONANTS.has(s[j + 1])) j += 2;
        out += s.substring(i + 1, j) + ch;
        i = j;
        if (ch === '\u09C7' && i < s.length) { // ে
          if (s[i] === '\u09BE') { out = out.slice(0, -1) + '\u09CB'; i++; }      // া → ো
          else if (s[i] === '\u09D7') { out = out.slice(0, -1) + '\u09CC'; i++; } // ৗ → ৌ
        }
      } else {
        out += ch;
        i++;
      }
    }
    return out;
  }

  function bijoyToUnicode(text) {
    // NOTE: রেফ (©) arrives as সি+© and is resolved by B2U_SEQ entries (র্ক→ক+©…)
    // so no separate reph-hoisting pass is needed.
    let s = expand(text, B2U_SEQ, B2U_SEQ_MAX);
    s = expand(s, SINGLE, 1);
    s = composeNukta(s);
    // stray nukta (়) may sit after a kar in some Bijoy texts — pull it onto its য/ড/ঢ
    s = s.replace(/([\u09AF\u09A1\u09DD])([\u09BE-\u09CC\u09D7]*)\u09BC/g, function (_, c, kar) {
      const composed = c === '\u09AF' ? '\u09DF' : (c === '\u09A1' ? '\u09DC' : '\u09DD');
      return composed + kar;
    });
    s = placePreKars(s);
    return s;
  }


  // র-ফলা: « ª ৳ all mean ্+র in Unicode order (halant before র)
  SINGLE['\u00AB'] = '\u09CD\u09B0';
  SINGLE['\u00AA'] = '\u09CD\u09B0';
  SINGLE['\u00D6'] = '\u09CD\u09B0';

  /* -------- Unicode → Bijoy passes -------- */

  function splitOKar(s) {
    return s
      .replace(/\u09CC/g, '\u09C7\u09D7') // ৌ → ে+ৗ
      .replace(/\u09CB/g, '\u09C7\u09BE'); // ো → ে+া
  }

  // pre-kars walk LEFT past their consonant cluster (mirror of placePreKars)
  function withdrawPreKars(s) {
    let out = '';
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (PRE_KARS.has(ch)) {
        let j = out.length;
        if (j > 0 && CONSONANTS.has(out[j - 1])) {
          j--; // the consonant this kar belongs to
          while (j - 2 >= 0 && out[j - 1] === HASANTA && CONSONANTS.has(out[j - 2])) j -= 2; // halant chain
        }
        out = out.slice(0, j) + ch + out.slice(j);
      } else {
        out += ch;
      }
      i++;
    }
    return out;
  }

  // Unicode র্+সি → Bijoy সি+© (রেফ)
  function swapReph(s) {
    let out = '';
    let i = 0;
    while (i < s.length) {
      if (s[i] === '\u09B0' && s[i + 1] === HASANTA && CONSONANTS.has(s[i + 2])) {
        out += s[i + 2] + REPH_MARK;
        i += 3;
      } else {
        out += s[i];
        i++;
      }
    }
    return out;
  }

  function unicodeToBijoy(text) {
    let s = composeNukta(text);
    s = splitOKar(s);
    s = withdrawPreKars(s);
    s = swapReph(s);
    s = expand(s, U2B_SEQ, U2B_SEQ_MAX);
    s = s.replace(/\u09CD\u09B0/g, '\u00AB'); // leftover halant+র = র-ফলা «
    s = expand(s, CANON, 1);
    return s;
  }

  return { bijoyToUnicode: bijoyToUnicode, unicodeToBijoy: unicodeToBijoy };
})();

if (typeof module === 'object' && module.exports) module.exports = BijoyEngine;

