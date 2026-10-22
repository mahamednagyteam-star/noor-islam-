import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Audio } from "expo-av";
import { colors } from "../theme";
import { reciters } from "../data/reciters";

type Surah = { number: number; name: string; ayahs: { id: number; text: string }[] };

export default function Reciters({ surahs }: { surahs: Surah[] }) {
  const [ri, setRi] = useState(0), [si, setSi] = useState(0), [playing, setPlaying] = useState(false), [error, setError] = useState("");
  const sound = useRef<Audio.Sound | null>(null);
  const stop = async () => { try { await sound.current?.unloadAsync(); } catch {} sound.current = null; setPlaying(false); };
  const play = async () => {
    await stop(); setError("");
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true, shouldDuckAndroid: true });
      const r = reciters[ri], surah = surahs[si];
      const url = `https://everyayah.com/data/${r.folder}/${String(surah.number).padStart(3, "0")}${String(surah.ayahs[0]?.id ?? 1).padStart(3, "0")}.mp3`;
      const result = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      sound.current = result.sound; setPlaying(true);
      result.sound.setOnPlaybackStatusUpdate(status => { if (status.isLoaded && status.didJustFinish) stop(); });
    } catch { setError("تعذّر تشغيل التلاوة. تأكد من الاتصال بالإنترنت."); }
  };
  useEffect(() => () => { sound.current?.unloadAsync(); }, []);
  const r = reciters[ri], surah = surahs[si];
  return <ScrollView contentContainerStyle={s.content}>
    <Text style={s.title}>القرّاء والتلاوات</Text><Text style={s.hint}>اختر القارئ والسورة للاستماع إلى الآية الأولى</Text>
    <View style={s.card}><View style={[s.avatar,{backgroundColor:r.color+"33",borderColor:r.color}]}><Text style={[s.initials,{color:r.color}]}>{r.initials}</Text></View>
      <Text style={s.name}>{r.name}</Text><Text style={s.hint}>سورة {surah.name}</Text>
      <Pressable style={s.button} onPress={playing ? stop : play}><Text style={s.buttonText}>{playing ? "إيقاف التلاوة" : "▶ تشغيل التلاوة"}</Text></Pressable>
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
    <Text style={s.section}>اختر القارئ</Text><View style={s.grid}>{reciters.map((x,i)=><Pressable key={x.folder} onPress={()=>{setRi(i);stop();}} style={[s.reciter,ri===i&&s.selected]}><View style={[s.smallAvatar,{backgroundColor:x.color+"33"}]}><Text style={{color:x.color,fontWeight:"800"}}>{x.initials}</Text></View><Text style={s.reciterName}>{x.name}</Text></Pressable>)}</View>
    <Text style={s.section}>اختر السورة</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{surahs.map((x,i)=><Pressable key={x.number} onPress={()=>{setSi(i);stop();}} style={[s.chip,si===i&&s.selected]}><Text style={s.hint}>{x.number}. {x.name}</Text></Pressable>)}</ScrollView>
    <Text style={s.note}>الصوت من EveryAyah ويتطلب اتصالاً بالإنترنت. حقوق التسجيلات محفوظة لأصحابها.</Text>
  </ScrollView>;
}
const s=StyleSheet.create({
 content:{padding:18,paddingBottom:120,gap:14},title:{color:colors.goldSoft,fontSize:28,fontWeight:"800",textAlign:"right"},hint:{color:colors.muted,textAlign:"right"},card:{backgroundColor:colors.surface,borderRadius:24,borderWidth:1,borderColor:colors.line,padding:20,alignItems:"center",gap:10},
 avatar:{width:86,height:86,borderRadius:43,borderWidth:3,alignItems:"center",justifyContent:"center"},initials:{fontSize:28,fontWeight:"800"},name:{color:colors.goldSoft,fontSize:21,fontWeight:"800"},button:{backgroundColor:colors.gold,borderRadius:14,paddingVertical:13,paddingHorizontal:24,marginTop:8},buttonText:{color:"#10312c",fontWeight:"800"},error:{color:"#e76f51"},section:{color:colors.goldSoft,fontSize:18,fontWeight:"800",textAlign:"right"},grid:{flexDirection:"row",flexWrap:"wrap",gap:8},reciter:{width:"48%",backgroundColor:colors.surface,borderRadius:16,borderWidth:1,borderColor:colors.line,padding:12,alignItems:"center",gap:8},selected:{borderColor:colors.gold,backgroundColor:colors.surface2},smallAvatar:{width:44,height:44,borderRadius:22,alignItems:"center",justifyContent:"center"},reciterName:{color:colors.text,fontSize:12,textAlign:"center"},chip:{padding:10,borderWidth:1,borderColor:colors.line,borderRadius:16,marginRight:8},note:{color:colors.muted,fontSize:11,lineHeight:18,textAlign:"right"}
});
