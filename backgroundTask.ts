import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_FETCH_TASK = 'background-clipboard-check';
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

/* ================= Background Task ================= */

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const content = await Clipboard.getStringAsync();
    const lastClipboard = await AsyncStorage.getItem(LAST_CLIPBOARD);

    if (content && content.startsWith('safe-say:') && content !== lastClipboard) {
      const encryptedText = content.substring('safe-say:'.length);
      
      // 获取存储的密钥
      const keysJson = await AsyncStorage.getItem(KEY_STORE);
      const keys = keysJson ? JSON.parse(keysJson) : [];
      const key = keys.length > 0 ? keys[0] : DEFAULT_KEY;
      
      // 解密
      const decryptedText = crypt(encryptedText, key, true);
      
      // 保存最后处理的剪贴板内容
      await AsyncStorage.setItem(LAST_CLIPBOARD, content);
      
      // 发送通知
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔓 解密消息',
          body: decryptedText.length > 100 
            ? decryptedText.substring(0, 100) + '...' 
            : decryptedText,
          data: { decryptedText, encryptedText },
        },
        trigger: null,
      });

      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('后台任务错误:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundFetchAsync() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15分钟（系统最小间隔）
      stopOnTerminate: false, // 应用终止后继续运行
      startOnBoot: true, // 设备重启后自动启动
    });
    console.log('后台任务已注册');
  } catch (err) {
    console.error('注册后台任务失败:', err);
  }
}

export async function unregisterBackgroundFetchAsync() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    console.log('后台任务已取消注册');
  } catch (err) {
    console.error('取消注册后台任务失败:', err);
  }
}

export async function checkBackgroundFetchStatus() {
  const status = await BackgroundFetch.getStatusAsync();
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
  
  return {
    status,
    isRegistered,
    statusText: status === BackgroundFetch.BackgroundFetchStatus.Available 
      ? '可用' 
      : status === BackgroundFetch.BackgroundFetchStatus.Denied
      ? '已拒绝'
      : '受限',
  };
}
