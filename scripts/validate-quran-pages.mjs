import fs from "node:fs";

const pages = JSON.parse(fs.readFileSync(new URL("../data/quran-pages.json", import.meta.url), "utf8"));
const quranPath = new URL("../data/quran-uthmani.json", import.meta.url);
if (!fs.existsSync(quranPath)) {
  throw new Error("Missing data/quran-uthmani.json. Run npm run prepare:data first.");
}
const quran = JSON.parse(fs.readFileSync(quranPath, "utf8"));

if (!Array.isArray(quran) || quran.length !== 114) {
  throw new Error("Expected exactly 114 Quran surahs.");
}
if (!Array.isArray(pages) || pages.length !== 604) {
  throw new Error("Expected exactly 604 Madani mushaf page starts.");
}
const verseCounts = new Map(quran.map((surah) => [surah.id, surah.verses?.length ?? 0]));
const seen = new Set();
let previousIndex = -1;
const starts = [];

for (let i = 0; i < pages.length; i += 1) {
  const item = pages[i];
  if (item.p !== i + 1) throw new Error(`Page sequence error at index ${i}: expected ${i + 1}.`);
  if (!Number.isInteger(item.s) || item.s < 1 || item.s > 114) throw new Error(`Invalid surah on page ${item.p}.`);
  if (!Number.isInteger(item.a) || item.a < 1 || item.a > (verseCounts.get(item.s) ?? 0)) {
    throw new Error(`Invalid verse reference on page ${item.p}: ${item.s}:${item.a}.`);
  }
  const key = `${item.s}:${item.a}`;
  if (seen.has(key)) throw new Error(`Duplicate page start ${key}.`);
  seen.add(key);
  const index = quran.slice(0, item.s - 1).reduce((sum, surah) => sum + (surah.verses?.length ?? 0), 0) + item.a - 1;
  if (index <= previousIndex) throw new Error(`Page starts are not strictly increasing at page ${item.p}.`);
  previousIndex = index;
  starts.push(index);
}

if (pages[0].s !== 1 || pages[0].a !== 1) {
  throw new Error("Page 1 must start at Al-Fatiha 1:1.");
}
const totalVerses = quran.reduce((sum, surah) => sum + (surah.verses?.length ?? 0), 0);
if (starts[starts.length - 1] >= totalVerses) throw new Error("Final page starts beyond the Quran.");
console.log(`Quran validation passed: ${quran.length} surahs, ${totalVerses} verses, ${pages.length} ordered page starts.`);
