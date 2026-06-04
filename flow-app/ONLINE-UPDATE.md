# App online + tự cập nhật (Thin shell + GitHub Pages)

Mô hình: **app SPA chạy trên GitHub Pages**, file `.exe` chỉ là cửa sổ desktop
tải URL đó. Bạn cập nhật bằng `git push` → GitHub Actions tự build & deploy →
**người dùng nhận bản mới ở lần mở app kế tiếp** (không cần gửi lại .exe).

```
  bạn sửa code ──► git push ──► GitHub Actions ──► GitHub Pages (URL cố định)
                                                          ▲
                                  MockupAI.exe (thin shell) tải URL này mỗi lần mở
```

## Cài đặt 1 lần

### 1. Tạo GitHub repo và push code
```bash
cd "f:\Vani Ecom\Claude"
git init
git add .
git commit -m "Mockup AI"
git branch -M main
git remote add origin https://github.com/Anh-4/GenmockupAI.git
git push -u origin main
```

### 2. Bật GitHub Pages
Repo → **Settings → Pages → Build and deployment → Source = GitHub Actions**.
Workflow [.github/workflows/deploy-pages.yml](../.github/workflows/deploy-pages.yml)
sẽ tự chạy khi push. URL của bạn là:

```
https://anh-4.github.io/GenmockupAI/
```

### 3. File .exe đã trỏ sẵn vào URL đó
`APP_URL` trong [electron/main.cjs](electron/main.cjs) đã đặt =
`https://anh-4.github.io/GenmockupAI/`, và .exe đã build sẵn ở
`release/MockupAI-1.0.0-portable.exe`. Gửi file này cho mọi người **một lần**.

> Chỉ cần build lại .exe (`npm run dist:win`) nếu sau này bạn đổi `APP_URL` hoặc
> logic trong `electron/main.cjs`. Đổi giao diện/tính năng (trong `src/`) thì
> chỉ cần `git push`.

## Vòng cập nhật về sau (việc bạn làm mỗi lần update)
```bash
# sửa code trong flow-app/ ...
git add . && git commit -m "cập nhật X" && git push
```
Xong. Actions build + deploy ~1–2 phút. Người dùng mở app lần sau là thấy bản
mới — **không cần cài lại .exe**.

> Asset của Vite có hash theo nội dung nên không lo cache cũ. Nếu muốn chắc,
> bảo người dùng đóng app rồi mở lại.

## Ghi chú
- **API key**: vẫn do mỗi người tự nhập (popup), lưu cục bộ. Không nhúng vào
  build, không lên Pages.
- **Offline**: nếu mất mạng hoặc Pages lỗi, app tự dùng bản nhúng sẵn trong .exe
  (có thể cũ hơn bản online một chút).
- **Đổi bản .exe**: chỉ cần build lại .exe khi đổi `APP_URL`, icon, hoặc logic
  trong `electron/main.cjs`. Còn đổi giao diện/tính năng (trong `src/`) thì chỉ
  cần push — không build lại .exe.
- **base URL**: Vite đang dùng `base: './'` nên chạy đúng cả trên Pages
  (`/<REPO>/`) lẫn file:// (fallback). Không cần chỉnh.
