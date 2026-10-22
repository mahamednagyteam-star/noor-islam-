import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";
import { colors } from "../theme";

Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowAlert:true,shouldPlaySound:true,shouldSetBadge:false})});
type Timings=Record<string,string>;
type Coords={latitude:number;longitude:number};
const names:Record<string,string>={Fajr:"الفجر",Dhuhr:"الظهر",Asr:"العصر",Maghrib:"المغرب",Isha:"العشاء"};
const CACHE_KEY="noor:prayer-cache:v2";
const ar=(n:number)=>String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[Number(d)]);
function bearing(lat:number,lon:number){const kLat=21.4225*Math.PI/180,kLon=39.8262*Math.PI/180,pLat=lat*Math.PI/180,pLon=lon*Math.PI/180;const y=Math.sin(kLon-pLon);const x=Math.cos(pLat)*Math.tan(kLat)-Math.sin(pLat)*Math.cos(kLon-pLon);return (Math.atan2(y,x)*180/Math.PI+360)%360;}
function clock(d:Date){return d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false});}
function getTimes(coords:Coords,date:Date){const params=CalculationMethod.Egyptian();const times=new PrayerTimes(new Coordinates(coords.latitude,coords.longitude),date,params);return {Fajr:times.fajr,Dhuhr:times.dhuhr,Asr:times.asr,Maghrib:times.maghrib,Isha:times.isha};}
function hijriDate(date:Date){try{return new Intl.DateTimeFormat("ar-EG-u-ca-islamic-umalqura",{day:"numeric",month:"long",year:"numeric"}).format(date)+" هـ";}catch{return "قد لا يتوفر التاريخ الهجري على هذا الجهاز";}}
export default function Prayer(){
 const [timings,setTimings]=useState<Timings|null>(null),[date,setDate]=useState(""),[hijri,setHijri]=useState(""),[city,setCity]=useState("الموقع الحالي"),[coords,setCoords]=useState<Coords|null>(null),[direction,setDirection]=useState<number|null>(null),[heading,setHeading]=useState<number|null>(null),[busy,setBusy]=useState(false),[alerts,setAlerts]=useState(false);
 const load=async()=>{
  setBusy(true);
  try{
   let found:Coords|null=null;let foundCity="الموقع الحالي";
   try{
    const p=await Location.requestForegroundPermissionsAsync();
    if(p.granted){const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});found={latitude:pos.coords.latitude,longitude:pos.coords.longitude};}
   }catch{}
   const cached=await AsyncStorage.getItem(CACHE_KEY);
   if(!found&&cached){const saved=JSON.parse(cached);if(saved.coords)found=saved.coords;if(saved.city)foundCity=saved.city;}
   if(!found){Alert.alert("يلزم تحديد الموقع مرة واحدة","فعّل الموقع مرة واحدة لحفظ إحداثياتك. بعد ذلك يمكن حساب المواقيت دون إنترنت.");return;}
   try{const rev=await Location.reverseGeocodeAsync(found);if(rev[0])foundCity=[rev[0].city,rev[0].region].filter(Boolean).join("، ")||foundCity;}catch{}
   setCoords(found);setCity(foundCity);setDirection(bearing(found.latitude,found.longitude));
   const now=new Date(), local=getTimes(found,now);
   const formatted:Timings={};Object.entries(local).forEach(([k,v])=>formatted[k]=clock(v));
   setTimings(formatted);setDate(now.toLocaleDateString("en-GB"));setHijri(hijriDate(now));
   await AsyncStorage.setItem(CACHE_KEY,JSON.stringify({coords:found,city:foundCity,lastUpdated:now.toISOString()}));
  }catch{Alert.alert("تعذر حساب المواقيت","تأكد من تفعيل الموقع، ثم أعد المحاولة. حساب المواقيت نفسه يعمل دون إنترنت.");}
  finally{setBusy(false);}
 };
 useEffect(()=>{load();let subscription:Location.LocationSubscription|undefined;Location.watchHeadingAsync(h=>setHeading(h.trueHeading>=0?h.trueHeading:h.magHeading)).then(x=>{subscription=x}).catch(()=>{});if(Platform.OS==="android"){Notifications.setNotificationChannelAsync("adhan",{name:"أذان الصلاة",importance:Notifications.AndroidImportance.MAX,sound:"adhan.mp3",vibrationPattern:[0,250,250,250],lightColor:"#D4AF37"}).catch(()=>{});Notifications.setNotificationChannelAsync("fajr-adhan",{name:"أذان الفجر",importance:Notifications.AndroidImportance.MAX,sound:"fajr.mp3",vibrationPattern:[0,250,250,250],lightColor:"#D4AF37"}).catch(()=>{});}return()=>subscription?.remove();},[]);
 const schedule=async()=>{
  try{
   const permission=await Notifications.requestPermissionsAsync();
   if(!permission.granted){Alert.alert("التنبيهات غير مفعلة","اسمح للتطبيق بإرسال التنبيهات من إعدادات الجهاز.");return;}
   let useCoords=coords;
   if(!useCoords){const raw=await AsyncStorage.getItem(CACHE_KEY);if(raw)useCoords=JSON.parse(raw).coords??null;}
   if(!useCoords){Alert.alert("الموقع غير محفوظ","حدد موقعك أولًا ثم اضغط تفعيل الأذان.");return;}
   if(Platform.OS==="android"){
    await Notifications.setNotificationChannelAsync("adhan",{name:"أذان الصلاة",importance:Notifications.AndroidImportance.MAX,sound:"adhan.mp3",vibrationPattern:[0,250,250,250],lightColor:"#D4AF37"});
    await Notifications.setNotificationChannelAsync("fajr-adhan",{name:"أذان الفجر",importance:Notifications.AndroidImportance.MAX,sound:"fajr.mp3",vibrationPattern:[0,250,250,250],lightColor:"#D4AF37"});
   }
   await Notifications.cancelAllScheduledNotificationsAsync();
   const now=new Date();let count=0;
   for(let offset=0;offset<7;offset++){
    const day=new Date(now);day.setHours(0,0,0,0);day.setDate(day.getDate()+offset);
    const daily=getTimes(useCoords,day);
    for(const [key,label] of Object.entries(names)){
     const at=daily[key as keyof typeof daily];if(at<=now)continue;
     const fajr=key==="Fajr",sound=fajr?"fajr.mp3":"adhan.mp3",channelId=fajr?"fajr-adhan":"adhan";
     await Notifications.scheduleNotificationAsync({content:{title:fajr?"حان وقت صلاة الفجر":"حان وقت الصلاة",body:`حان الآن موعد صلاة ${label}`,sound,priority:Notifications.AndroidNotificationPriority.MAX},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:at,channelId}});
     count++;
    }
   }
   setAlerts(true);Alert.alert("تم تفعيل الأذان","تمت جدولة ${count} تنبيهًا محليًا للأيام السبعة القادمة. تعمل المواقيت والتنبيهات دون إنترنت بعد حفظ الموقع، ما دامت إعدادات الجهاز تسمح بالتنبيهات.");
  }catch(e){Alert.alert("تعذر جدولة الأذان","تحقق من إذن التنبيهات وإعدادات البطارية، ثم حاول مجددًا.");}
 };
 return <ScrollView contentContainerStyle={s.content}><Text style={s.title}>مواقيت الصلاة والقبلة</Text><Text style={s.subtitle}>{city}</Text>
  <Pressable style={s.button} onPress={load} disabled={busy}><Text style={s.buttonText}>{busy?"جارٍ حساب المواقيت...":"تحديث الموقع والمواقيت دون إنترنت"}</Text></Pressable>
  <View style={s.card}><Text style={s.heading}>🕌 مواقيت الصلاة</Text><Text style={s.muted}>التاريخ الميلادي: {date||"—"}</Text>{timings?Object.entries(names).map(([key,label])=><View key={key} style={s.row}><Text style={s.time}>{timings[key]??"—"}</Text><Text style={s.prayer}>{label}</Text></View>):<Text style={s.muted}>اسمح بالموقع لحساب المواقيت محليًا دون الحاجة إلى الإنترنت.</Text>}</View>
  <View style={s.card}><Text style={s.heading}>🧭 بوصلة القبلة</Text><View style={s.compass}><Text style={[s.needle,{transform:[{rotate:`${direction===null?0:direction-(heading??0)}deg`}]}]}>▲</Text><Text style={s.degrees}>{direction===null?"—":ar(Math.round(direction))+"°"}</Text><Text style={s.muted}>{heading===null?"اتجاه القبلة محسوب من موقعك":"حرّك الهاتف حتى يشير السهم إلى اتجاه القبلة"}</Text></View><Text style={s.muted}>قد تتأثر دقة الاتجاه بدقة الموقع ومستشعرات الهاتف.</Text>{coords&&<Text style={s.muted}>الإحداثيات: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</Text>}</View>
  <View style={s.card}><Text style={s.heading}>📅 التقويم الهجري</Text><Text style={s.hijri}>{hijri||hijriDate(new Date())}</Text><Text style={s.muted}>يُحسب التاريخ على الجهاز وقد يختلف يومًا حسب الرؤية المحلية للهلال.</Text></View>
  <View style={s.card}><Text style={s.heading}>🔔 الأذان والتنبيهات دون إنترنت</Text><Text style={s.muted}>يضم التطبيق ملفي أذان محفوظين داخله: أذان الفجر وبقية الصلوات. فعّل التنبيهات ليجدولها للأيام السبعة القادمة؛ جدّد الجدولة دوريًا، لأن نظام الهاتف قد يقيّد التنبيهات عند توفير الطاقة.</Text><Pressable style={s.button} onPress={schedule}><Text style={s.buttonText}>{alerts?"إعادة جدولة الأذان":"تفعيل الأذان والتنبيهات"}</Text></Pressable></View>
 </ScrollView>;
}
const s=StyleSheet.create({content:{padding:18,paddingBottom:120,gap:14},title:{color:colors.goldSoft,fontSize:27,fontWeight:"900",textAlign:"right"},subtitle:{color:colors.muted,textAlign:"right"},card:{backgroundColor:colors.surface,borderRadius:22,padding:17,borderWidth:1,borderColor:colors.line,gap:10},heading:{color:colors.goldSoft,fontSize:20,fontWeight:"800",textAlign:"right"},muted:{color:colors.muted,fontSize:12,lineHeight:20,textAlign:"right"},row:{flexDirection:"row",justifyContent:"space-between",paddingVertical:10,borderBottomWidth:1,borderBottomColor:colors.line},prayer:{color:colors.text,fontSize:17,fontWeight:"700"},time:{color:colors.goldSoft,fontSize:18,fontWeight:"800"},button:{backgroundColor:colors.gold,borderRadius:12,padding:13,alignItems:"center"},buttonText:{color:"#10312c",fontWeight:"800"},compass:{height:155,alignItems:"center",justifyContent:"center",gap:5},needle:{color:colors.gold,fontSize:48},degrees:{color:colors.text,fontSize:24,fontWeight:"800"},hijri:{color:colors.goldSoft,fontSize:22,fontWeight:"800",textAlign:"center"}});
