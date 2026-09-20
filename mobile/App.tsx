import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include',
  });
  return res.json();
}

export default function App() {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [sagun, setSagun] = useState('');

  const tabs = useMemo(
    () => ['home', 'matches', 'vendors', 'bookings', 'alerts', 'sagun'],
    []
  );

  const login = async () => {
    setLoading(true);
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    setMessage(data.message || (data.success ? 'Logged in' : 'Login failed'));
    if (data.success || data.authenticated) {
      setTab('home');
      refresh();
    }
  };

  const refresh = async () => {
    const [m, v, b, n] = await Promise.all([
      api('/api/matrimonial/matches'),
      api('/api/vendors?limit=10'),
      api('/api/bookings'),
      api('/api/notifications'),
    ]);
    setMatches(m.data || []);
    setVendors(v.data || v.vendors || []);
    setBookings(b.data || []);
    setNotifications(n.notifications || []);
  };

  const askSagun = async () => {
    const data = await api('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: sagun }),
    });
    setMessage(data.reply || data.message || JSON.stringify(data));
  };

  if (tab === 'login') {
    return (
      <SafeAreaView style={styles.wrap}>
        <Text style={styles.title}>WedWithMe</Text>
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <TouchableOpacity style={styles.btn} onPress={login}>
          <Text style={styles.btnText}>{loading ? '...' : 'Login'}</Text>
        </TouchableOpacity>
        <Text style={styles.note}>Uses the same /api auth as web. Set EXPO_PUBLIC_API_URL.</Text>
        {!!message && <Text style={styles.msg}>{message}</Text>}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrap}>
      <Text style={styles.title}>WedWithMe</Text>
      <View style={styles.nav}>
        {tabs.map((t) => (
          <TouchableOpacity key={t} onPress={() => { setTab(t); refresh(); }}>
            <Text style={[styles.navItem, tab === t && styles.navOn]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading && <ActivityIndicator color="#e5c158" />}
      <ScrollView>
        {tab === 'matches' && matches.map((item) => (
          <Text key={item.id || item.profile_id} style={styles.card}>{item.name} · {item.match_score || item.percentage}</Text>
        ))}
        {tab === 'vendors' && vendors.map((item) => (
          <Text key={item.id} style={styles.card}>{item.business_name} · {item.city}</Text>
        ))}
        {tab === 'bookings' && bookings.map((item) => (
          <Text key={item.id} style={styles.card}>{item.booking_number} · {item.status}</Text>
        ))}
        {tab === 'alerts' && notifications.map((item) => (
          <Text key={item.id} style={styles.card}>{item.title}</Text>
        ))}
        {tab === 'sagun' && (
          <View>
            <TextInput style={styles.input} placeholder="Ask Sagun" value={sagun} onChangeText={setSagun} />
            <TouchableOpacity style={styles.btn} onPress={askSagun}><Text style={styles.btnText}>Send</Text></TouchableOpacity>
          </View>
        )}
        {tab === 'home' && <Text style={styles.note}>Customer MVP screens wired to existing APIs. Match scores are informational only.</Text>}
        {!!message && <Text style={styles.msg}>{message}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#031710', padding: 16 },
  title: { color: '#e5c158', fontSize: 28, fontWeight: '800', marginBottom: 12 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10 },
  btn: { backgroundColor: '#e6005c', borderRadius: 8, padding: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  note: { color: '#9cb1a6', marginTop: 12 },
  msg: { color: '#fff', marginTop: 8 },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  navItem: { color: '#9cb1a6', textTransform: 'capitalize' },
  navOn: { color: '#e5c158', fontWeight: '700' },
  card: { color: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1d3b30' },
});
