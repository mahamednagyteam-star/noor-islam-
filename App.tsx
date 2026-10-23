import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, I18nManager, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import Reciters from "./screens/Reciters";
import Tasbeeh from "./screens/Tasbeeh";
import Prayer from "./screens/Prayer";
import Features from "./screens/Features";
import DailyTools from "./screens/DailyTools";
import LibrarySettings from "./screens/LibrarySettings";
import { colors } from "./theme";

const quranData = require("./data/quran-uthmani.json") as { id:number; verses:{id:number;text:string}[] }[];
const pageStarts = require("./data/quran-pages.json") as { p:number; s:number; a:number }[];
const hisnData = require("./data/hisn-muslim.json") as Record<string,{text:string[];footnote:string[]}>;
I18nManager.allowRTL(true); I18nManager.forceRTL(true);
type Tab = "home"|"quran"|"reciters"|"adhkar"|"qibla"|"tasbeeh"|"prayer"|"features"|"tools"|"library";
const names = ["الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس","التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"];
const surahs = quranData.map((x,i)=>({number:x.id,name:names[i]??`سورة ${x.id}`,ayahs:x.verses}));
const allVerses = surahs.flatMap(x=>x.ayahs.map(a=>({surahNumber:x.number,surahName:x.name,id:a.id,text:a.text})));
const pageGroups = pageStarts.map((entry,i)=>{
 const start=allVerses.findIndex(v=>v.surahNumber===entry.s&&v.id===entry.a);
 const next=pageStarts[i+1];
 const end=next?allVerses.findIndex(v=>v.surahNumber===next.s&&v.id===next.a):allVerses.length;
 return {page:entry.p,startSurah:entry.s,startAyah:entry.a,verses:allVerses.slice(Math.max(0,start),end<0?allVerses.length:end)};
});
const adhkar = Object.entries(hisnData).map(([title,v])=>({title,items:v.text,notes:v.footnote}));
function Card({children}:{children:React.ReactNode}){return <View style={s.card}>{children}</View>}
function Home({go}:{go:(t:Tab)=>void}){const [compact,setCompact]=useState(false);useEffect(()=>{AsyncStorage.getItem("noor:settings:v1").then(v=>{if(v)setCompact(!!JSON.parse(v).compactHome)}).catch(()=>{});},[]);return <ScrollView contentContainerStyle={s.content}>
  <View style={s.hero}><Text style={s.kicker}>السلام عليكم ورحمة الله وبركاته</Text><Text style={s.logo}>نور الإسلام</Text><Text style={s.hint}>رفيقك اليومي للعبادة والذكر</Text></View>
  {!compact?<Card><Text style={s.cardTitle}>أهلاً بك في نور الإسلام</Text><Text style={s.body}>اجعل لك ورداً يومياً من القرآن والذكر، واستمع إلى التلاوات، واستخدم المسبحة الإلكترونية.</Text></Card>:null}
  <Text style={s.heading}>الوصول السريع</Text><View style={s.grid}>
  {([["quran","القرآن الكريم","📖"],["adhkar","حصن المسلم","🤲"],["reciters","القرّاء","🎧"],["prayer","مواقيت الصلاة","🕌"],["qibla","اتجاه القبلة","🧭"],["tasbeeh","المسبحة","📿"],["features","مزايا إضافية","🌙"],["tools","خطة وعبادات","✅"],["library","المكتبة والإعدادات","📚"]] as [Tab,string,string][]).map(([tab,label,icon])=><Pressable key={tab} onPress={()=>go(tab)} style={s.quick}><Text style={s.icon}>{icon}</Text><Text style={s.quickText}>{label}</Text></Pressable>)}
  </View>{!compact?<Text style={s.small}>ملاحظة: مواقيت الصلاة الدقيقة تحتاج إلى خدمة حساب مخصصة وموقعك. تحقق من توقيت بلدك من مصدر موثوق.</Text>:null}
</ScrollView>}
function Quran(){
 const [page,setPage]=useState(1);
 const [last,setLast]=useState({surah:1,ayah:1,page:1});
 const [bookmarks,setBookmarks]=useState<{surah:number;ayah:number;name:string}[]>([]);
 const [quranFontSize,setQuranFontSize]=useState(25);
 const [selectedAyah,setSelectedAyah]=useState<{surah:number;ayah:number;name:string;text:string}|null>(null);
 const [verseNotes,setVerseNotes]=useState<Record<string,string>>({});
 const [noteText,setNoteText]=useState("");
 const KEY="noor:features:v1";
 useEffect(()=>{
  AsyncStorage.getItem(KEY).then(v=>{if(v){const x=JSON.parse(v);setLast(x.last??{surah:1,ayah:1,page:1});setPage(Math.max(1,Math.min(604,x.last?.page??1)));setBookmarks(x.bookmarks??[]);setVerseNotes(x.verseNotes??{});}}).catch(()=>{});
  AsyncStorage.getItem("noor:settings:v1").then(v=>{if(v){const x=JSON.parse(v);setQuranFontSize(Math.max(18,Math.min(36,x.quranFontSize??25)));}}).catch(()=>{});
 },[]);
 const save=async(patch:Record<string,any>)=>{try{const v=await AsyncStorage.getItem(KEY);await AsyncStorage.setItem(KEY,JSON.stringify({...{last,bookmarks},...(v?JSON.parse(v):{}),...patch}));}catch{}};
 const group=pageGroups[Math.max(0,Math.min(pageGroups.length-1,page-1))]??pageGroups[0];
 const noteKey=(surahNo:number,ayahNo:number)=>`${surahNo}:${ayahNo}`;
 const goToPage=(next:number)=>{
  const target=Math.max(1,Math.min(pageGroups.length,next));setPage(target);setSelectedAyah(null);
  const g=pageGroups[target-1];const first=g?.verses[0];
  if(first){const nextLast={surah:first.surahNumber,ayah:first.id,page:target};setLast(nextLast);save({last:nextLast});}
 };
 const goToSurah=(surahNo:number)=>{
  const index=pageGroups.findIndex(g=>g.verses.some(v=>v.surahNumber===surahNo&&v.id===1));
  goToPage(index>=0?index+1:1);
 };
 const selectVerse=(v:{surahNumber:number;surahName:string;id:number;text:string})=>{
  const selected={surah:v.surahNumber,ayah:v.id,name:v.surahName,text:v.text};setSelectedAyah(selected);
  const nextLast={surah:v.surahNumber,ayah:v.id,page};setLast(nextLast);save({last:nextLast});
 };
 const toggleBookmark=async()=>{
  if(!selectedAyah)return;
  const exists=bookmarks.some(b=>b.surah===selectedAyah.surah&&b.ayah===selectedAyah.ayah);
  const next=exists?bookmarks.filter(b=>!(b.surah===selectedAyah.surah&&b.ayah===selectedAyah.ayah)):[...bookmarks,{surah:selectedAyah.surah,ayah:selectedAyah.ayah,name:selectedAyah.name}];
  setBookmarks(next);await save({bookmarks:next});
 };
 const shareVerse=async()=>{
  if(!selectedAyah)return;
  try{await Share.share({message:`سورة ${selectedAyah.name} · الآية ${selectedAyah.ayah}\n\n${selectedAyah.text}\n\nمن تطبيق نور الإسلام`});}catch{}
 };
 const saveNote=async()=>{
  if(!selectedAyah)return;
  const next={...verseNotes,[noteKey(selectedAyah.surah,selectedAyah.ayah)]:noteText.trim()};
  if(!noteText.trim())delete next[noteKey(selectedAyah.surah,selectedAyah.ayah)];
  setVerseNotes(next);await save({verseNotes:next});setNoteText("");
 };
 const firstVerse=group?.verses[0];
 const surahStart=surahs.find(x=>x.number===firstVerse?.surahNumber);
 return <ScrollView contentContainerStyle={s.content}>
  <Text style={s.pageTitle}>المصحف الشريف</Text>
  <Text style={s.hint}>عرض صفحات المصحف المدني · ٦٠٤ صفحة · الرسم العثماني</Text>
  <View style={[s.card,{alignItems:"center",gap:8}]}>
   <Text style={s.cardTitle}>صفحة {group?.page??1} من 604</Text>
   <Text style={s.small}>تبدأ في سورة {surahStart?.name??"الفاتحة"} · الآية {firstVerse?.id??group?.startAyah??1}</Text>
   <View style={{flexDirection:"row",gap:10,width:"100%"}}>
    <Pressable disabled={page<=1} onPress={()=>goToPage(page-1)} style={[s.button,{flex:1,opacity:page<=1?0.4:1}]}><Text style={s.buttonText}>الصفحة السابقة</Text></Pressable>
    <Pressable onPress={()=>goToPage(last.page||1)} style={[s.button,{flex:1}]}><Text style={s.buttonText}>آخر موضع</Text></Pressable>
    <Pressable disabled={page>=604} onPress={()=>goToPage(page+1)} style={[s.button,{flex:1,opacity:page>=604?0.4:1}]}><Text style={s.buttonText}>التالية</Text></Pressable>
   </View>
  </View>
  <Text style={s.heading}>انتقل إلى سورة</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>{surahs.map(x=><Pressable key={x.number} onPress={()=>goToSurah(x.number)} style={[s.chip,group?.startSurah===x.number&&s.chipOn]}><Text style={s.chipText}>{x.number}. {x.name}</Text></Pressable>)}</ScrollView>
  <View style={[s.card,{paddingHorizontal:20,paddingVertical:24,borderRadius:8,borderColor:colors.gold,borderWidth:1,minHeight:460}]}>
   <View style={{alignItems:"center",borderBottomWidth:1,borderBottomColor:colors.line,paddingBottom:14,marginBottom:18}}>
    <Text style={[s.surahName,{fontSize:25}]}>{surahStart?.name??"الفاتحة"}</Text>
    <Text style={s.small}>الجزء من صفحة المصحف رقم {group?.page??1}</Text>
   </View>
   <Text style={{color:colors.text,textAlign:"justify",writingDirection:"rtl",fontSize:quranFontSize,lineHeight:Math.round(quranFontSize*2.05)}}>
    {group?.verses.map((v,i)=><React.Fragment key={`${v.surahNumber}:${v.id}`}>
      {i>0&&group.verses[i-1].surahNumber!==v.surahNumber?<Text>{'\n\n'}﴿ سورة {v.surahName} ﴾{'\n'}</Text>:null}
      <Text onPress={()=>selectVerse(v)} style={selectedAyah?.surah===v.surahNumber&&selectedAyah?.ayah===v.id?{backgroundColor:colors.line}:undefined}>{v.text} <Text style={{color:colors.gold,fontSize:Math.max(15,quranFontSize-5)}}>۞{v.id} </Text></Text>
    </React.Fragment>)}
   </Text>
  </View>
  {selectedAyah?<Card>
   <Text style={s.cardTitle}>سورة {selectedAyah.name} · الآية {selectedAyah.ayah}</Text>
   <View style={[s.grid,{marginTop:12}]}>
    <Pressable style={s.button} onPress={toggleBookmark}><Text style={s.buttonText}>{bookmarks.some(b=>b.surah===selectedAyah.surah&&b.ayah===selectedAyah.ayah)?"إزالة العلامة":"حفظ علامة مرجعية"}</Text></Pressable>
    <Pressable style={s.button} onPress={shareVerse}><Text style={s.buttonText}>مشاركة الآية</Text></Pressable>
    <Pressable style={s.button} onPress={()=>setNoteText(verseNotes[noteKey(selectedAyah.surah,selectedAyah.ayah)]??"")}><Text style={s.buttonText}>ملاحظة</Text></Pressable>
   </View>
   <TextInput value={noteText} onChangeText={setNoteText} multiline style={s.noteInput} placeholder="ملاحظة شخصية على الآية (اختياري)" placeholderTextColor={colors.muted}/>
   <Pressable style={[s.button,{marginTop:8}]} onPress={saveNote}><Text style={s.buttonText}>حفظ الملاحظة</Text></Pressable>
  </Card>:<Text style={s.small}>اضغط على الآية داخل الصفحة لتحديدها وحفظ موضع القراءة، ثم يمكنك إضافة علامة مرجعية أو ملاحظة أو مشاركة الآية.</Text>}
  <View style={{flexDirection:"row",gap:10}}>
   <Pressable disabled={page<=1} onPress={()=>goToPage(page-1)} style={[s.button,{flex:1,opacity:page<=1?0.4:1}]}><Text style={s.buttonText}>‹ السابقة</Text></Pressable>
   <Pressable disabled={page>=604} onPress={()=>goToPage(page+1)} style={[s.button,{flex:1,opacity:page>=604?0.4:1}]}><Text style={s.buttonText}>التالية ›</Text></Pressable>
  </View>
 </ScrollView>
}
function Adhkar(){const [selected,setSelected]=useState(0);const section=adhkar[selected];return <ScrollView contentContainerStyle={s.content}>
  <Text style={s.pageTitle}>حصن المسلم</Text><Text style={s.hint}>أذكار من الكتاب والسنة</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>{adhkar.map((x,i)=><Pressable key={x.title} onPress={()=>setSelected(i)} style={[s.chip,i===selected&&s.chipOn]}><Text style={s.chipText}>{x.title}</Text></Pressable>)}</ScrollView>
  <Card><Text style={s.cardTitle}>{section.title}</Text>{section.items.map((item,i)=><View key={i} style={s.dhikr}><Text style={s.dhikrText}>{item}</Text>{section.notes[i]?<Text style={s.small}>{section.notes[i]}</Text>:null}</View>)}</Card>
</ScrollView>}
function Qibla(){
 const [coords,setCoords]=useState<{latitude:number;longitude:number}|null>(null);
 const [direction,setDirection]=useState<number|null>(null);
 const [heading,setHeading]=useState<number|null>(null);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  let subscription:Location.LocationSubscription|undefined;
  Location.watchHeadingAsync(h=>setHeading(h.trueHeading>=0?h.trueHeading:h.magHeading)).then(x=>{subscription=x}).catch(()=>{});
  return()=>subscription?.remove();
 },[]);
 const find=async()=>{
  setBusy(true);
  try{
   let found:{latitude:number;longitude:number}|null=null;
   try{
    const permission=await Location.requestForegroundPermissionsAsync();
    if(permission.granted){
     const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
     found={latitude:pos.coords.latitude,longitude:pos.coords.longitude};
    }
   }catch{}
   if(!found){
    const cached=await AsyncStorage.getItem("noor:prayer-cache:v2");
    if(cached){const saved=JSON.parse(cached);if(saved.coords)found=saved.coords;}
   }
   if(!found){Alert.alert("يلزم تحديد الموقع","اسمح بالموقع مرة واحدة، أو افتح صفحة مواقيت الصلاة لحفظ موقعك أولًا.");return;}
   const kLat=21.4225*Math.PI/180,kLon=39.8262*Math.PI/180,pLat=found.latitude*Math.PI/180,pLon=found.longitude*Math.PI/180;
   const y=Math.sin(kLon-pLon),x=Math.cos(pLat)*Math.tan(kLat)-Math.sin(pLat)*Math.cos(kLon-pLon);
   setCoords(found);setDirection((Math.atan2(y,x)*180/Math.PI+360)%360);
  }catch{Alert.alert("تعذر تحديد الاتجاه","حاول مرة أخرى وتأكد من تفعيل خدمات الموقع.");}
  finally{setBusy(false);}
 };
 return <ScrollView contentContainerStyle={s.content}>
  <Text style={s.pageTitle}>اتجاه القبلة</Text>
  <Card><Text style={s.cardTitle}>🧭 بوصلة القبلة</Text>
   <Text style={s.body}>حدد موقعك لحساب اتجاه الكعبة، ثم حرّك الهاتف حتى يتجه السهم إلى اتجاه القبلة. تعتمد الدقة على مستشعرات الهاتف ومعايرة البوصلة.</Text>
   <View style={{alignItems:"center",justifyContent:"center",paddingVertical:24,gap:8}}>
    <Text style={{fontSize:64,color:colors.goldSoft,transform:[{rotate:`${direction===null?0:direction-(heading??0)}deg`}]}}>▲</Text>
    <Text style={{fontSize:27,fontWeight:"900",color:colors.goldSoft}}>{direction===null?"—":Math.round(direction)+"°"}</Text>
    <Text style={s.small}>{heading===null?"قد لا يدعم الهاتف قراءة اتجاه البوصلة.":"حرّك الهاتف ببطء للحصول على اتجاه أدق."}</Text>
   </View>
   <Pressable onPress={find} style={s.button}><Text style={s.buttonText}>{busy?"جارٍ حساب الاتجاه...":"تحديد الموقع وحساب القبلة"}</Text></Pressable>
   {!!coords&&<Text style={s.location}>الإحداثيات: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</Text>}
  </Card>
 </ScrollView>
}
export default function App(){const [tab,setTab]=useState<Tab>("home");const screen=useMemo(()=>({home:<Home go={setTab}/>,quran:<Quran/>,reciters:<Reciters surahs={surahs}/>,adhkar:<Adhkar/>,qibla:<Qibla/>,tasbeeh:<Tasbeeh/>,prayer:<Prayer/>,features:<Features surahs={surahs}/>,tools:<DailyTools surahs={surahs} adhkar={adhkar.map(x=>({title:x.title,items:x.items}))}/>,library:<LibrarySettings surahs={surahs} adhkar={adhkar.map(x=>({title:x.title,items:x.items}))}/>} [tab]),[tab]);const nav:[Tab,string,string][]=[["home","الرئيسية","⌂"],["quran","القرآن","۞"],["prayer","الصلاة","🕌"],["reciters","القرّاء","♫"],["adhkar","الأذكار","🤲"],["features","المزيد","✦"],["tasbeeh","التسبيح","📿"],["tools","الخطة","✓"],["library","المكتبة","📚"]];return <SafeAreaView style={s.safe}><View style={s.app}>{screen}<View style={s.nav}>{nav.map(([key,label,icon])=><Pressable key={key} onPress={()=>setTab(key)} style={s.navItem}><Text style={[s.navIcon,tab===key&&s.active]}>{icon}</Text><Text style={[s.navLabel,tab===key&&s.active]}>{label}</Text></Pressable>)}</View></View></SafeAreaView>}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.bg},app:{flex:1,backgroundColor:colors.bg},content:{padding:18,paddingBottom:110,gap:14},hero:{paddingTop:16,paddingBottom:8},kicker:{color:colors.muted,textAlign:"right",fontSize:13},logo:{color:colors.goldSoft,fontSize:36,fontWeight:"900",textAlign:"right",marginTop:8},hint:{color:colors.muted,textAlign:"right",lineHeight:22},card:{backgroundColor:colors.surface,borderRadius:22,padding:17,borderWidth:1,borderColor:colors.line},cardTitle:{color:colors.goldSoft,fontSize:20,fontWeight:"800",textAlign:"right"},body:{color:colors.text,textAlign:"right",fontSize:15,lineHeight:27,marginTop:10},heading:{color:colors.goldSoft,fontSize:20,fontWeight:"800",textAlign:"right"},grid:{flexDirection:"row",flexWrap:"wrap",gap:10},quick:{width:"48%",backgroundColor:colors.surface,borderRadius:18,padding:18,alignItems:"center",gap:9,borderWidth:1,borderColor:colors.line},icon:{fontSize:28},quickText:{color:colors.text,fontWeight:"700"},small:{color:colors.muted,fontSize:11,lineHeight:18,textAlign:"right",marginTop:8},pageTitle:{color:colors.goldSoft,fontSize:29,fontWeight:"900",textAlign:"right"},chip:{paddingVertical:9,paddingHorizontal:14,borderRadius:20,borderWidth:1,borderColor:colors.line,marginRight:7},chipOn:{backgroundColor:colors.gold},chipText:{color:colors.text,fontSize:12},surahName:{color:colors.goldSoft,fontSize:28,fontWeight:"800",textAlign:"center",marginBottom:8},ayah:{flexDirection:"row",alignItems:"center",gap:9,paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.line},ayahText:{color:colors.text,fontSize:20,lineHeight:37,textAlign:"right",flex:1},ayahNum:{color:colors.gold,borderWidth:1,borderColor:colors.gold,borderRadius:15,width:28,height:28,textAlign:"center",textAlignVertical:"center",overflow:"hidden"},ayahActions:{flexDirection:"row",justifyContent:"flex-end",gap:12,flexWrap:"wrap"},actionText:{color:colors.goldSoft,fontSize:12,paddingVertical:5},noteInput:{minHeight:90,borderWidth:1,borderColor:colors.line,borderRadius:12,color:colors.text,padding:12,textAlign:"right",textAlignVertical:"top"},dhikr:{paddingVertical:13,borderBottomWidth:1,borderBottomColor:colors.line},dhikrText:{color:colors.text,fontSize:18,lineHeight:32,textAlign:"right"},button:{backgroundColor:colors.gold,padding:14,borderRadius:14,alignItems:"center",marginTop:15},buttonText:{color:"#10312c",fontWeight:"800"},location:{color:colors.goldSoft,textAlign:"center",marginTop:12},nav:{position:"absolute",bottom:0,left:0,right:0,height:80,backgroundColor:"#081f22",borderTopWidth:1,borderTopColor:colors.line,flexDirection:"row",justifyContent:"space-around",paddingTop:8},navItem:{alignItems:"center",justifyContent:"center",gap:3,flex:1},navIcon:{color:colors.muted,fontSize:20},navLabel:{color:colors.muted,fontSize:10},active:{color:colors.goldSoft,fontWeight:"900"}
});
