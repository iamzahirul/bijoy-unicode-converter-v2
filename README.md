# বিজয় ⇄ ইউনিকোড কনভার্টার — ভার্সন ২ · নিজস্ব ইঞ্জিন

> পুরনো **Bijoy / SutonnyMJ** লেখা এক ক্লিকে **ইউনিকোডে** — আর উল্টোটাও।
> **ভার্সন ২-তে কনভার্সন ইঞ্জিন সম্পূর্ণ শূন্য থেকে নতুন করে লেখা** — আমার নিজস্ব অ্যালগরিদম, আমার নিজস্ব আর্কিটেকচার।

Bangladesh's govt offices, courts and newspapers still carry decades of text typed in Bijoy. Copy it anywhere modern and it turns into garbage like `Avwg evsjv‡`ki`. This tool fixes that — instantly, for free, offline.

## ⚡ Version 2 — scratch-built engine

The v1 folder reused an existing open-source engine (Apache-2.0). This version replaces it with an engine **designed and written from scratch** in `engine.js`:

- **My pipeline design** — Bijoy→Unicode runs 4 stages: sequence expansion → glyph mapping → nukta composing → pre-kar placement; Unicode→Bijoy mirrors it exactly
- **My reordering rules** — handles রেফ (রফলা), র-ফলা, য-ফলা, ো/ৌ কার ভাঙা, প্রি-কার ক্লাস্টার-ওয়াক (হসন্ত-চেইন সহ)
- **Handles cases other converters miss**: `সূর্যোদয়`, `কর্মসূচি`, `মন্ত্রণালয়ের`, ডাবল প্রি-কার (`চিরদিন` = ি-চ + ি-র), যুক্তাক্ষর-চেইন (`ষ্ট্র`, `ন্ত্র`, `ম্প`…)

### Test results

| Test | Score |
|---|---|
| Conjuncts (যুক্তাক্ষর) round-trip | **1050 / 1050** |
| Real sentence corpus round-trip | **35 / 35** |
| Decoding legacy Bijoy text variants | 33 / 35 (2 are artifacts of other tools) |

```text
বিজয়    : Dfq cv‡k av‡bi kx‡l †ewóZ cvwb‡Z fvmgvb RvZxq dzj kvcjv|
ইউনিকোড  : উভয় পাশে ধানের শীষে বেষ্টিত পানিতে ভাসমান জাতীয় ফুল শাপলা।
```

## ✨ Features

- ✅ Two-way: **Bijoy → Unicode** and **Unicode → Bijoy**
- ✅ Full যুক্তাক্ষর, রেফ, র-ফলা/য-ফলা, ং ঃ ঁ, ৎ, ড় ঢ় য়, বাংলা সংখ্যা
- ✅ Smart hint when you paste the wrong type of text
- ✅ Swap ⇅, Copy 📋, sample texts, char/word counter, live conversion
- ✅ **100% offline** — nothing leaves your browser. Single page + one JS file.
- ✅ Engine is UMD-style: works in the browser AND as a Node.js module

## 🚀 Run locally

```bash
python -m http.server 8080
# → http://localhost:8080
```

## 🌍 Deploy on GitHub Pages

```bash
git init && git add . && git commit -m "Day 2/100: Bijoy⇄Unicode converter v2 - scratch-built engine"
git branch -M main
git remote add origin https://github.com/iamzahirul/day-02-bijoy-unicode-converter-v2.git
git push -u origin main
```

Then: **Settings → Pages → Deploy from branch → main / (root)**.

## 📁 Structure

```
index.html   → UI (dark, Bangla-first, mobile friendly)
engine.js    → the conversion engine (written from scratch, ~900 lines incl. glyph tables)
```

The glyph tables in `engine.js` implement the publicly documented **Bijoy Classic** font layout — the same character positions any Bijoy keyboard/font defines.

## 🗺️ Roadmap

- [ ] Bulk `.txt` file conversion (upload → download)
- [ ] SomewhereIn / Boisakhi layout support
- [ ] Browser extension
- [ ] npm package `bijoy-engine`

## 📜 License

MIT — Copyright (c) 2026 **Rasel (iamzahirul)**. Engine and UI both original work.

---

*Day 2 of 100 — built in public by Rasel [@iamzahirul](https://github.com/iamzahirul)*
