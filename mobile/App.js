import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { CameraView, useCameraPermissions } from "expo-camera";

const API = String(process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.pranasakha.codeex.space/api").replace(/\/$/, "");
const TOKEN_KEY = "pranasakha.mobile.jwt";
const QUEUE_KEY = "pranasakha.mobile.scan.queue";

async function call(path, options = {}, jwt = "") {
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}), ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function categoryLabel(slug) {
  return { doctors: "Doctor", nurses: "Nurse", physiotherapists: "Physiotherapist", technicians: "Technician", assistants: "Assistant", others: "Other" }[slug] || "Healthcare Volunteer";
}

export default function App() {
  const [jwt, setJwt] = useState("");
  const [user, setUser] = useState(null);
  const [pass, setPass] = useState(null);
  const [history, setHistory] = useState([]);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [checkpoint, setCheckpoint] = useState("gate");
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(true);

  const category = useMemo(() => categoryLabel(user?.service_category), [user?.service_category]);

  async function hydrate(token) {
    const me = await call("/me", {}, token);
    setJwt(token); setUser(me.user);
    const [passData, scanData] = await Promise.all([
      call("/passes/me", {}, token).catch(() => ({ pass: null })),
      call(`/scans?user_id=${encodeURIComponent(me.user.id)}`, {}, token).catch(() => ({ scans: [] })),
    ]);
    setPass(passData.pass); setHistory(scanData.scans || []);
  }

  useEffect(() => { (async () => { try { const stored = await SecureStore.getItemAsync(TOKEN_KEY); if (stored) await hydrate(stored); } catch {} finally { setLoading(false); } })(); }, []);

  async function login() {
    setLoading(true); setResult(null);
    try { const data = await call("/login", { method: "POST", body: JSON.stringify(loginForm) }); await SecureStore.setItemAsync(TOKEN_KEY, data.user.token); await hydrate(data.user.token); }
    catch (e) { setResult({ result: "denied", reason: e.message }); }
    finally { setLoading(false); }
  }

  async function signOut() { await SecureStore.deleteItemAsync(TOKEN_KEY); setJwt(""); setUser(null); setPass(null); setHistory([]); }

  async function resolve(token) {
    if (!jwt) return;
    try {
      const data = await call("/passes/resolve", { method: "POST", body: JSON.stringify({ token, checkpoint_type: checkpoint }) }, jwt);
      setResult(data);
      if (data.result === "granted") setScanning(false);
    } catch (e) {
      const queued = JSON.parse(await AsyncStorage.getItem(QUEUE_KEY) || "[]");
      queued.push({ token, checkpoint_type: checkpoint, queued_at: new Date().toISOString() });
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queued));
      setResult({ result: "denied", reason: `Offline — scan queued. ${e.message}` });
    }
  }

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large"/><Text style={styles.muted}>Loading PRANASAKHA…</Text></SafeAreaView>;
  if (!user) return <SafeAreaView style={styles.page}><View style={styles.brand}><Text style={styles.brandText}>PRANASAKHA</Text><Text style={styles.muted}>Secure Seva identity</Text></View><View style={styles.card}><Text style={styles.title}>Sign in</Text><TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={loginForm.email} onChangeText={(v) => setLoginForm({ ...loginForm, email: v })}/><TextInput style={styles.input} placeholder="Password" secureTextEntry value={loginForm.password} onChangeText={(v) => setLoginForm({ ...loginForm, password: v })}/><TouchableOpacity style={styles.primary} onPress={login}><Text style={styles.primaryText}>Sign in</Text></TouchableOpacity>{result ? <Text style={styles.error}>{result.reason}</Text> : null}</View></SafeAreaView>;

  const isScanner = ["admin","director","hod","accommodation","mandir","travel","it"].includes(user.role);
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.scroll}><View style={styles.header}><View><Text style={styles.brandText}>PRANASAKHA</Text><Text style={styles.muted}>{user.full_name || user.email}</Text></View><TouchableOpacity onPress={signOut}><Text style={styles.link}>Sign out</Text></TouchableOpacity></View>
    {!isScanner ? <View style={styles.card}><Text style={styles.kicker}>VIRTUAL ID</Text><Text style={styles.title}>{category}</Text><Text style={styles.subtitle}>{user.full_name}</Text><Text style={styles.muted}>{user.institution || "Institution not set"}</Text>{user.profile_picture ? <Image source={{ uri: user.profile_picture }} style={styles.avatar}/>:null}{pass?.qr_data_url ? <Image source={{ uri: pass.qr_data_url }} style={styles.qr}/>:<View style={styles.qrPlaceholder}><Text style={styles.muted}>QR issued after Directorate approval</Text></View>}<Text style={styles.code}>{pass?.code || "PENDING"}</Text><Text style={styles.notice}>This QR contains only an opaque token. Checkpoints receive only the fields they are allowed to see.</Text><Text style={styles.kicker}>SERVICE HISTORY</Text>{history.slice(0,8).map((row)=><View style={styles.history} key={row.id}><Text style={styles.historyStrong}>{row.checkpoint_name || row.checkpoint_type}</Text><Text style={styles.muted}>{row.result} • {new Date(row.scanned_at).toLocaleString()}</Text></View>)}</View>:
    <View style={styles.card}><Text style={styles.kicker}>CHECKPOINT SCANNER</Text><Text style={styles.title}>Scan Seva pass</Text><View style={styles.chips}>{["gate","canteen","mandir","camp"].map((x)=><TouchableOpacity key={x} onPress={()=>setCheckpoint(x)} style={[styles.chip, checkpoint===x&&styles.chipActive]}><Text style={checkpoint===x?styles.chipTextActive:styles.chipText}>{x}</Text></TouchableOpacity>)}</View>{scanning && permission?.granted ? <View style={styles.cameraWrap}><CameraView style={styles.camera} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={scanning ? ({ data }) => { setScanning(false); resolve(data); } : undefined}/></View>:<TouchableOpacity style={styles.primary} onPress={async()=>{if(!permission?.granted){const p=await requestPermission(); if(!p.granted)return;} setScanning(true);}}><Text style={styles.primaryText}>Open camera</Text></TouchableOpacity>}<TextInput style={styles.input} placeholder="Manual PSK code / token" autoCapitalize="characters" value={manualCode} onChangeText={setManualCode}/><TouchableOpacity style={styles.secondary} onPress={()=>resolve(manualCode)}><Text style={styles.secondaryText}>Verify manually</Text></TouchableOpacity>{result?<View style={[styles.result,result.result==="granted"?styles.ok:styles.bad]}><Text style={styles.resultTitle}>{result.result === "granted" ? "✓ VERIFIED" : "✗ DENIED"}</Text><Text style={styles.resultReason}>{result.reason}</Text>{result.data?.name?<Text style={styles.resultName}>{result.data.name}</Text>:null}{result.data?.institution?<Text style={styles.muted}>{result.data.institution}</Text>:null}</View>:null}</View>}
  </ScrollView></SafeAreaView>;
}

const styles=StyleSheet.create({page:{flex:1,backgroundColor:"#f7f8fc"},scroll:{padding:18,paddingBottom:36},center:{flex:1,alignItems:"center",justifyContent:"center",gap:10},brand:{marginBottom:22},brandText:{fontSize:22,fontWeight:"800",color:"#294594"},muted:{fontSize:12,color:"#737a89",marginTop:4},header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:14},link:{color:"#294594",fontWeight:"800",fontSize:13},card:{backgroundColor:"#fff",borderRadius:24,padding:18,borderWidth:1,borderColor:"#e2e5ec"},kicker:{fontSize:10,fontWeight:"800",letterSpacing:1.7,color:"#66708a"},title:{fontSize:25,fontWeight:"800",color:"#202531",marginTop:6},subtitle:{fontSize:17,fontWeight:"700",color:"#394053",marginTop:5},input:{borderWidth:1,borderColor:"#dfe3ea",borderRadius:14,paddingHorizontal:14,paddingVertical:12,marginTop:12,fontSize:14,backgroundColor:"#fbfcfe"},primary:{backgroundColor:"#294594",borderRadius:14,paddingVertical:13,alignItems:"center",marginTop:14},primaryText:{color:"#fff",fontWeight:"800",fontSize:14},secondary:{borderWidth:1,borderColor:"#294594",borderRadius:14,paddingVertical:13,alignItems:"center",marginTop:10},secondaryText:{color:"#294594",fontWeight:"800",fontSize:14},error:{color:"#b13b42",marginTop:12,fontSize:12},avatar:{width:72,height:72,borderRadius:36,marginTop:16},qr:{width:"100%",aspectRatio:1,marginTop:16},qrPlaceholder:{height:260,alignItems:"center",justifyContent:"center",backgroundColor:"#f7f8fb",borderRadius:18,marginTop:16},code:{textAlign:"center",fontFamily:"monospace",fontWeight:"900",fontSize:14,letterSpacing:2,color:"#294594",marginTop:8},notice:{backgroundColor:"#f4f6fb",padding:12,borderRadius:14,color:"#66708a",fontSize:11,lineHeight:17,marginTop:12,marginBottom:22},history:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:"#eef0f4"},historyStrong:{fontSize:12,fontWeight:"800",color:"#404756"},chips:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:14,marginBottom:12},chip:{paddingHorizontal:12,paddingVertical:8,borderRadius:99,borderWidth:1,borderColor:"#dde1e9"},chipActive:{backgroundColor:"#e8edff",borderColor:"#b9c7ef"},chipText:{fontSize:11,color:"#606877",fontWeight:"700"},chipTextActive:{fontSize:11,color:"#294594",fontWeight:"800"},cameraWrap:{height:330,borderRadius:20,overflow:"hidden",marginTop:10},camera:{flex:1},result:{marginTop:14,padding:15,borderRadius:18},ok:{backgroundColor:"#e8f5eb"},bad:{backgroundColor:"#fff0ef"},resultTitle:{fontSize:16,fontWeight:"900",color:"#263033"},resultReason:{fontSize:12,color:"#555d6b",marginTop:5},resultName:{fontSize:18,fontWeight:"800",color:"#202531",marginTop:10}}
);
