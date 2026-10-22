import { mkdir, writeFile } from "node:fs/promises";

const sources = [
  {
    url: "https://quran-json.risanb.com/text/uthmani/quran.json",
    path: "data/quran-uthmani.json",
    label: "Quran text (Uthmani) — Quran JSON / Tanzil attribution",
  },
  {
    url: "https://raw.githubusercontent.com/rn0x/hisn_almuslim_json/main/hisn_almuslim.json",
    path: "data/hisn-muslim.json",
    label: "Hisn Al-Muslim JSON",
  },
];

const audioSources = [
  { url: "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_01_Fajr_Adhan.mp3", path: "assets/adhan/fajr.mp3", label: "Fajr adhan" },
  { url: "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_02_Dhuhr_Adhan.mp3", path: "assets/adhan/adhan.mp3", label: "Dhuhr adhan (used for other prayers)" },
];

await mkdir("data", { recursive: true });
await mkdir("assets/adhan", { recursive: true });
for (const source of sources) {
  const response = await fetch(source.url, { headers: { "User-Agent": "Noor-Islam-App/1.0" } });
  if (!response.ok) throw new Error(`Failed to download ${source.label}: HTTP ${response.status}`);
  const data = await response.text();
  JSON.parse(data);
  await writeFile(source.path, data + "\n", "utf8");
  console.log(`Downloaded ${source.label} -> ${source.path} (${data.length} chars)`);
}
for (const source of audioSources) {
  const response = await fetch(source.url, { headers: { "User-Agent": "Noor-Islam-App/1.0" } });
  if (!response.ok) throw new Error(`Failed to download ${source.label}: HTTP ${response.status}`);
  const data = new Uint8Array(await response.arrayBuffer());
  if (data.length < 10000) throw new Error(`Audio file appears incomplete: ${source.label}`);
  await writeFile(source.path, data);
  console.log(`Downloaded ${source.label} -> ${source.path} (${data.length} bytes)`);
}
