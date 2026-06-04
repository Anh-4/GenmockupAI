# Mockup AI (Flow app → standalone)

App tạo mockup quần áo bằng AI generative: tải ảnh thiết kế (mặt trước/sau),
tự nhận diện loại sản phẩm, rồi sinh ảnh model mặc đồ / flat-lay 3D / cận cảnh —
hoặc video — bằng Google Gemini (Nano Banana / Veo).

Code UI giữ nguyên từ bản Google Labs Flow; `flow-sdk` được thay bằng adapter
gọi SDK chính thức [`@google/genai`](https://www.npmjs.com/package/@google/genai)
(xem [src/flow-sdk/index.ts](src/flow-sdk/index.ts)).

## Chạy

```bash
cd flow-app
npm install
copy .env.local.example .env.local   # rồi điền VITE_GEMINI_API_KEY
npm run dev                          # http://localhost:5173
```

Lấy API key: https://aistudio.google.com/apikey

## Mapping Flow → Gemini

| Flow API                 | Gemini (@google/genai)                              |
|--------------------------|-----------------------------------------------------|
| `Flow.generate.text`     | `models.generateContent` (gemini-2.5-flash, vision) |
| `Flow.generate.image`    | `models.generateContent` (gemini-2.5-flash-image)   |
| `Flow.generate.video`    | `models.generateVideos` (Veo) + poll operation      |
| `Flow.upload`            | lưu base64 vào media store trong bộ nhớ             |
| `Flow.media.select`      | mở hộp thoại chọn file của trình duyệt             |
| `Flow.download`          | tải file qua Blob + thẻ `<a download>`             |

## Lưu ý

- **Ảnh** dùng `gemini-2.5-flash-image` — hầu hết key Gemini đều dùng được.
- **Video (Veo)** bị giới hạn quyền truy cập và tốn phí; nếu key chưa có quyền
  Veo, nút video sẽ báo lỗi rõ ràng. Đổi model qua `VITE_GEMINI_VIDEO_MODEL`.
- API key nằm trong bundle trình duyệt — chỉ dùng local/nội bộ. Khi deploy
  public, hãy proxy qua backend để giấu key.
- Model name có thể đổi qua biến môi trường (xem `.env.local.example`).
