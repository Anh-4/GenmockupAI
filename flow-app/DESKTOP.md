# Đóng gói desktop .exe (Electron)

App SPA được wrap trong một cửa sổ Electron ([electron/main.cjs](electron/main.cjs))
rồi đóng gói thành thư mục chạy được (portable).

## Kết quả

```
flow-app/release/MockupAI-1.0.0-portable.exe   ← MỘT file duy nhất, double-click chạy (~72 MB)
```

File **portable đơn lẻ** (NSIS tự giải nén ra %TEMP% rồi chạy). Chia sẻ chỉ cần
gửi 1 file này. Không nhúng API key — lần đầu mở sẽ hiện popup yêu cầu nhập key
(lưu cục bộ trên máy người dùng).

## API key (runtime, không nhúng)

Key KHÔNG nằm trong build. Người dùng nhập qua popup khi mở app; key lưu ở
`localStorage` của máy họ. Đổi key bất kỳ lúc nào bằng nút 🔑 góc trên phải.
Logic ở [src/flow-sdk/index.ts](src/flow-sdk/index.ts) (`getApiKey`/`setApiKey`)
+ UI [src/components/ApiKeyModal.tsx](src/components/ApiKeyModal.tsx).

## Build lại

```bash
cd flow-app
npm install
npm run dist:win    # vite build (KHÔNG nhúng key) + electron-builder portable
```

> ⚠️ Đảm bảo KHÔNG có `flow-app/.env.local` chứa key khi build (tránh nhúng key
> vào bundle). Key giờ do người dùng nhập runtime.

## Lưu ý môi trường build: winCodeSign

`electron-builder` luôn tải công cụ **winCodeSign**, bên trong có symlink macOS.
Trên Windows **chưa bật Developer Mode / không phải admin**, bước giải nén symlink
báo lỗi *"Cannot create symbolic link"* và build dừng.

**Workaround đã áp dụng (không cần admin):** tự giải nén winCodeSign **bỏ thư mục
`darwin`** (phần chứa symlink) vào đúng cache, để electron-builder bỏ qua bước tạo
symlink:

```powershell
$cache = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
# (chạy 1 lần) lấy 1 file winCodeSign-*.7z trong cache rồi:
& .\node_modules\7zip-bin\win\x64\7za.exe x "$cache\<file>.7z" `
    -o"$cache\winCodeSign-2.6.0" "-x!darwin" -y
npm run dist:win
```

Hoặc cách chính thống: bật **Windows Developer Mode**
(Settings → Privacy & security → For developers) rồi `npm run dist:win`.

## Bảo mật

Bản đóng gói **không chứa API key** (đã kiểm tra trong `app.asar`). An toàn để
chia sẻ — mỗi người dùng tự nhập key của họ. Người nhận vẫn cần: Windows 64-bit
+ Internet; lần đầu Windows SmartScreen có thể cảnh báo (app chưa ký số) → bấm
*More info → Run anyway*.
