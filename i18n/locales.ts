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
    },
});

const locales = Localization.getLocales();

i18n.locale = locales[0]?.languageCode ?? "en";
i18n.enableFallback = true;

export default i18n;
