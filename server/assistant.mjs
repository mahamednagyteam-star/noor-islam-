import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "../data");
const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 15;
const hits = new Map();

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g, "").toLowerCase();
}
function words(value) {
  return [...new Set(normalize(value).split(/[^\p{L}\p{N}]+/u).filter(x => x.length > 2))];
}
function loadContext(question) {
  const queryWords = words(question);
  const items = [];
  try {
    const quran = JSON.parse(fs.readFileSync(path.join(dataDir, "quran-uthmani.json"), "utf8"));
    for (const surah of quran) for (const ayah of (surah.verses || [])) {
      const text = ayah.text || "";
      const score = words(text).filter(word => queryWords.includes(word)).length;
      if (score > 0) items.push({ score, source: `القرآن الكريم، السورة رقم ${surah.id}، الآية ${ayah.id}`, text });
    }
  } catch {}
  try {
    const hisn = JSON.parse(fs.readFileSync(path.join(dataDir, "hisn-muslim.json"), "utf8"));
    for (const [title, section] of Object.entries(hisn)) for (const text of (section.text || [])) {
      const score = words(text).filter(word => queryWords.includes(word)).length;
      if (score > 0) items.push({ score, source: `حصن المسلم: ${title}`, text });
    }
  } catch {}
  return items.sort((a, b) => b.score - a.score).slice(0, 8).map(({ source, text }) => ({ source, text }));
}
function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": ALLOWED_ORIGIN, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return true;
  recent.push(now); hits.set(ip, recent); return false;
}
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});
  const url = new URL(req.url || "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true, modelConfigured: Boolean(API_KEY) });
  if (req.method !== "POST" || url.pathname !== "/ask") return json(res, 404, { error: "not_found" });
  if (rateLimited(req.socket.remoteAddress || "unknown")) return json(res, 429, { error: "rate_limited", message: "حاول مرة أخرى بعد قليل." });
  if (!API_KEY) return json(res, 503, { error: "not_configured", message: "الخادم يحتاج إعداد OPENAI_API_KEY في بيئة الاستضافة." });
  let raw = "";
  try {
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 12000) return json(res, 413, { error: "request_too_large" });
    }
    const body = JSON.parse(raw || "{}");
    const question = String(body.question || "").trim();
    if (question.length < 2 || question.length > 1000) return json(res, 400, { error: "invalid_question", message: "اكتب سؤالًا من ٢ إلى ١٠٠٠ حرف." });
    const context = loadContext(question);
    const instructions = [
      "أنت مساعد بحث إسلامي باللغة العربية، لا تصدر فتاوى ولا تدّعِ أنك عالم.",
      "أجب اعتمادًا على سياق المصادر المرفق فقط. لا تخترع آيات أو أحاديث أو أرقام مراجع.",
      "ميّز نص القرآن عن الأذكار. إذا لم يكف السياق للإجابة، قل ذلك بوضوح واقترح سؤال أهل العلم.",
      "أرفق أسماء المصادر الموجودة في السياق مع كل معلومة ذات صلة. لا تعرض الاستنتاج غير المؤكد كحقيقة قطعية.",
      "لا تطلب بيانات شخصية من المستخدم."
    ].join("\n");
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, instructions, input: JSON.stringify({ question, availableSources: context }), max_output_tokens: 700 })
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json(res, 502, { error: "upstream_error", message: "تعذر الحصول على إجابة من خدمة المساعد." });
    const answer = (result.output || []).flatMap(item => item.content || []).filter(item => item.type === "output_text").map(item => item.text).join("\n").trim();
    if (!answer) return json(res, 502, { error: "empty_answer", message: "لم تصل إجابة صالحة." });
    return json(res, 200, { answer, sources: context.map(item => item.source), disclaimer: "إجابة للمساعدة في البحث وليست فتوى شرعية." });
  } catch {
    return json(res, 400, { error: "invalid_request", message: "تعذر قراءة الطلب." });
  }
});
server.listen(PORT, "0.0.0.0", () => console.log(`Noor Islamic assistant listening on port ${PORT}`));
