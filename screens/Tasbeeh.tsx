import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, Vibration, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../theme";

const dhikrs = ["سبحان الله", "الحمد لله", "الله أكبر", "لا إله إلا الله", "أستغفر الله", "اللهم صلِّ وسلِّم على نبينا محمد"];
const goals = [33, 99, 100];
const KEY = "noor:tasbeeh:v1";
const ar = (n: number) => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

export default function Tasbeeh() {
  const [idx, setIdx] = useState(0), [goal, setGoal] = useState(33);
  const [counts, setCounts] = useState<number[]>(dhikrs.map(() => 0)), [loaded, setLoaded] = useState(false);
  useEffect(() => { AsyncStorage.getItem(KEY).then(v => { if (v) { const s = JSON.parse(v); setCounts(s.counts ?? dhikrs.map(() => 0)); setGoal(s.goal ?? 33); setIdx(s.idx ?? 0); } }).catch(() => {}).finally(() => setLoaded(true)); }, []);
  useEffect(() => { if (loaded) AsyncStorage.setItem(KEY, JSON.stringify({ counts, goal, idx })).catch(() => {}); }, [counts, goal, idx, loaded]);
  const count = counts[idx], total = counts.reduce((a, b) => a + b, 0), round = Math.floor(count / goal), inRound = count % goal;
  const tap = () => { const next = [...counts]; next[idx] += 1; setCounts(next); Vibration.vibrate(next[idx] % goal === 0 ? [0, 60, 60, 60] : 12); };
  return <ScrollView contentContainerStyle={s.content}>
    <Text style={s.title}>المسبحة الإلكترونية</Text><Text style={s.hint}>سبّح واذكر الله في كل وقت</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>{dhikrs.map((d, i) => <Pressable key={d} onPress={() => setIdx(i)} style={[s.chip, idx === i && s.on]}><Text style={s.text}>{d}</Text></Pressable>)}</ScrollView>
    <View style={s.card}><Text style={s.dhikr}>{dhikrs[idx]}</Text>
      <Pressable onPress={tap} style={s.bead}><Text style={s.count}>{ar(count)}</Text><Text style={s.text}>اضغط للتسبيح</Text></Pressable>
      <Text style={s.text}>{ar(inRound)} / {ar(goal)} · الدورات المكتملة: {ar(round)}</Text>
      <View style={s.row}>{goals.map(g => <Pressable key={g} onPress={() => setGoal(g)} style={[s.chip, goal === g && s.on]}><Text style={s.text}>{ar(g)}</Text></Pressable>)}</View>
      <Pressable onPress={() => { const n = [...counts]; n[idx] = 0; setCounts(n); }}><Text style={s.reset}>إعادة عدّاد هذا الذكر</Text></Pressable>
      <Text style={s.text}>إجمالي التسبيحات: {ar(total)}</Text>
    </View>
  </ScrollView>;
}
const s = StyleSheet.create({
  content: { padding: 20, paddingBottom: 120, gap: 16 }, title: { color: colors.goldSoft, fontSize: 28, fontWeight: "800", textAlign: "right" }, hint: { color: colors.muted, textAlign: "right" },
  card: { backgroundColor: colors.surface, borderRadius: 26, padding: 22, alignItems: "center", gap: 16, borderWidth: 1, borderColor: colors.line },
  dhikr: { color: colors.goldSoft, fontSize: 24, fontWeight: "800" }, bead: { width: 210, height: 210, borderRadius: 105, backgroundColor: colors.surface2, borderWidth: 8, borderColor: colors.gold, alignItems: "center", justifyContent: "center" },
  count: { color: "#fff4d4", fontSize: 52, fontWeight: "800" }, text: { color: colors.muted, fontSize: 13 }, chip: { borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 10, margin: 4 }, on: { backgroundColor: colors.gold }, row: { flexDirection: "row" }, reset: { color: colors.gold, marginTop: 8 }
});
