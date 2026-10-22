import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Audio } from "expo-av";
import { colors } from "../theme";

const KEY = "noor:features:v1";
const duaGroups: Record<string,string[]> = {
  "أدعية عامة": ["رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ","رَبِّ زِدْنِي عِلْمًا","اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي وَاهْدِنِي وَعَافِنِي وَارْزُقْنِي"],
  "الصباح والمساء": ["أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ","اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ"],
  "قبل النوم": ["بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا","اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ"],
  "عند الكرب": ["لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ","حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ"]
};
const morning = ["أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ","اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ","سُبْحَانَ اللَّهِ وَبِحَمْدِهِ"];
const evening = ["أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ","اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ","أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ"];
type Props = { surahs: {number:number;name:string;ayahs:{id:number;text:string}[]}[] };
const ar = (n:number) => String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[Number(d)]);
export default function Features({surahs}:Props) {
 const [mode,setMode]=useState<"morning"|"evening">("morning");
 const [duaGroup,setDuaGroup]=useState("أدعية عامة");
 const [bookmarks,setBookmarks]=useState<{surah:number;ayah:number;name:string}[]>([]);
 const [last,setLast]=useState({surah:1,ayah:1});
 const [dark,setDark]=useState(true);
 const [downloads,setDownloads]=useState<string[]>([]);
 const [loading,setLoading]=useState(false);
 const [reciter,setReciter]=useState("Alafasy_128kbps");
 const [surahNum,setSurahNum]=useState("1");
 const [ayahNum,setAyahNum]=useState("1");
 const [preview,setPreview]=useState<string|null>(null);
 useEffect(()=>{AsyncStorage.getItem(KEY).then(v=>{if(v){const x=JSON.parse(v);setBookmarks(x.bookmarks??[]);setLast(x.last??{surah:1,ayah:1});setDark(x.dark??true);setDownloads(x.downloads??[]);}}).catch(()=>{});},[]);
 const persist=(patch:Record<string,any>)=>AsyncStorage.getItem(KEY).then(v=>AsyncStorage.setItem(KEY,JSON.stringify({...{bookmarks,last,dark,downloads},...(v?JSON.parse(v):{}),...patch}))).catch(()=>{});
 const mark=(sn:number,an:number)=>{const surah=surahs.find(s=>s.number===sn);const exists=bookmarks.some(b=>b.surah===sn&&b.ayah===an);const next=exists?bookmarks.filter(b=>!(b.surah===sn&&b.ayah===an)):[...bookmarks,{surah:sn,ayah:an,name:surah?.name??"سورة"}];setBookmarks(next);persist({bookmarks:next});};
 const saveLast=()=>{const next={surah:Math.max(1,Math.min(114,Number(surahNum)||1)),ayah:Math.max(1,Number(ayahNum)||1)};setLast(next);persist({last:next});Alert.alert("تم الحفظ","تم حفظ موضع القراءة على هذا الجهاز.");};
 const download=async()=>{const sn=Math.max(1,Math.min(114,Number(surahNum)||1));const an=Math.max(1,Number(ayahNum)||1);setLoading(true);try{const dir=(FileSystem.documentDirectory??"")+"noor-audio/";await FileSystem.makeDirectoryAsync(dir,{intermediates:true}).catch(()=>{});const name=`${reciter}-${String(sn).padStart(3,"0")}-${String(an).padStart(3,"0")}.mp3`;const path=dir+name;const url=`https://everyayah.com/data/${reciter}/${String(sn).padStart(3,"0")}${String(an).padStart(3,"0")}.mp3`;await FileSystem.downloadAsync(url,path);const next=[...new Set([...downloads,path])];setDownloads(next);persist({downloads:next});Alert.alert("اكتمل التنزيل","تم حفظ مقطع الآية على جهازك للاستماع دون إنترنت.");}catch{Alert.alert("تعذر التنزيل","تحقق من الإنترنت ورقم السورة والآية ثم حاول مجددًا.");}finally{setLoading(false);}};
 const previewSound=React.useRef<Audio.Sound|null>(null); const playDownloaded=async(uri:string)=>{try{await previewSound.current?.unloadAsync();previewSound.current=null;await Audio.setAudioModeAsync({playsInSilentModeIOS:true,staysActiveInBackground:true,shouldDuckAndroid:true});const result=await Audio.Sound.createAsync({uri},{shouldPlay:true});previewSound.current=result.sound;setPreview(uri);result.sound.setOnPlaybackStatusUpdate(st=>{if(st.isLoaded&&st.didJustFinish){result.sound.unloadAsync();previewSound.current=null;setPreview(null);}});}catch{Alert.alert("تعذر التشغيل","لم نتمكن من تشغيل الملف المحفوظ.");}};
 const selectedSurah=surahs.find(s=>s.number===last.surah);
 return <ScrollView contentContainerStyle={s.content}>
  <Text style={s.title}>مزايا إضافية</Text>
  <View style={s.card}><Text style={s.heading}>📖 متابعة ختم القرآن</Text><Text style={s.body}>آخر موضع محفوظ: سورة {selectedSurah?.name??"الفاتحة"}، الآية {ar(last.ayah)}</Text>
   <View style={s.row}><TextInput value={surahNum} onChangeText={setSurahNum} keyboardType="number-pad" placeholder="رقم السورة" placeholderTextColor={colors.muted} style={s.input}/><TextInput value={ayahNum} onChangeText={setAyahNum} keyboardType="number-pad" placeholder="رقم الآية" placeholderTextColor={colors.muted} style={s.input}/></View>
   <Pressable style={s.button} onPress={saveLast}><Text style={s.buttonText}>حفظ موضع القراءة</Text></Pressable>
   <Pressable style={s.button} onPress={()=>mark(Math.max(1,Math.min(114,Number(surahNum)||1)),Math.max(1,Number(ayahNum)||1))}><Text style={s.buttonText}>إضافة الآية المحددة إلى العلامات المرجعية</Text></Pressable>
   <Text style={s.body}>العلامات المرجعية ({ar(bookmarks.length)})</Text>{bookmarks.map(b=><View key={b.surah+"-"+b.ayah} style={s.bookmark}><Text style={s.body}>سورة {b.name} · الآية {ar(b.ayah)}</Text><Pressable onPress={()=>mark(b.surah,b.ayah)}><Text style={s.link}>إزالة</Text></Pressable></View>)}
   {surahs.map(su=><View key={su.number} style={s.bookmark}><Text style={s.body}>سورة {su.name}</Text><Pressable onPress={()=>mark(su.number,1)}><Text style={s.link}>{bookmarks.some(b=>b.surah===su.number&&b.ayah===1)?"★ محفوظة":"☆ أضف علامة"}</Text></Pressable></View>)}
  </View>
  <View style={s.card}><Text style={s.heading}>🌅 أذكار الصباح والمساء</Text><View style={s.row}><Pressable style={[s.chip,mode==="morning"&&s.on]} onPress={()=>setMode("morning")}><Text style={s.body}>الصباح</Text></Pressable><Pressable style={[s.chip,mode==="evening"&&s.on]} onPress={()=>setMode("evening")}><Text style={s.body}>المساء</Text></Pressable></View>{(mode==="morning"?morning:evening).map((x,i)=><Text key={i} style={s.dhikr}>{x}</Text>)}</View>
  <View style={s.card}><Text style={s.heading}>📝 أدعية متنوعة</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{Object.keys(duaGroups).map(g=><Pressable key={g} style={[s.chip,duaGroup===g&&s.on]} onPress={()=>setDuaGroup(g)}><Text style={s.body}>{g}</Text></Pressable>)}</ScrollView>{duaGroups[duaGroup].map((x,i)=><Text key={i} style={s.dhikr}>{x}</Text>)}</View>
  <View style={s.card}><Text style={s.heading}>🌙 الوضع الليلي</Text><View style={s.bookmark}><Text style={s.body}>المظهر الداكن مفعّل افتراضيًا في التطبيق</Text><Switch value={dark} onValueChange={v=>{setDark(v);persist({dark:v});}} trackColor={{true:colors.gold}}/></View><Text style={s.note}>يُحفظ اختيارك على الجهاز. ألوان التطبيق الحالية مصممة للوضع الداكن؛ التبديل إلى مظهر فاتح بالكامل يحتاج تحديثًا منفصلًا لتصميم كل شاشة.</Text></View>
  <View style={s.card}><Text style={s.heading}>📥 تنزيل مقطع تلاوة للاستماع دون إنترنت</Text><Text style={s.note}>يحفظ هذا الخيار ملف الآية المحددة محليًا، وليس السورة كاملة.</Text><View style={s.row}><TextInput value={surahNum} onChangeText={setSurahNum} keyboardType="number-pad" placeholder="السورة 1-114" placeholderTextColor={colors.muted} style={s.input}/><TextInput value={ayahNum} onChangeText={setAyahNum} keyboardType="number-pad" placeholder="رقم الآية" placeholderTextColor={colors.muted} style={s.input}/></View><TextInput value={reciter} onChangeText={setReciter} placeholder="اسم مجلد القارئ" placeholderTextColor={colors.muted} style={s.inputWide}/><Pressable style={s.button} onPress={download} disabled={loading}><Text style={s.buttonText}>{loading?"جارٍ التنزيل...":"تنزيل الآية"}</Text></Pressable><Text style={s.body}>المقاطع المحفوظة: {ar(downloads.length)}</Text>{downloads.map(uri=><View key={uri} style={s.bookmark}><Text style={s.file} numberOfLines={1}>{uri.split("/").pop()}</Text><Pressable onPress={()=>playDownloaded(uri)}><Text style={s.link}>{preview===uri?"جارٍ التشغيل":"▶ تشغيل"}</Text></Pressable></View>)}</View>
 </ScrollView>;
}
const s=StyleSheet.create({content:{padding:18,paddingBottom:120,gap:14},title:{color:colors.goldSoft,fontSize:28,fontWeight:"900",textAlign:"right"},card:{backgroundColor:colors.surface,borderRadius:22,padding:16,borderWidth:1,borderColor:colors.line,gap:10},heading:{color:colors.goldSoft,fontSize:20,fontWeight:"800",textAlign:"right"},body:{color:colors.text,textAlign:"right",lineHeight:24},dhikr:{color:colors.text,fontSize:18,lineHeight:32,textAlign:"right",paddingVertical:8,borderBottomWidth:1,borderBottomColor:colors.line},note:{color:colors.muted,fontSize:12,lineHeight:19,textAlign:"right"},row:{flexDirection:"row",gap:8,alignItems:"center"},input:{flex:1,minWidth:90,color:colors.text,borderWidth:1,borderColor:colors.line,borderRadius:12,padding:10,textAlign:"right"},inputWide:{color:colors.text,borderWidth:1,borderColor:colors.line,borderRadius:12,padding:10,textAlign:"right"},button:{backgroundColor:colors.gold,borderRadius:12,padding:12,alignItems:"center"},buttonText:{color:"#10312c",fontWeight:"800"},bookmark:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8,borderBottomWidth:1,borderBottomColor:colors.line,paddingVertical:8},link:{color:colors.gold,fontWeight:"700"},file:{color:colors.muted,flex:1,fontSize:12},chip:{borderWidth:1,borderColor:colors.line,borderRadius:16,padding:8},on:{backgroundColor:colors.surface2,borderColor:colors.gold}});
