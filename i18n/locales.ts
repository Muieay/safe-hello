import * as Localization from "expo-localization";
import { I18n } from "i18n-js";

const i18n = new I18n({
    zh: {
        title: "🔐 密语",
        key: "密钥",
        plaintext: "明文",
        ciphertext: "密文",
        encrypt: "加密 ↓",
        decrypt: "解密 ↑",
        copy_plain: "复制明文",
        copy_cipher: "复制密文",
        copy_share: "复制 / 分享",
        copy_success: "已复制到剪贴板",
        error: "错误",
        paste: "粘贴",
        decrypted_message: "🔓 解密消息",
        notification_permission_title: "通知权限",
        notification_permission_message: "需要通知权限才能显示解密消息",
        background_monitoring: "后台监听",
        background_monitoring_desc: "应用关闭时也能自动解密通知",
        status: "状态",
        background_task_enabled: "后台任务已启用",
        background_task_enabled_message: "应用将在后台监听剪切板并自动解密通知",
        background_task_disabled: "后台任务已禁用",
        background_task_disabled_message: "应用将不再在后台监听剪切板",
    },
    en: {
        title: "🔐 Text Encryption Tool",
        key: "Key",
        plaintext: "Plain Text",
        ciphertext: "Cipher Text",
        encrypt: "Encrypt ↓",
        decrypt: "Decrypt ↑",
        copy_plain: "Copy Plain",
        copy_cipher: "Copy Cipher",
        copy_share: "Copy / Share",
        copy_success: "Copied to clipboard",
        error: "Error",
        paste: "Paste",
        decrypted_message: "🔓 Decrypted Message",
        notification_permission_title: "Notification Permission",
        notification_permission_message: "Notification permission is required to display decrypted messages",
        background_monitoring: "Background Monitoring",
        background_monitoring_desc: "Auto-decrypt and notify even when app is closed",
        status: "Status",
        background_task_enabled: "Background Task Enabled",
        background_task_enabled_message: "App will monitor clipboard and auto-decrypt in background",
        background_task_disabled: "Background Task Disabled",
        background_task_disabled_message: "App will no longer monitor clipboard in background",
    },
});

const locales = Localization.getLocales();

i18n.locale = locales[0]?.languageCode ?? "en";
i18n.enableFallback = true;

export default i18n;