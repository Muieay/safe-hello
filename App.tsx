import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as Notifications from "expo-notifications";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Share,
  AppState,
  Platform
} from "react-native";
import i18n from "./i18n/locales";
import { registerBackgroundFetchAsync } from "./backgroundTask";

// 配置通知处理器
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DEFAULT_KEY = "safety";
const KEY_STORE = "KEY_HISTORY";
const LAST_CLIPBOARD = "LAST_CLIPBOARD";

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
  const [notificationPermission, setNotificationPermission] = useState(false);

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
    try {
      let clipboardContent = await Clipboard.getStringAsync();
      
      // 统一换行符格式为 \n（避免 \r\n 和 \n 混用导致的解密错误）
      clipboardContent = clipboardContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // 检查内容是否包含"safe-say:"前缀，如果包含则过滤掉前缀
      if (clipboardContent.startsWith('safe-say:')) {
        const contentWithoutPrefix = clipboardContent.substring('safe-say:'.length);
        setter(contentWithoutPrefix);
      } else {
        setter(clipboardContent);
      }
    } catch (error) {
      // Web 端剪贴板权限被拒绝时的提示
      if (Platform.OS === 'web') {
        Alert.alert(
          i18n.t("clipboard_permission_title") || "剪贴板权限",
          i18n.t("clipboard_permission_message") || "请允许访问剪贴板或手动粘贴内容"
        );
      } else {
        console.error("粘贴失败:", error);
      }
    }
  }

  function encrypt() {
    saveKey(key);
    // 统一换行符格式为 \n
    const normalizedPlain = plain.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    setCipher(crypt(normalizedPlain, key));
  }

  function decrypt() {
    saveKey(key);
    // 统一换行符格式为 \n
    const normalizedCipher = cipher.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    setPlain(crypt(normalizedCipher, key, true));
  }

  // 请求通知权限并自动启用后台任务
  useEffect(() => {
    (async () => {
      // Web 端跳过通知和后台任务
      if (Platform.OS === 'web') {
        console.log('Web 端不支持通知和后台任务');
        return;
      }

      // 请求通知权限
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      setNotificationPermission(finalStatus === 'granted');
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          i18n.t("notification_permission_title") || "通知权限",
          i18n.t("notification_permission_message") || "需要通知权限才能显示解密消息"
        );
      }

      // 自动注册后台任务
      try {
        await registerBackgroundFetchAsync();
        console.log('后台任务已自动启用');
      } catch (error) {
        console.error('启用后台任务失败:', error);
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(KEY_STORE).then((v) => {
      if (v) {
        const storedKeys = JSON.parse(v);
        setKeys(storedKeys);
        // 如果有存储的密钥，使用第一个作为默认值
        if (storedKeys.length > 0) {
          setKey(storedKeys[0]);
        }
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(KEY_STORE, JSON.stringify(keys));
  }, [keys]);

  // 后台监听剪贴板并自动解密通知
  useEffect(() => {
    // Web 端不支持后台剪贴板监听
    if (Platform.OS === 'web') {
      return;
    }

    let intervalId: NodeJS.Timeout;

    const checkClipboard = async () => {
      try {
        let content = await Clipboard.getStringAsync();
        const lastClipboard = await AsyncStorage.getItem(LAST_CLIPBOARD);
        
        // 统一换行符格式为 \n
        content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // 检测到新的加密内容
        if (content && content.startsWith('safe-say:') && content !== lastClipboard) {
          const encryptedText = content.substring('safe-say:'.length);
          const decryptedText = crypt(encryptedText, key, true);
          
          // 更新界面
          setCipher(encryptedText);
          setPlain(decryptedText);
          
          // 保存最后处理的剪贴板内容
          await AsyncStorage.setItem(LAST_CLIPBOARD, content);
          
          // 发送通知
          if (notificationPermission) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: i18n.t("decrypted_message") || "🔓 解密：",
                body: decryptedText.length > 100 
                  ? decryptedText.substring(0, 100) + "..." 
                  : decryptedText,
                data: { decryptedText },
              },
              trigger: null, // 立即显示
            });
          }
        }
      } catch (error) {
        console.error("剪贴板检测错误:", error);
      }
    };

    // 首次检查
    checkClipboard();

    // 定期检查剪贴板（每2秒）
    intervalId = setInterval(checkClipboard, 2000);

    // 监听应用状态变化
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkClipboard();
      }
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      subscription.remove();
    };
  }, [key, notificationPermission]);

  function saveKey(k: string) {
    if (!keys.includes(k)) setKeys([k, ...keys]);
  }
  function copy(text: string) {
    Clipboard.setStringAsync(text).catch((error) => {
      // Web 端剪贴板复制失败时的提示
      if (Platform.OS === 'web') {
        Alert.alert(
          i18n.t("clipboard_permission_title") || "剪贴板权限",
          i18n.t("clipboard_copy_failed") || "复制失败，请手动复制内容"
        );
      }
      console.error("复制失败:", error);
    });
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
