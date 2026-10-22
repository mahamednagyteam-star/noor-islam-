import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import Voice from "@react-native-voice/voice";
import { colors } from "../theme";

type Surah = { number:number; name:string; ayahs:{id:number;text:string}[] };
type Group = { title:string; items:string[] };
const BACKUP_VERSION = 1;
const SETTINGS_KEY = "noor:settings:v1";
const ar = (n:number) => String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[Number(d)]);

export default function LibrarySettings({surahs,adhkar}:{surahs:Surah[];adhkar:Group[]}) {
 const [query,setQuery]=useState("");
 const [listening,setListening]=useState(false);
 const [fontSize,setFontSize]=useState(22);
 const [reminders,setReminders]=useState(true);
 const [reminderTime,setReminderTime]=useState("20:00");
 const [reminderStatus,setReminderStatus]=useState("");
 const [compact,setCompact]=useState(false);
 const [restoreText,setRestoreText]=useState("");
 const [restoreOpen,setRestoreOpen]=useState(false);
 const [saved,setSaved]=useState(false);
 useEffect(()=>{AsyncStorage.getItem(SETTINGS_KEY).then(v=>{if(!v)return;const x=JSON.parse(v);setFontSize(x.quranFontSize??22);setReminders(x.dailyReminderPreference??true);setReminderTime(x.dailyReminderTime??"20:00");setCompact(x.compactHome??false)}).catch(()=>{});Voice.onSpeechResults=(event:any)=>{const phrase=event.value?.[0];if(phrase)setQuery(phrase);setListening(false)};Voice.onSpeechError=()=>{setListening(false);Alert.alert("تعذر التعرف على الصوت","تأكد من صلاحية الميكروفون وتوفر خدمة التعرف على الكلام في الهاتف.")};return()=>{Voice.destroy().then(()=>Voice.removeAllListeners()).catch(()=>{});};},[]);
 const saveSettings=async(patch:Record<string,any>)=>{try{const raw=await AsyncStorage.getItem(SETTINGS_KEY);const next={...(raw?JSON.parse(raw):{}),...patch};await AsyncStorage.setItem(SETTINGS_KEY,JSON.stringify(next));setSaved(true);setTimeout(()=>setSaved(false),2000)}catch{Alert.alert("تعذر الحفظ","لم نتمكن من حفظ الإعدادات على الجهاز.")}};
 const normalize=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g,"").toLowerCase();
 const results=useMemo(()=>{
  const q=normalize(query.trim());if(q.length<2)return [];
  const found:{key:string;title:string;text:string;kind:string}[]=[];
  for(const surah of surahs)for(const ayah of surah.ayahs)if(normalize(ayah.text).includes(q)){found.push({key:`q-${surah.number}-${ayah.id}`,title:`سورة ${surah.name} · الآية ${ar(ayah.id)}`,text:ayah.text,kind:"قرآن"});if(found.length>=40)return found;}
  for(const group of adhkar)for(let i=0;i<group.items.length;i++)if(normalize(group.items[i]).includes(q)){found.push({key:`d-${group.title}-${i}`,title:group.title,text:group.items[i],kind:"ذكر"});if(found.length>=40)return found;}
  return found;
 },[query,surahs,adhkar]);
 const scheduleReminder=async()=>{try{const match=reminderTime.match(/^(\d{1,2}):(\d{2})$/);if(!match)throw new Error("time");const hour=Number(match[1]),minute=Number(match[2]);if(hour>23||minute>59)throw new Error("time");const raw=await AsyncStorage.getItem(SETTINGS_KEY);const old=raw?JSON.parse(raw):{};if(old.dailyReminderId)await Notifications.cancelScheduledNotificationAsync(old.dailyReminderId).catch(()=>{});if(!reminders){await AsyncStorage.setItem(SETTINGS_KEY,JSON.stringify({...old,dailyReminderPreference:false,dailyReminderId:null,dailyReminderTime:reminderTime}));setReminderStatus("تم إيقاف التذكير اليومي.");return;}const permission=await Notifications.requestPermissionsAsync();if(!permission.granted){Alert.alert("الإشعارات غير مفعّلة","اسمح بالإشعارات من إعدادات الهاتف ثم حاول مجددًا.");return;}const id=await Notifications.scheduleNotificationAsync({content:{title:"نور الإسلام",body:"حان وقت وردك اليومي من القرآن أو الأذكار. اجعل لك وقتًا يناسبك.",sound:true},trigger:{hour,minute,repeats:true}});await AsyncStorage.setItem(SETTINGS_KEY,JSON.stringify({...old,dailyReminderPreference:true,dailyReminderId:id,dailyReminderTime:reminderTime}));setReminderStatus("تم جدولة تذكير يومي على هذا الجهاز.");}catch{Alert.alert("تعذر ضبط التذكير","تحقق من الوقت بصيغة 20:00 ثم حاول مرة أخرى.");}};
 const backup=async()=>{try{const keys=await AsyncStorage.getAllKeys();const pairs=await AsyncStorage.multiGet(keys);const payload={app:"نور الإسلام",backupVersion:BACKUP_VERSION,createdAt:new Date().toISOString(),data:Object.fromEntries(pairs.filter((x):x is [string,string]=>!!x[0]&&x[1]!==null))};await Share.share({title:"نسخة احتياطية - نور الإسلام",message:JSON.stringify(payload,null,2)});}catch{Alert.alert("تعذر التصدير","لم نتمكن من إعداد النسخة الاحتياطية.");}};
 const restore=async()=>{try{const parsed=JSON.parse(restoreText);if(!parsed||parsed.app!=="نور الإسلام"||parsed.backupVersion!==BACKUP_VERSION||!parsed.data||typeof parsed.data!=="object"||Array.isArray(parsed.data))throw new Error("invalid");const pairs=Object.entries(parsed.data);if(!pairs.length)throw new Error("empty");if(pairs.some(([k,v])=>typeof k!=="string"||typeof v!=="string"))throw new Error("invalid");Alert.alert("تأكيد الاستعادة",`سيتم استبدال البيانات المحفوظة للمفاتيح الموجودة في النسخة (${ar(pairs.length)} عنصر). هل تريد المتابعة؟`,[{text:"إلغاء",style:"cancel"},{text:"استعادة",style:"destructive",onPress:async()=>{try{await AsyncStorage.multiSet(pairs as [string,string][]);setRestoreText("");setRestoreOpen(false);Alert.alert("تمت الاستعادة","أُعيدت البيانات المحلية. قد تحتاج لإعادة فتح الشاشة لرؤية التغييرات.");}catch{Alert.alert("تعذر الاستعادة","حدث خطأ أثناء كتابة البيانات.");}}}]);}catch{Alert.alert("ملف غير صالح","الصق محتوى JSON كاملًا صادرًا من النسخة الاحتياطية داخل التطبيق.");}};
 const toggleVoice=async()=>{try{if(listening){await Voice.stop();setListening(false);return;}setListening(true);await Voice.start("ar-EG");}catch{setListening(false);Alert.alert("البحث الصوتي غير متاح","تحقق من تثبيت خدمات التعرف على الكلام وصلاحية الميكروفون.");}};
 const open=async(url:string)=>{try{await Linking.openURL(url)}catch{Alert.alert("تعذر فتح الرابط","تحقق من اتصالك بالإنترنت أو افتح الرابط من المتصفح.")}};
 const LinkRow=({title,description,url}:{title:string;description:string;url:string})=><Pressable onPress={()=>open(url)} style={s.link}><Text style={s.linkTitle}>{title} ↗</Text><Text style={s.note}>{description}</Text></Pressable>;
 return <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
  <Text style={s.title}>المكتبة والإعدادات</Text>
  <Text style={s.note}>أدوات البحث والتخصيص والنسخ الاحتياطي. لا نعرض نصوص تفسير أو أحاديث غير موثقة محليًا؛ الروابط التالية تفتح مصادر للقراءة والتحقق.</Text>
  <View style={s.card}>
   <Text style={s.heading}>🔎 البحث في القرآن والأذكار</Text>
   <TextInput value={query} onChangeText={setQuery} style={s.input} placeholder="اكتب عبارة من آية أو ذكر" placeholderTextColor={colors.muted}/><Pressable style={s.secondary} onPress={toggleVoice}><Text style={s.body}>{listening?"🎙️ جارٍ الاستماع… اضغط للإيقاف":"🎙️ البحث بالصوت بالعربية"}</Text></Pressable>
   {query.trim().length>=2&&results.length===0?<Text style={s.note}>لا توجد نتائج في البيانات المحلية المحمّلة.</Text>:null}
   {results.map(r=><View key={r.key} style={s.result}><Text style={s.note}>{r.kind} · {r.title}</Text><Text style={s.body}>{r.text}</Text></View>)}
   <Text style={s.note}>تظهر حتى ٤٠ نتيجة. البحث نصي حاليًا ولا يتضمن التعرف على الصوت.</Text>
  </View>
  <View style={s.card}>
   <Text style={s.heading}>📚 مصادر التفسير والحديث</Text>
   <LinkRow title="Quran.com — القرآن والتفسير" description="قراءة القرآن والتفاسير المتاحة مع المراجع." url="https://quran.com/"/>
   <LinkRow title="Altafsir — مكتبة التفسير" description="مصدر خارجي للاطلاع على كتب التفسير." url="https://www.altafsir.com/"/>
   <LinkRow title="Sunnah.com — كتب الحديث" description="البحث في مجموعات حديثية مع ذكر الكتاب والمرجع." url="https://sunnah.com/"/>
   <Text style={s.note}>يلزم الإنترنت لفتح المصادر. لا يُصدر التطبيق فتوى ولا يستبدل الرجوع لأهل العلم.</Text>
  </View>
  <View style={s.card}>
   <Text style={s.heading}>⚙️ إعدادات القراءة</Text>
   <Text style={s.body}>حجم خط القرآن: {ar(fontSize)}</Text>
   <View style={s.row}><Pressable style={s.secondary} onPress={()=>{const n=Math.max(16,fontSize-2);setFontSize(n);saveSettings({quranFontSize:n})}}><Text style={s.body}>تصغير الخط</Text></Pressable><Pressable style={s.secondary} onPress={()=>{const n=Math.min(36,fontSize+2);setFontSize(n);saveSettings({quranFontSize:n})}}><Text style={s.body}>تكبير الخط</Text></Pressable><Pressable style={s.secondary} onPress={()=>{setFontSize(22);saveSettings({quranFontSize:22})}}><Text style={s.body}>افتراضي</Text></Pressable></View>
   <Pressable style={s.checkRow} onPress={()=>setReminders(v=>!v)}><Text style={s.checkbox}>{reminders?"✓":" "}</Text><Text style={s.body}>تفعيل تذكير يومي على الجهاز</Text></Pressable><Text style={s.note}>وقت التذكير (24 ساعة)</Text><TextInput value={reminderTime} onChangeText={setReminderTime} style={s.input} placeholder="20:00" placeholderTextColor={colors.muted}/><Pressable style={s.button} onPress={scheduleReminder}><Text style={s.buttonText}>{reminders?"حفظ وجدولة التذكير":"إيقاف التذكير"}</Text></Pressable>{reminderStatus?<Text style={s.success}>{reminderStatus}</Text>:null}
   <Pressable style={s.checkRow} onPress={()=>{const n=!compact;setCompact(n);saveSettings({compactHome:n})}}><Text style={s.checkbox}>{compact?"✓":" "}</Text><Text style={s.body}>أفضل واجهة مختصرة</Text></Pressable>
   {saved?<Text style={s.success}>تم حفظ تفضيلاتك على الجهاز.</Text>:null}
   <Text style={s.note}>يُطبّق حجم الخط على قارئ القرآن والوضع المختصر على الصفحة الرئيسية. يحتاج التذكير إلى إذن الإشعارات، وقد تقيّد بعض الهواتف عمله في الخلفية.</Text>
  </View>
  <View style={s.card}>
   <Text style={s.heading}>💾 النسخ الاحتياطي والاستعادة</Text>
   <Text style={s.note}>صدّر بيانات التطبيق المحفوظة محليًا واحتفظ بالنسخة في مكان آمن. الاستعادة تكتب مفاتيح النسخة إلى التخزين المحلي وقد تستبدل بيانات أحدث.</Text>
   <Pressable style={s.button} onPress={backup}><Text style={s.buttonText}>تصدير نسخة احتياطية كاملة</Text></Pressable>
   <Pressable style={s.secondary} onPress={()=>setRestoreOpen(v=>!v)}><Text style={s.body}>{restoreOpen?"إغلاق الاستعادة":"استعادة من ملف JSON"}</Text></Pressable>
   {restoreOpen?<><Text style={s.note}>افتح ملف النسخة، وانسخ محتواه كاملًا ثم الصقه هنا.</Text><TextInput value={restoreText} onChangeText={setRestoreText} multiline style={s.restoreInput} placeholder="الصق JSON هنا..." placeholderTextColor={colors.muted}/><Pressable style={s.button} onPress={restore}><Text style={s.buttonText}>التحقق والاستعادة</Text></Pressable></>:null}
  </View>
  <View style={s.card}>
   <Text style={s.heading}>📱 ويدجت الشاشة الرئيسية</Text>
   <Text style={s.body}>أُضيف مكوّن ويدجت أندرويد يعرض الصلاة القادمة ووقتها والوقت المتبقي وذكرًا قصيرًا. لتحديث بياناته افتح صفحة مواقيت الصلاة داخل التطبيق مرة واحدة بعد التثبيت.</Text>
   <Text style={s.note}>لإضافته: اضغط مطولًا على مساحة فارغة في الشاشة الرئيسية، ثم اختر الأدوات (Widgets) وابحث عن نور الإسلام. ظهور الويدجت يعتمد على نجاح البناء وتوافق مشغّل الشاشة.</Text>
  </View>
  <View style={s.card}>
   <Text style={s.heading}>🎙️ البحث الصوتي</Text>
   <Text style={s.body}>البحث النصي أعلاه يعمل دون خدمة خارجية على النصوص المحلية. البحث الصوتي العربي مفعّل عبر خدمة التعرف على الكلام المتاحة على الهاتف، ويتطلب صلاحية الميكروفون وقد يحتاج اتصالًا أو خدمات صوتية من النظام.</Text>
  </View>
 </ScrollView>;
}
const s=StyleSheet.create({
 content:{padding:18,paddingBottom:120,gap:14},title:{color:colors.goldSoft,fontSize:28,fontWeight:"900",textAlign:"right"},
 note:{color:colors.muted,fontSize:12,lineHeight:20,textAlign:"right"},card:{backgroundColor:colors.surface,borderRadius:22,padding:16,borderWidth:1,borderColor:colors.line,gap:10},
 heading:{color:colors.goldSoft,fontSize:20,fontWeight:"800",textAlign:"right"},body:{color:colors.text,textAlign:"right",lineHeight:25},input:{color:colors.text,borderWidth:1,borderColor:colors.line,borderRadius:12,padding:12,textAlign:"right"},
 row:{flexDirection:"row",gap:8,flexWrap:"wrap"},secondary:{borderWidth:1,borderColor:colors.line,borderRadius:12,padding:10,alignItems:"center",justifyContent:"center"},button:{backgroundColor:colors.gold,borderRadius:12,padding:13,alignItems:"center"},buttonText:{color:"#10312c",fontWeight:"800"},
 result:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:colors.line,gap:5},link:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:colors.line,gap:5},linkTitle:{color:colors.goldSoft,fontWeight:"800",textAlign:"right"},
 checkRow:{flexDirection:"row",alignItems:"center",gap:10,paddingVertical:8},checkbox:{width:24,height:24,borderWidth:1,borderColor:colors.gold,borderRadius:6,color:colors.goldSoft,textAlign:"center",textAlignVertical:"center",overflow:"hidden"},
 success:{color:colors.goldSoft,textAlign:"right"},restoreInput:{minHeight:150,borderWidth:1,borderColor:colors.line,borderRadius:12,color:colors.text,padding:12,textAlign:"left",textAlignVertical:"top"}
});