# BA Studio Chatbot

Ứng dụng phân tích nghiệp vụ gồm React + TypeScript + Vite ở `frontend`, Express ở `backend` và MySQL/MariaDB của XAMPP. Frontend chỉ gọi API Express; backend là nơi lưu dữ liệu và gọi hai webhook n8n.

## Khởi chạy

1. Cài Node.js 20+ và bật MySQL trong XAMPP.
2. Mở phpMyAdmin hoặc MySQL console, chạy `database/schema.sql`.
3. Sao chép `backend/.env.example` thành `backend/.env`; điền tài khoản MySQL và `N8N_BASE_URL`. Dùng URL `/webhook-test` khi workflow ở chế độ test; dùng `/webhook` sau khi publish.
4. Tại thư mục dự án, chạy `npm install`, `npm install --prefix backend`, `npm install --prefix frontend`; trong `backend/export-php`, chạy `composer install`. Nếu Composer báo thiếu `ext-gd`, bật `extension=gd` trong `C:\xampp\php\php.ini` rồi mở terminal mới. PHP CLI cần thấy `gd` và `zip`; đặt `PHP_BINARY` trong `backend/.env` nếu `php` chưa có trong PATH.
5. Chạy `npm run dev`. Frontend ở `http://localhost:5173`, API ở `http://localhost:3001`.

Vite dev server proxy đường dẫn `/api` tới backend tại `http://localhost:3001`. Khi deploy, reverse proxy cùng origin hoặc đặt `VITE_API_BASE_URL` thành URL backend và cấu hình CORS phù hợp. `N8N_API_KEY` chỉ cần đặt nếu webhook phía n8n đã kiểm tra header `X-API-Key`.

## Cấu trúc

```text
frontend/src/components/  # ChatWindow pieces, message list, composer, progress, requirement panel
backend/src/controllers/  # HTTP boundary / DTOs
backend/src/services/     # MySQL nghiệp vụ và n8n adapter
backend/src/routes/        # REST endpoints
database/schema.sql       # Bảng sessions, messages, requirements, reports
docs/api-contract.md      # Hợp đồng FE ↔ BE ↔ n8n
```

Tài liệu nạp theo WF01 hiện phải là TXT/MD tối đa 20 MB, chứa các khối fenced JSON có `question_id` và `question_text_vi`; backend tự bổ sung `project_id`, `document_id`, `document_name` vào metadata từng chunk. Workflow export chưa trích xuất PDF/DOCX/CSV. Báo cáo PDF/DOCX do Express tạo từ `html` và `markdown` WF02 trả về; PHP CLI cần GD (mPDF) và ZIP (PhpWord). `N8N_TIMEOUT_MS` luôn được giữ tối thiểu 90 giây. Endpoint n8n và định dạng phản hồi phải khớp workflow đang active/listen. Webhook URL hiện là public; đặt một secret header và xác minh nó trong n8n trước khi đưa lên production.

Các response fixture thật nằm trong `fixtures/`; WF02 production đã trả thành công cho hai lượt chat và nhánh report. Chạy `npm.cmd --prefix backend run test:fixtures` để kiểm tra state được giữ giữa các lượt, mã yêu cầu không trùng, request thiếu `session_id`, format file WF01 và export PDF/DOCX từ HTML thật.

## Lệnh

- `npm run dev`: chạy API và Vite.
- `npm run lint`: chạy ESLint hai phía.
- `npm run format`: định dạng mã bằng Prettier.
- `npm run build --prefix frontend`: build frontend.
