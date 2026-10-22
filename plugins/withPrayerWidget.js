const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const PKG = "com.noorislam.app.widget";

module.exports = function withPrayerWidget(config) {
  config = withAndroidManifest(config, mod => {
    const app = mod.modResults.manifest.application?.[0];
    if (!app) throw new Error("Prayer widget: application entry missing");
    app.receiver = app.receiver || [];
    const name = PKG + ".PrayerWidgetProvider";
    if (!app.receiver.some(x => x.$?.["android:name"] === name)) app.receiver.push({
      $: { "android:name": name, "android:label": "نور الإسلام", "android:exported": "true" },
      "intent-filter": [{ action: [{ $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } }] }],
      "meta-data": [{ $: { "android:name": "android.appwidget.provider", "android:resource": "@xml/noor_prayer_widget_info" } }]
    });
    return mod;
  });

  config = withDangerousMod(config, ["android", async mod => {
    const root = mod.modRequest.projectRoot;
    const javaRoot = path.join(root, "android/app/src/main/java");
    const widgetPackage = path.join(javaRoot, "com/noorislam/app/widget");
    const layout = path.join(root, "android/app/src/main/res/layout");
    const xml = path.join(root, "android/app/src/main/res/xml");
    await Promise.all([
      fs.promises.mkdir(widgetPackage, { recursive: true }),
      fs.promises.mkdir(layout, { recursive: true }),
      fs.promises.mkdir(xml, { recursive: true })
    ]);

    // Expo SDK 52 does not expose withMainApplication from every config-plugins
    // entry point. Patch the generated Kotlin application during the dangerous mod.
    async function findMainApplication(dir) {
      let entries;
      try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); }
      catch { return null; }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = await findMainApplication(full);
          if (found) return found;
        } else if (entry.name === "MainApplication.kt") {
          return full;
        }
      }
      return null;
    }
    const mainApplication = await findMainApplication(javaRoot);
    if (!mainApplication) throw new Error("Prayer widget: MainApplication.kt not found after Expo prebuild");
    let source = await fs.promises.readFile(mainApplication, "utf8");
    const importLine = "import " + PKG + ".PrayerWidgetPackage";
    if (!source.includes(importLine)) {
      source = source.replace(/^(package [^\n]+\n)/m, "$1\n" + importLine + "\n");
    }
    const marker = "PackageList(this).packages.apply {";
    if (source.includes(marker) && !source.includes("add(PrayerWidgetPackage())")) {
      source = source.replace(marker, marker + "\n          add(PrayerWidgetPackage())");
    } else if (!source.includes("add(PrayerWidgetPackage())")) {
      throw new Error("Prayer widget: could not find PackageList packages block in MainApplication.kt");
    }
    await fs.promises.writeFile(mainApplication, source);

    await fs.promises.writeFile(path.join(widgetPackage, "PrayerWidgetModule.kt"), `package com.noorislam.app.widget
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
class PrayerWidgetModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
 override fun getName() = "PrayerWidgetModule"
 @ReactMethod fun updateWidget(prayerName: String, prayerTime: String, prayerAtMillis: String, quote: String, promise: Promise) {
  try {
   context.getSharedPreferences("noor_prayer_widget", Context.MODE_PRIVATE).edit()
    .putString("prayerName", prayerName).putString("prayerTime", prayerTime).putString("prayerAtMillis", prayerAtMillis).putString("quote", quote).apply()
   val manager = AppWidgetManager.getInstance(context)
   manager.getAppWidgetIds(ComponentName(context, PrayerWidgetProvider::class.java)).forEach { PrayerWidgetProvider.updateOne(context, manager, it) }
   promise.resolve(true)
  } catch (e: Exception) { promise.reject("WIDGET_UPDATE_FAILED", e) }
 }
}`);
    await fs.promises.writeFile(path.join(widgetPackage, "PrayerWidgetPackage.kt"), `package com.noorislam.app.widget
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
class PrayerWidgetPackage : ReactPackage {
 override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(PrayerWidgetModule(context))
 override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}`);
    await fs.promises.writeFile(path.join(widgetPackage, "PrayerWidgetProvider.kt"), `package com.noorislam.app.widget
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.noorislam.app.R
class PrayerWidgetProvider : AppWidgetProvider() {
 override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { updateOne(context, manager, it) } }
 companion object {
  fun updateOne(context: Context, manager: AppWidgetManager, id: Int) {
   val prefs = context.getSharedPreferences("noor_prayer_widget", Context.MODE_PRIVATE)
   val views = RemoteViews(context.packageName, R.layout.noor_prayer_widget)
   views.setTextViewText(R.id.widget_prayer_name, prefs.getString("prayerName", "افتح التطبيق لتحديث المواقيت"))
   views.setTextViewText(R.id.widget_prayer_time, prefs.getString("prayerTime", "نور الإسلام"))
   val at = prefs.getString("prayerAtMillis", "0")?.toLongOrNull() ?: 0L
   val remaining = at - System.currentTimeMillis()
   val remainingText = if (at > 0 && remaining > 0) {
    val minutes = remaining / 60000
    (minutes / 60).toString() + " س و " + (minutes % 60).toString() + " د متبقية"
   } else "افتح التطبيق لتحديث الصلاة القادمة"
   views.setTextViewText(R.id.widget_countdown, remainingText)
   views.setTextViewText(R.id.widget_quote, prefs.getString("quote", "سبحان الله وبحمده"))
   try {
    val launch = Intent(context, Class.forName(context.packageName + ".MainActivity"))
    views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
   } catch (_: Exception) {}
   manager.updateAppWidget(id, views)
  }
 }
}`);
    await fs.promises.writeFile(path.join(layout, "noor_prayer_widget.xml"), `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android" android:id="@+id/widget_root"
 android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical"
 android:padding="14dp" android:background="#0E2A2C">
 <TextView android:layout_width="match_parent" android:layout_height="wrap_content" android:text="نور الإسلام · الصلاة القادمة" android:textColor="#F4D58D" android:textSize="15sp" android:textStyle="bold"/>
 <TextView android:id="@+id/widget_prayer_name" android:layout_width="match_parent" android:layout_height="wrap_content" android:text="افتح التطبيق لتحديث المواقيت" android:textColor="#EEF5F0" android:textSize="17sp" android:textStyle="bold" android:paddingTop="5dp"/>
 <TextView android:id="@+id/widget_prayer_time" android:layout_width="match_parent" android:layout_height="wrap_content" android:text="--:--" android:textColor="#F4D58D" android:textSize="20sp" android:textStyle="bold"/>
 <TextView android:id="@+id/widget_countdown" android:layout_width="match_parent" android:layout_height="wrap_content" android:text="افتح التطبيق لتحديث الصلاة القادمة" android:textColor="#8FB3A8" android:textSize="12sp"/>
 <TextView android:id="@+id/widget_quote" android:layout_width="match_parent" android:layout_height="wrap_content" android:text="سبحان الله وبحمده" android:textColor="#EEF5F0" android:textSize="12sp" android:paddingTop="4dp"/>
</LinearLayout>`);
    await fs.promises.writeFile(path.join(xml, "noor_prayer_widget_info.xml"), `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
 android:minWidth="220dp" android:minHeight="120dp" android:updatePeriodMillis="1800000"
 android:initialLayout="@layout/noor_prayer_widget" android:resizeMode="horizontal|vertical" android:widgetCategory="home_screen" />`);
    return mod;
  }]);
  return config;
};
