import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';

const LAST_CLIPBOARD = 'LAST_CLIPBOARD';
const KEY_STORE = 'KEY_HISTORY';
const DEFAULT_KEY = 'safety';

/* ================= Encryption Core ================= */

type Range = {
  start: number;
  end: number;
};

const RANGES: Range[] = [
  { start: 0x30, end: 0x39 },
  { start: 0x41, end: 0x5a },
  { start: 0x61, end: 0x7a },
  { start: 0x4e00, end: 0x9fff },
  { start: 0x3040, end: 0x309f },
  { start: 0x30a0, end: 0x30ff },
  { start: 0xac00, end: 0xd7af },
  { start: 0x21, end: 0x2f },
  { start: 0x3a, end: 0x40 },
  { start: 0x5b, end: 0x60 },
  { start: 0x7b, end: 0x7e },
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
    .map((c, i) => shiftChar(c, (decrypt ? -1 : 1) * (base + i)))
    .join('');
}

/* ================= 后台剪贴板检查工具函数 ================= */

/**
 * 检查剪贴板并自动解密
 * 这个函数可以在应用的任何地方调用
 */
export async function checkClipboardAndDecrypt(
  key: string,
  onDecrypted?: (decryptedText: string, encryptedText: string) => void
): Promise<{ decrypted: boolean; text?: string }> {
  try {
    let content = await Clipboard.getStringAsync();
    const lastClipboard = await AsyncStorage.getItem(LAST_CLIPBOARD);
    
    // 统一换行符格式为 \n
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // 检测到新的加密内容
    if (content && content.startsWith('safe-say:') && content !== lastClipboard) {
      const encryptedText = content.substring('safe-say:'.length);
      const decryptedText = crypt(encryptedText, key, true);
      
      // 保存最后处理的剪贴板内容
      await AsyncStorage.setItem(LAST_CLIPBOARD, content);
      
      // 回调通知
      if (onDecrypted) {
        onDecrypted(decryptedText, encryptedText);
      }
      
      // 发送通知
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔓 解密',
          body: decryptedText.length > 100 
            ? decryptedText.substring(0, 100) + '...' 
            : decryptedText,
          data: { decryptedText, encryptedText },
        },
        trigger: null,
      });

      return { decrypted: true, text: decryptedText };
    }

    return { decrypted: false };
  } catch (error) {
    console.error('剪贴板检查错误:', error);
    return { decrypted: false };
  }
}

/**
 * 获取当前密钥
 */
export async function getCurrentKey(): Promise<string> {
  try {
    const keysJson = await AsyncStorage.getItem(KEY_STORE);
    const keys = keysJson ? JSON.parse(keysJson) : [];
    return keys.length > 0 ? keys[0] : DEFAULT_KEY;
  } catch (error) {
    console.error('获取密钥失败:', error);
    return DEFAULT_KEY;
  }
}

