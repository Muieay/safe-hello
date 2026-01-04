import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Share
} from "react-native";
import i18n from "./i18n/locales";

const DEFAULT_KEY = "safety";
const KEY_STORE = "KEY_HISTORY";
const DECR_SATE = "DECR_SATE";

/* ================= Encryption Core ================= */

type Range = {
  start: number;
  end: number;
};

const RANGES: Range[] = [
  { start: 0x30, end: 0x39 }, // 0-9 数字（必须在最前）
  { start: 0x41, end: 0x5a }, // A-Z
  { start: 0x61, end: 0x7a }, // a-z
  { start: 0x4e00, end: 0x9fff }, // 中文
  { start: 0x3040, end: 0x309f }, // 平假名
  { start: 0x30a0, end: 0x30ff }, // 片假名
  { start: 0xac00, end: 0xd7af }, // 韩文
  { start: 0x21, end: 0x2f }, // ASCII 标点 1
  { start: 0x3a, end: 0x40 }, // ASCII 标点 2 (@ 在这里)
  { start: 0x5b, end: 0x60 }, // ASCII 标点 3
  { start: 0x7b, end: 0x7e }, // ASCII 标点 4
];

function getKeyShift(key: string): number {
  return [...key].reduce((sum, c) => sum + c.codePointAt(0)!, 0);
}

function shiftChar(char: string, shift: number): string {
  const code = char.codePointAt(0)!;

  for (const r of RANGES) {
    if (code >= r.start && code <= r.end) {
      const size = r.end - r.start + 1;
      const next = ((code - r.start + shift) % size + size) % size;
      return String.fromCodePoint(r.start + next);
    }
  }

  return char;
}

function crypt(text: string, key: string, decrypt = false): string {
  const base = getKeyShift(key);

  return [...text]
    .map((c, i) =>
      shiftChar(c, (decrypt ? -1 : 1) * (base + i))
    )
    .join("");
}

export default function App() {
  const [key, setKey] = useState(DEFAULT_KEY);
  const [keys, setKeys] = useState<string[]>([]);
  const [plain, setPlain] = useState("");
  const [cipher, setCipher] = useState("");

  async function  copyShare(text: string){
    if (!text) return;
    try {
      const prefixedText = `safe-say:${text}`;
      copy(prefixedText);
      await Share.share({
        message: prefixedText,
      });
    } catch (error) {
      Alert.alert('Error');
    }
  }

  async function paste(setter: React.Dispatch<React.SetStateAction<string>>) {
    const clipboardContent = await Clipboard.getStringAsync();
    
    // 检查内容是否包含"safe-say:"前缀，如果包含则过滤掉前缀
    if (clipboardContent.startsWith('safe-say:')) {
      const contentWithoutPrefix = clipboardContent.substring('safe-say:'.length);
      setter(contentWithoutPrefix);
    } else {
      setter(clipboardContent);
    }
  }

  function encrypt() {
    saveKey(key);
    setCipher(crypt(plain, key));
  }

  function decrypt() {
    saveKey(key);
    setPlain(crypt(cipher, key, true));
  }

  useEffect(() => {
    AsyncStorage.getItem(KEY_STORE).then((v) => {
      if (v) setKeys(JSON.parse(v));
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(KEY_STORE, JSON.stringify(keys));
  }, [keys]);

  // 自动检测剪贴板内容并解密
  useEffect(() => {
    const checkClipboard = async () => {
      const content = await Clipboard.getStringAsync();
      if (content.startsWith('safe-say:') && content !== (await AsyncStorage.getItem(DECR_SATE))) {
        const encryptedText = content.substring('safe-say:'.length);
        setCipher(encryptedText);
        await AsyncStorage.setItem(DECR_SATE, content);
        // 尝试解密（使用默认密钥）
        setPlain(crypt(encryptedText, DEFAULT_KEY, true));
      }
    };
    
    // 延迟执行，确保组件完全加载后执行
    const timer = setTimeout(checkClipboard, 500);
    return () => clearTimeout(timer);
  }, []);

  function saveKey(k: string) {
    if (!keys.includes(k)) setKeys([k, ...keys]);
  }
  function copy(text: string) {
    Clipboard.setStringAsync(text);
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={{height: 25}}></View>
      <Text style={styles.title}>{i18n.t("title")}</Text>

      <Text style={styles.label}>{i18n.t("key")}</Text>
      <TextInput
        style={styles.input}
        value={key}
        onChangeText={setKey}
      />

      <View style={styles.keyRow}>
        {keys.map((k) => (
          <TouchableOpacity
            key={k}
            style={styles.keyItem}
            onPress={() => setKey(k)}
            onLongPress={() => setKeys(keys.filter((x) => x !== k))}
          >
            <Text style={styles.keyItemText}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{i18n.t("plaintext")}</Text>
      <View style={styles.textAreaContainer}>
        <TextInput
          style={styles.textArea}
          multiline
          value={plain}
          onChangeText={setPlain}
        />
        <TouchableOpacity 
          style={[styles.pasteBtn, {top: 14}]} 
          onPress={() => paste(setPlain)}
        >
          <Text style={styles.pasteText}>{i18n.t("paste")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={encrypt}>
          <Text style={styles.btnText}>{i18n.t("encrypt")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={decrypt}>
          <Text style={styles.btnText}>{i18n.t("decrypt")}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>{i18n.t("ciphertext")}</Text>
      <View style={styles.textAreaContainer}>
        <TextInput
          style={styles.textArea}
          multiline
          value={cipher}
          onChangeText={setCipher}
        />
        <TouchableOpacity 
          style={[styles.pasteBtn, {top: 14}]} 
          onPress={() => paste(setCipher)}
        >
          <Text style={styles.pasteText}>{i18n.t("paste")}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.copyLink}>
        <TouchableOpacity onPress={() => copy(`safe-say:${cipher}`)}>
          <Text style={styles.copy}>{i18n.t("copy_cipher")}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => copyShare(cipher)}>
          <Text style={styles.copy}>{i18n.t("copy_share")}</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa'
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    marginBottom: 24,
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: 0.5
  },
  label: { 
    fontWeight: '700', 
    marginTop: 16,
    marginBottom: 6,
    fontSize: 16,
    color: '#2c3e50'
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    fontSize: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  textArea: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    minHeight: 120,
    marginTop: 6,
    fontSize: 16,
    backgroundColor: 'white',
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  copy: { 
    color: '#007aff', 
    marginTop: 8,
    marginBottom: 4,
    fontSize: 15,
    fontWeight: '600',
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    gap: 12
  },
  btn: {
    flex: 1,
    backgroundColor: '#007aff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007aff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  btnText: { 
    color: '#fff', 
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  keyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 4,
    gap: 8
  },
  keyItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbdefb'
  },
  keyItemText: {
    color: '#1565c0',
    fontSize: 14,
    fontWeight: '500'
  },
  copyLink: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textAreaContainer: {
    position: 'relative',
    width: '100%',
  },
  pasteBtn: {
    position: 'absolute',
    right: 14,
    zIndex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pasteText: {
    color: '#007bff3b',
    fontSize: 14,
    fontWeight: '600',
  }
});
