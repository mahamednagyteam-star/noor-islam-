import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, I18nManager, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import Reciters from "./screens/Reciters";
import Tasbeeh from "./screens/Tasbeeh";
import Prayer from "./screens/Prayer";
import Features from "./screens/Features";
import { colors } from "./theme";

const quranData = require("./data/quran-uthmani.json") as { id:number; verses:{id:number;text:string}[] }[];
const hisnData = require("./data/hisn-muslim.json") as Record<string,{text:string[];footnote:string[]}>;
I18nManager.allowRTL(true); I18nManager.forceRTL(true);
type Tab = "home"|"quran"|"reciters"|"adhkar"|"qibla"|"tasbeeh"|"prayer"|"features";
const names = ["الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس","التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"];
const surahs = quranData.map((x,i)=>({number:x.id,name:names[i]??`سورة ${x.id}`,ayahs:x.verses}));
const adhkar = Object.entries(hisnData).map(([title,v])=>({title,items:v.text,notes:v.footnote}));
function Card({children}:{children:React.ReactNode}){return <View style={s.card}>{children}</View>}
function Home({go}:{go:(t:Tab)=>void}){return <ScrollView contentContainerStyle={s.content}>
  <View style={s.hero}><Text style={s.kicker}>السلام عليكم ورحمة الله وبركاته</Text><Text style={s.logo}>نور الإسلام</Text><Text style={s.hint}>رفيقك اليومي للعبادة والذكر</Text></View>
  <Card><Text style={s.cardTitle}>أهلاً بك في نور الإسلام</Text><Text style={s.body}>اجعل لك ورداً يومياً من القرآن والذكر، واستمع إلى التلاوات، واستخدم المسبحة الإلكترونية.</Text></Card>
  <Text style={s.heading}>الوصول السريع</Text><View style={s.grid}>
  {([["quran","القرآن الكريم","📖"],["adhkar","حصن المسلم","🤲"],["reciters","القرّاء","🎧"],["prayer","مواقيت الصلاة","🕌"],["qibla","اتجاه القبلة","🧭"],["tasbeeh","المسبحة","📿"],["features","مزايا إضافية","🌙"]] as [Tab,string,string][]).map(([tab,label,icon])=><Pressable key={tab} onPress={()=>go(tab)} style={s.quick}><Text style={s.icon}>{icon}</Text><Text style={s.quickText}>{label}</Text></Pressable>)}
  </View><Text style={s.small}>ملاحظة: مواقيت الصلاة الدقيقة تحتاج إلى خدمة حساب مخصصة وموقعك. تحقق من توقيت بلدك من مصدر موثوق.</Text>
</ScrollView>}
function Quran(){
 const [selected,setSelected]=useState(0),[last,setLast]=useState({surah:1,ayah:1}),[bookmarks,setBookmarks]=useState<{surah:number;ayah:number;name:string}[]>([]);
 const KEY="noor:features:v1";
 useEffect(()=>{AsyncStorage.getItem(KEY).then(v=>{if(v){const x=JSON.parse(v);setLast(x.last??{surah:1,ayah:1});setBookmarks(x.bookmarks??[]);}}).catch(()=>{});},[]);
 const save=async(patch:Record<string,any>)=>{try{const v=await AsyncStorage.getItem(KEY);await AsyncStorage.setItem(KEY,JSON.stringify({...{last,bookmarks},...(v?JSON.parse(v):{}),...patch}));}catch{}};
 const surah=surahs[selected];
 const mark=async(ayah:number)=>{const exists=bookmarks.some(b=>b.surah===surah.number&&b.ayah===ayah);const next=exists?bookmarks.filter(b=>!(b.surah===surah.number&&b.ayah===ayah)):[...bookmarks,{surah:surah.number,ayah,name:surah.name}];setBookmarks(next);await save({bookmarks:next});};
 const progress=async(ayah:number)=>{const next={surah:surah.number,ayah};setLast(next);await save({last:next});};
 return <ScrollView contentContainerStyle={s.content}>
  <Text style={s.pageTitle}>القرآن الكريم</Text><Text style={s.hint}>المصحف بالرسم العثماني · {surahs.length} سورة</Text>
  <Text style={s.small}>آخر موضع محفوظ: سورة {surahs[last.surah-1]?.name??"الفاتحة"} · الآية {last.ayah}</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>{surahs.map((x,i)=><Pressable key={x.number} onPress={()=>setSelected(i)} style={[s.chip,i===selected&&s.chipOn]}><Text style={s.chipText}>{x.number}. {x.name}</Text></Pressable>)}</ScrollView>
  <Card><Text style={s.surahName}>{surah.name}</Text><Text style={s.small}>عدد الآيات: {surah.ayahs.length}</Text>{surah.ayahs.map(a=><View key={a.id} style={s.ayah}><Pressable onPress={()=>mark(a.id)} style={{padding:6}}><Text style={{color:colors.gold,fontSize:18}}>{bookmarks.some(b=>b.surah===surah.number&&b.ayah===a.id)?"★":"☆"}</Text></Pressable><Pressable onPress={()=>progress(a.id)} style={{flex:1}}><Text style={s.ayahText}>{a.text}</Text><Text style={s.ayahNum}>{a.id}</Text></Pressable></View>)}</Card>
  <Text style={s.small}>اضغط على الآية لحفظ موضع القراءة، أو على النجمة لإضافة علامة مرجعية. راجع data/SOURCES.md للمصادر والنسبة.</Text>
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
export default function App(){const [tab,setTab]=useState<Tab>("home");const screen=useMemo(()=>({home:<Home go={setTab}/>,quran:<Quran/>,reciters:<Reciters surahs={surahs}/>,adhkar:<Adhkar/>,qibla:<Qibla/>,tasbeeh:<Tasbeeh/>,prayer:<Prayer/>,features:<Features surahs={surahs}/>}[tab]),[tab]);const nav:[Tab,string,string][]=[["home","الرئيسية","⌂"],["quran","القرآن","۞"],["prayer","الصلاة","🕌"],["reciters","القرّاء","♫"],["adhkar","الأذكار","🤲"],["features","المزيد","✦"],["tasbeeh","التسبيح","📿"]];return <SafeAreaView style={s.safe}><View style={s.app}>{screen}<View style={s.nav}>{nav.map(([key,label,icon])=><Pressable key={key} onPress={()=>setTab(key)} style={s.navItem}><Text style={[s.navIcon,tab===key&&s.active]}>{icon}</Text><Text style={[s.navLabel,tab===key&&s.active]}>{label}</Text></Pressable>)}</View></View></SafeAreaView>}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.bg},app:{flex:1,backgroundColor:colors.bg},content:{padding:18,paddingBottom:110,gap:14},hero:{paddingTop:16,paddingBottom:8},kicker:{color:colors.muted,textAlign:"right",fontSize:13},logo:{color:colors.goldSoft,fontSize:36,fontWeight:"900",textAlign:"right",marginTop:8},hint:{color:colors.muted,textAlign:"right",lineHeight:22},card:{backgroundColor:colors.surface,borderRadius:22,padding:17,borderWidth:1,borderColor:colors.line},cardTitle:{color:colors.goldSoft,fontSize:20,fontWeight:"800",textAlign:"right"},body:{color:colors.text,textAlign:"right",fontSize:15,lineHeight:27,marginTop:10},heading:{color:colors.goldSoft,fontSize:20,fontWeight:"800",textAlign:"right"},grid:{flexDirection:"row",flexWrap:"wrap",gap:10},quick:{width:"48%",backgroundColor:colors.surface,borderRadius:18,padding:18,alignItems:"center",gap:9,borderWidth:1,borderColor:colors.line},icon:{fontSize:28},quickText:{color:colors.text,fontWeight:"700"},small:{color:colors.muted,fontSize:11,lineHeight:18,textAlign:"right",marginTop:8},pageTitle:{color:colors.goldSoft,fontSize:29,fontWeight:"900",textAlign:"right"},chip:{paddingVertical:9,paddingHorizontal:14,borderRadius:20,borderWidth:1,borderColor:colors.line,marginRight:7},chipOn:{backgroundColor:colors.gold},chipText:{color:colors.text,fontSize:12},surahName:{color:colors.goldSoft,fontSize:28,fontWeight:"800",textAlign:"center",marginBottom:8},ayah:{flexDirection:"row",alignItems:"center",gap:9,paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.line},ayahText:{color:colors.text,fontSize:20,lineHeight:37,textAlign:"right",flex:1},ayahNum:{color:colors.gold,borderWidth:1,borderColor:colors.gold,borderRadius:15,width:28,height:28,textAlign:"center",textAlignVertical:"center",overflow:"hidden"},dhikr:{paddingVertical:13,borderBottomWidth:1,borderBottomColor:colors.line},dhikrText:{color:colors.text,fontSize:18,lineHeight:32,textAlign:"right"},button:{backgroundColor:colors.gold,padding:14,borderRadius:14,alignItems:"center",marginTop:15},buttonText:{color:"#10312c",fontWeight:"800"},location:{color:colors.goldSoft,textAlign:"center",marginTop:12},nav:{position:"absolute",bottom:0,left:0,right:0,height:80,backgroundColor:"#081f22",borderTopWidth:1,borderTopColor:colors.line,flexDirection:"row",justifyContent:"space-around",paddingTop:8},navItem:{alignItems:"center",justifyContent:"center",gap:3,flex:1},navIcon:{color:colors.muted,fontSize:20},navLabel:{color:colors.muted,fontSize:10},active:{color:colors.goldSoft,fontWeight:"900"}
});
