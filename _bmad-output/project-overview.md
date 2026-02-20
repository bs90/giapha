# Gia Phả - Tổng quan dự án

## Mô tả
Web quản lý gia phả (family tree) dạng canvas tương tác. Mỗi người là 1 thẻ card kéo thả trên canvas, nối quan hệ Bố/Mẹ bằng cách kéo đường nối.

## Links
- **Live**: https://bs90.github.io/giapha/
- **Repo**: https://github.com/bs90/giapha (main = source, gh-pages = build)
- **Supabase**: https://kwytxeosvksbgeqquvac.supabase.co

## Tech Stack
| Thành phần | Công nghệ |
|-----------|-----------|
| Frontend | React + Vite v5 + TypeScript |
| Canvas | `@xyflow/react` v12 (React Flow) |
| Database | Supabase (PostgreSQL + REST API, free tier) |
| Auth | Supabase Auth (RLS enabled) |
| Deploy | GitHub Pages (manual: `npm run build && npx gh-pages -d dist`) |

## Quy ước quan trọng
- **Auth**: email `trongtb90@gmail.com` hardcoded trong `PasswordGate.tsx`, user chỉ nhập password
- **UI**: dùng "Bố" (không dùng "Cha"), "Mẹ", tiếng Việt có dấu
- **Special card**: ID `b9a96ad6-6391-4d8b-8571-3261286d451f` — viền vàng, không bao giờ bị dimmed
- **Hover**: tìm các đường ngắn nhất từ thẻ hover → thẻ special, chỉ sáng đường đi
- **Env**: `.env.local` chứa `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (gitignored)
- **Deploy**: không dùng GitHub Actions, tự build + push thủ công
- **Test local trước khi deploy**: `npm run dev`

## Tài liệu liên quan
- [architecture.md](architecture.md) — Kiến trúc chi tiết
- [algorithms.md](algorithms.md) — Thuật toán highlight, cascade delete
