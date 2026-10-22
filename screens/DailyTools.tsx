import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../theme";

type Surah = { number: number; name: string; ayahs: { id: number; text: string }[] };
type Props = { surahs: Surah[]; adhkar: { title: string; items: string[] }[] };
const STORE = "noor:daily-tools:v1";
const HABITS = ["الصلاة في وقتها", "ورد القرآن", "أذكار الصباح", "أذكار المساء", "مراجعة الحفظ", "دعاء اليوم"];
const ar = (n: number) => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
const todayKey = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-"); };

export default function DailyTools({ surahs, adhkar }: Props) {
 const [days, setDays] = useState("30");
 const [planDays, setPlanDays] = useState(30);
 const [doneVerses, setDoneVerses] = useState(0);
 const [checked, setChecked] = useState<string[]>([]);
 const [notes, setNotes] = useState("");
 const [query, setQuery] = useState("");
 const [showVerse, setShowVerse] = useState(false);
 const [practiceSurahIndex, setPracticeSurahIndex] = useState(17);
 const [practiceAyahIndex, setPracticeAyahIndex] = useState(0);
 const [focusMinutes, setFocusMinutes] = useState("15");
 const [focusLeft, setFocusLeft] = useState(0);
 const [ramadanTasks, setRamadanTasks] = useState<string[]>([]);
 const [fontSize, setFontSize] = useState(22);
 const [lastUpdated, setLastUpdated] = useState("");

 useEffect(() => {
  AsyncStorage.getItem(STORE).then(raw => {
   if (!raw) return;
   const data = JSON.parse(raw);
   setPlanDays(data.planDays ?? 30); setDays(String(data.planDays ?? 30));
   setDoneVerses(data.doneVerses ?? 0); setNotes(data.notes ?? "");
   setFontSize(data.fontSize ?? 22); setRamadanTasks(data.ramadanTasks ?? []);
   const date = todayKey(); setChecked(data.checkedDate === date ? (data.checked ?? []) : []);
   setLastUpdated(data.updatedAt ?? "");
  }).catch(() => {});
 }, []);
 const persist = async (patch: Record<string, any>) => {
  try {
   const raw = await AsyncStorage.getItem(STORE);
   const old = raw ? JSON.parse(raw) : {};
   const next = { ...old, ...patch, updatedAt: new Date().toISOString() };
   await AsyncStorage.setItem(STORE, JSON.stringify(next)); setLastUpdated(next.updatedAt);
  } catch { Alert.alert("تعذر الحفظ", "تأكد من وجود مساحة متاحة على الجهاز ثم حاول مرة أخرى."); }
 };
 const allVerses = useMemo(() => surahs.reduce((n, s) => n + s.ayahs.length, 0), [surahs]);
 const dailyTarget = Math.ceil(allVerses / Math.max(1, planDays));
 const results = useMemo(() => {
  const q = query.trim().replace(/[ًٌٍَُِّْـ]/g, "");
  if (q.length < 2) return [];
  const normalized = (v: string) => v.replace(/[ًٌٍَُِّْـ]/g, "").toLowerCase();
  const found: { label: string; text: string; surah?: number; ayah?: number; type: string }[] = [];
  for (const s of surahs) for (const a of s.ayahs) {
   if (normalized(a.text).includes(normalized(q))) {
    found.push({ label: `سورة ${s.name} · الآية ${a.id}`, text: a.text, surah: s.number, ayah: a.id, type: "آية" });
    if (found.length >= 30) return found;
   }
  }
  for (const group of adhkar) for (const item of group.items) {
   if (normalized(item).includes(normalized(q))) {
    found.push({ label: group.title, text: item, type: "ذكر" });
    if (found.length >= 30) return found;
   }
  }
  return found;
 }, [query, surahs, adhkar]);
 const randomVerse = useMemo(() => {
  const s = surahs[17] ?? surahs[0];
  return s?.ayahs[Math.min(4, (s?.ayahs.length ?? 1)-1)];
 }, [surahs]);
 const exportData = async () => {
  try {
   const raw = await AsyncStorage.getItem(STORE);
   await Share.share({ title: "نسخة احتياطية - نور الإسلام", message: JSON.stringify({ app: "نور الإسلام", version: 1, dailyTools: raw ? JSON.parse(raw) : {}, exportedAt: new Date().toISOString() }, null, 2) });
  } catch { Alert.alert("تعذر التصدير", "لم نتمكن من تجهيز النسخة الاحتياطية."); }
 };
 const setHabit = (name: string) => {
  const next = checked.includes(name) ? checked.filter(x => x !== name) : [...checked, name];
  setChecked(next); persist({ checked: next, checkedDate: todayKey() });
 };
 const startFocus = () => {
  const mins = Math.max(1, Math.min(180, Number(focusMinutes) || 15));
  setFocusLeft(mins * 60);
  Alert.alert("جلسة التركيز بدأت", `خصص ${ar(mins)} دقيقة للقراءة بهدوء. العداد المعروض يمكنك متابعته داخل هذه الصفحة.`);
 };
 useEffect(() => {
  if (focusLeft <= 0) return;
  const timer = setTimeout(() => setFocusLeft(v => Math.max(0, v-1)), 1000);
  return () => clearTimeout(timer);
 }, [focusLeft]);
 useEffect(() => { if (focusLeft === 0) return; }, [focusLeft]);
 const fmt = (sec: number) => `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;

 return <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
  <Text style={s.title}>مركز العبادة والتعلّم</Text>
  <Text style={s.note}>تُحفظ بيانات هذه الصفحة على جهازك. التذكيرات والودجت والمزامنة السحابية تحتاج إعدادات إضافية مستقلة.</Text>

  <View style={s.card}>
   <Text style={s.heading}>📖 خطة ختم القرآن</Text>
   <Text style={s.body}>اختر عدد الأيام التي تناسبك؛ الخطة تقديرية حسب عدد الآيات في المصحف المتاح بالتطبيق.</Text>
   <View style={s.row}><TextInput value={days} onChangeText={setDays} keyboardType="number-pad" style={s.input} placeholder="عدد الأيام" placeholderTextColor={colors.muted}/><Pressable style={s.button} onPress={() => { const d=Math.max(1,Math.min(365,Number(days)||30)); setPlanDays(d); persist({planDays:d}); }}><Text style={s.buttonText}>إنشاء الخطة</Text></Pressable></View>
   <Text style={s.metric}>هدفك اليومي: نحو {ar(dailyTarget)} آية</Text>
   <Text style={s.body}>إجمالي الآيات: {ar(allVerses)} · المدة: {ar(planDays)} يومًا</Text>
   <View style={s.row}><Pressable style={s.button} onPress={() => { const next=Math.min(allVerses,doneVerses+dailyTarget); setDoneVerses(next); persist({doneVerses:next}); }}><Text style={s.buttonText}>تسجيل إنجاز اليوم</Text></Pressable><Pressable style={s.secondary} onPress={() => {setDoneVerses(0);persist({doneVerses:0});}}><Text style={s.body}>إعادة التقدم</Text></Pressable></View>
   <Text style={s.body}>التقدم المسجل: {ar(doneVerses)} / {ar(allVerses)} آية ({Math.round(doneVerses/Math.max(1,allVerses)*100)}٪)</Text>
   <View style={s.progress}><View style={[s.progressFill,{width:`${Math.min(100,doneVerses/Math.max(1,allVerses)*100)}%`}]}/></View>
  </View>

  <View style={s.card}>
   <Text style={s.heading}>✅ متابعة العبادات اليومية</Text>
   <Text style={s.note}>قائمة اختيارية لمساعدتك على المتابعة الشخصية، وليست حكمًا على أدائك.</Text>
   {HABITS.map(h => <Pressable key={h} onPress={() => setHabit(h)} style={s.checkRow}><Text style={[s.checkbox,checked.includes(h)&&s.checkboxOn]}>{checked.includes(h)?"✓":" "}</Text><Text style={s.body}>{h}</Text></Pressable>)}
   <Text style={s.metric}>أنجزت {ar(checked.length)} من {ar(HABITS.length)} مهام اليوم</Text>
  </View>

  <View style={s.card}>
   <Text style={s.heading}>🔎 البحث في القرآن والأذكار</Text>
   <TextInput value={query} onChangeText={setQuery} style={s.inputWide} placeholder="اكتب كلمتين من آية أو ذكر..." placeholderTextColor={colors.muted}/>
   {query.trim().length>=2 && results.length===0 ? <Text style={s.note}>لا توجد نتائج مطابقة في البيانات المتاحة دون تشكيل. جرّب كلمات أخرى.</Text> : null}
   {results.map((r,i)=><View key={i} style={s.result}><Text style={s.note}>{r.type} · {r.label}</Text><Text style={s.body}>{r.text}</Text></View>)}
   <Text style={s.note}>يعرض البحث حتى ٣٠ نتيجة من النصوص المحمّلة داخل التطبيق، ولا يستخدم بحثًا صوتيًا.</Text>
  </View>

  <View style={s.card}>
   <Text style={s.heading}>🧠 تمرين مراجعة الحفظ</Text>
   <Text style={s.note}>آية عشوائية من القرآن للتدريب. اضغط لإظهار النص، أو اختر آية أخرى ثم راجع من مصحف موثوق.</Text>
   <Text style={[s.verse,{fontSize}]}>{showVerse ? (randomVerse?.text ?? "تعذر تحميل الآية") : "••••••••••••••••••"}</Text>
   <Text style={s.note}>سورة {practiceSurah?.name ?? "—"} · الآية {ar(randomVerse?.id ?? 0)}</Text><View style={s.row}><Pressable style={s.button} onPress={() => setShowVerse(v=>!v)}><Text style={s.buttonText}>{showVerse?"إخفاء الآية":"إظهار الآية"}</Text></Pressable><Pressable style={s.secondary} onPress={nextPractice}><Text style={s.body}>آية أخرى</Text></Pressable></View>
   <View style={s.row}><Pressable style={s.secondary} onPress={()=>setFontSize(v=>Math.max(16,v-2))}><Text style={s.body}>تصغير الخط</Text></Pressable><Pressable style={s.secondary} onPress={()=>setFontSize(v=>Math.min(34,v+2))}><Text style={s.body}>تكبير الخط</Text></Pressable></View>
   <Text style={s.note}>هذا تمرين بسيط؛ لا يتضمن حاليًا التعرف الآلي على التلاوة أو تقييم الحفظ.</Text>
  </View>

  <View style={s.card}>
   <Text style={s.heading}>📝 ملاحظاتك الشخصية</Text>
   <TextInput value={notes} onChangeText={setNotes} onBlur={()=>persist({notes})} multiline style={s.notes} placeholder="اكتب فائدة أو ملاحظة للرجوع إليها..." placeholderTextColor={colors.muted}/>
   <Pressable style={s.button} onPress={()=>persist({notes})}><Text style={s.buttonText}>حفظ الملاحظات</Text></Pressable>
  </View>

  <View style={s.card}>
   <Text style={s.heading}>⏳ مؤقت جلسة التركيز</Text>
   <Text style={s.note}>اضبط مدة مناسبة للقراءة أو المراجعة. المؤقت يعمل ما دامت الصفحة نشطة، ولا يرسل إشعارًا عند انتهاء الوقت.</Text>
   <View style={s.row}><TextInput value={focusMinutes} onChangeText={setFocusMinutes} keyboardType="number-pad" style={s.input} placeholder="دقائق" placeholderTextColor={colors.muted}/><Pressable style={s.button} onPress={startFocus}><Text style={s.buttonText}>بدء الجلسة</Text></Pressable></View>
   {focusLeft>0 ? <><Text style={s.metric}>{fmt(focusLeft)}</Text><Pressable style={s.secondary} onPress={()=>setFocusLeft(0)}><Text style={s.body}>إيقاف المؤقت</Text></Pressable></> : null}
  </View>

  <View style={s.card}>
   <Text style={s.heading}>🌙 قائمة رمضان</Text>
   <Text style={s.note}>قائمة قابلة للاستخدام في رمضان أو في أي وقت. مواعيد الإمساك والإفطار يجب ضبطها حسب المدينة والمصدر المحلي الموثوق.</Text>
   {["قراءة ورد القرآن","أذكار الصباح والمساء","الدعاء","الصدقة","صلة الرحم","مراجعة الختمة"].map(task=><Pressable key={task} onPress={()=>{const next=ramadanTasks.includes(task)?ramadanTasks.filter(x=>x!==task):[...ramadanTasks,task];setRamadanTasks(next);persist({ramadanTasks:next});}} style={s.checkRow}><Text style={[s.checkbox,ramadanTasks.includes(task)&&s.checkboxOn]}>{ramadanTasks.includes(task)?"✓":" "}</Text><Text style={s.body}>{task}</Text></Pressable>)}
  </View>

  <View style={s.card}>
   <Text style={s.heading}>💾 تصدير نسخة احتياطية</Text>
   <Text style={s.note}>يجهّز ملفًا نصيًا بصيغة JSON عبر قائمة المشاركة. احفظه في مكان آمن؛ الاستعادة التلقائية من الملف غير متاحة بعد.</Text>
   <Pressable style={s.button} onPress={exportData}><Text style={s.buttonText}>مشاركة / تصدير بيانات الصفحة</Text></Pressable>
   {lastUpdated ? <Text style={s.note}>آخر تحديث محفوظ: {new Date(lastUpdated).toLocaleString("ar-EG")}</Text> : null}
  </View>
 </ScrollView>;
}

const s = StyleSheet.create({
 content:{padding:18,paddingBottom:120,gap:14}, title:{color:colors.goldSoft,fontSize:28,fontWeight:"900",textAlign:"right"},
 note:{color:colors.muted,fontSize:12,lineHeight:19,textAlign:"right"}, card:{backgroundColor:colors.surface,borderRadius:22,padding:16,borderWidth:1,borderColor:colors.line,gap:10},
 heading:{color:colors.goldSoft,fontSize:20,fontWeight:"800",textAlign:"right"}, body:{color:colors.text,textAlign:"right",lineHeight:24,flexShrink:1},
 row:{flexDirection:"row",gap:8,alignItems:"center",flexWrap:"wrap"}, input:{flex:1,minWidth:90,color:colors.text,borderWidth:1,borderColor:colors.line,borderRadius:12,padding:10,textAlign:"right"},
 inputWide:{color:colors.text,borderWidth:1,borderColor:colors.line,borderRadius:12,padding:12,textAlign:"right"}, button:{backgroundColor:colors.gold,borderRadius:12,padding:12,alignItems:"center",justifyContent:"center"},
 buttonText:{color:"#10312c",fontWeight:"800"}, secondary:{borderWidth:1,borderColor:colors.line,borderRadius:12,padding:10,alignItems:"center"},
 metric:{color:colors.goldSoft,fontSize:17,fontWeight:"800",textAlign:"right"}, progress:{height:9,backgroundColor:colors.line,borderRadius:9,overflow:"hidden"},progressFill:{height:9,backgroundColor:colors.gold,borderRadius:9},
 checkRow:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:7,borderBottomWidth:1,borderBottomColor:colors.line},checkbox:{width:25,height:25,borderRadius:7,borderWidth:1,borderColor:colors.gold,textAlign:"center",textAlignVertical:"center",color:"#10312c",overflow:"hidden"},checkboxOn:{backgroundColor:colors.gold,fontWeight:"900"},
 result:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:colors.line},verse:{color:colors.text,textAlign:"center",lineHeight:38,paddingVertical:12},notes:{minHeight:100,color:colors.text,borderWidth:1,borderColor:colors.line,borderRadius:12,padding:12,textAlign:"right",textAlignVertical:"top"}
});
