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

await mkdir("data", { recursive: true });
for (const source of sources) {
  const response = await fetch(source.url, { headers: { "User-Agent": "Noor-Islam-App/1.0" } });
  if (!response.ok) throw new Error(`Failed to download ${source.label}: HTTP ${response.status}`);
  const data = await response.text();
  JSON.parse(data);
  await writeFile(source.path, data + "\n", "utf8");
  console.log(`Downloaded ${source.label} -> ${source.path} (${data.length} chars)`);
}
