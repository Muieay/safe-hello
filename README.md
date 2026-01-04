# 🔐 密语 (Text Encryption Tool)

一款简单易用的文本加密工具应用，支持多种语言文字的加密和解密，包括中文、英文、数字及其他字符。

## 功能特点

- **多语言支持**：支持中文、英文、数字、平假名、片假名、韩文等多种语言文字的加密解密
- **简单易用**：直观的用户界面，一键加密/解密操作
- **密钥历史**：自动保存使用过的密钥，方便快速切换
- **便捷操作**：支持复制和分享功能
- **国际化**：支持中文和英文界面

## 技术栈

- **React Native**：跨平台移动应用开发
- **Expo**：开发工具和部署平台
- **TypeScript**：类型安全的JavaScript超集
- **AsyncStorage**：本地数据存储
- **i18n-js**：国际化支持

## 安装与运行

### 环境要求

- Node.js (建议版本 18+)
- Expo CLI

### 安装步骤

1. 克隆项目到本地：
   ```bash
   git clone <repository-url>
   cd safe-hello
   ```

2. 安装依赖包：
   ```bash
   npm install
   # 或者使用 yarn
   yarn install
   ```

3. 运行项目：
   ```bash
   # 在浏览器中运行（Web版）
   npm run web
   
   # 在Android设备上运行
   npm run android
   
   # 在iOS设备上运行
   npm run ios
   ```

4. 构建项目:

   ```bash
   # Build for Android
   eas build --platform android --profile production

   # Build for iOS
   eas build --platform ios --profile production

   # Prebuild for Android
   npx expo prebuild --platform android

   # Local build for Android
   eas build --profile production --platform android --local
   eas build --profile production --platform android --local --clear-cache

   ```

## 使用说明

1. **输入密钥**：在"密钥"框中输入您的加密/解密密钥
2. **输入明文**：在"明文"框中输入需要加密的文本
3. **加密**：点击"加密 ↓"按钮将明文转换为密文
4. **解密**：在密文框中输入密文，点击"解密 ↑"按钮还原为明文
5. **复制/分享**：使用复制按钮复制文本，或使用"复制/分享"按钮同时复制并启动分享功能

## 加密算法

应用采用自定义的字符偏移加密算法，支持以下字符范围：
- 数字 (0-9)
- 英文大写字母 (A-Z)
- 英文小写字母 (a-z)
- 中文字符 (基本汉字)
- 平假名和片假名
- 韩文字符
- ASCII 标点符号

## 项目结构

```
safe-hello/
├── App.tsx           # 主应用组件
├── app.json          # Expo应用配置
├── package.json      # 项目依赖配置
├── eas.json          # EAS构建配置
├── i18n/             # 国际化文件
│   └── locales.ts
├── assets/           # 静态资源
└── README.md         # 项目说明文档
```

## 配置

- **默认密钥**：应用默认使用 "safety" 作为密钥
- **密钥历史**：应用会自动保存最近使用的密钥，长按密钥标签可删除历史记录

## 构建与发布

项目使用EAS Build进行构建，支持以下构建配置：

- **Development**：开发版本，用于内部测试
- **Preview**：预览版本，用于分发测试
- **Production**：生产版本，用于正式发布

## 许可证

本项目为开源项目，使用MIT许可证。

## 贡献

欢迎提交Issue和Pull Request来改进此项目。

## 作者

Muieay