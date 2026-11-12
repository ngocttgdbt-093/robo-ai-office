# Thiết kế đề xuất: nguồn phiên thật → ROBO AI OFFICE

Trạng thái: đề xuất để kiểm chứng nguồn; chưa triển khai tính năng. Yêu cầu gốc: bàn giao 08-Văn phòng 3D của Nguyễn Minh Ngọc ngày 12/11/2026. Bằng chứng nền: [báo cáo nguồn](../../evidence/2026-11-12-session-sources.md).

## Mục tiêu và giới hạn

PC chạy Work/Codex bình thường trong trình duyệt hoặc app ChatGPT. Sau cấp quyền lần đầu, văn phòng trên điện thoại tự theo phiên đang tương tác, có snapshot của phiên mở sẵn và cập nhật phiên mới. Chỉ dựng lại hội thoại hiển thị, giữ các dòng @ nguyên gốc. Không thu menu, sidebar, lịch sử, toolbar, credential, suy luận ẩn hay Chat thường. Không gửi lệnh hoặc duyệt ngược.

Mỗi nguồn chỉ được báo hỗ trợ khi qua cả bài phiên mở sẵn và phiên mới với dữ liệu thật. Nếu không có nguồn đã được cấp quyền thì hiển thị chưa kết nối, không dựng hoạt động giả.

## Phương án

1. API/SDK hoặc kênh sự kiện được hỗ trợ của phiên đích: ưu tiên khi chứng minh được quyền và phạm vi. Chưa có bằng chứng kênh đọc chung toàn tài khoản.
2. Bridge phía PC: đề xuất cho web khi API không đủ; extension theo origin được phép, adapter có xác minh Work/Codex và vùng hội thoại. App PC khảo sát accessibility riêng. Cần PC/nguồn hoạt động, phụ thuộc thay đổi giao diện.
3. Script tự tạo phiên: giữ như công cụ test đường truyền hiện có; không đáp ứng yêu cầu phiên bình thường đã mở, không dùng thay nguồn.

Đề xuất thực hiện 1 khi khả dụng, dùng 2 cho từng bề mặt đã chứng minh. Người dùng đã xác nhận bề mặt sử dụng; chưa có bằng chứng nghiệm thu để chốt adapter cụ thể.

## Nền tích hợp

Giữ runtime và vị trí phòng hiện có. V26 có tích hợp Dashboard mà nhánh GitHub chưa có: đối chiếu và đưa thay đổi cần thiết vào nhánh tích hợp trước, không ghi đè site. Giữ feed GitHub/Dashboard riêng với monitor phiên thật. Merge và deploy cần phê duyệt rõ ràng theo AGENTS.md.

## Hợp đồng dữ liệu đề xuất

Collector → runtime qua HTTPS, credential có phạm vi và thu hồi được; viewer → runtime qua phiên đăng nhập. Owner lấy từ quyền đã xác thực phía server, không tin owner trong payload. Định danh bản ghi theo `(owner, source, sessionId)`.

Event v1: `source`, `sessionId`, `eventId`, `seq`, `emittedAt`, `type`; trường theo loại: `messageId`, `role`, `text`, `project`, `agentId`, `taskId`, `from`, `to`, `status`. Whitelist trường, giới hạn kích thước; không lưu payload tùy ý hoặc log hội thoại/credential. Source app/mobile/CLI là các adapter riêng, không chỉ một nhãn do client tự khai.

Các loại: session snapshot/metadata, message upsert/delta, user interaction/focus, confirmed assignment, task status, heartbeat. Delta chỉ nối theo messageId trong cùng session. Snapshot có watermark; sự kiện đến muộn dưới watermark không ghi đè snapshot. Chống lặp theo eventId và thứ tự theo session. Gap yêu cầu resync. Snapshot không phát lại mũi tên cũ.

Đề xuất endpoint mới `/api/session-events`, `/api/session-snapshot`, `/api/session-stream`, và endpoint pairing/revoke riêng; giữ hợp đồng `/api/work` cũ cho checkpoint đến khi di trú được kiểm chứng. D1 lưu session/message/task/event cursor có owner và chỉ mục tương ứng. SSE gửi snapshot/cursor và các cập nhật; cần kiểm chứng giới hạn Worker trước khi chốt cơ chế. Heartbeat quá hạn chuyển mất kết nối và dừng hoạt cảnh chạy.

## Chọn phiên và render

Ưu tiên phiên ghim còn quyền, sau đó focus được xác minh, rồi user interaction gần nhất. Không chọn theo heartbeat hay token assistant. Đổi monitor/LED từ cùng một snapshot nguyên tử; luôn ghi nguồn hiện tại. Project lấy metadata xác minh hoặc ánh xạ repo/thư mục cấu hình; thiếu thì “Chưa xác định dự án”.

Render bằng textContent/DOM an toàn, không innerHTML từ nguồn. Các @ trong lời nói, trích dẫn hoặc code được hiển thị nhưng không tạo task. Chỉ confirmed assignment từ runtime có task ID, bên giao/bên nhận và event ID mới tạo luồng. Dùng điểm neo phòng hiện có, vẽ dưới lớp bàn/nhân vật. Một event ID chỉ phát hoạt cảnh một lần; reconnect không phát lại.

Trạng thái: running/xanh, waiting/vàng, approval_required/tím, failed/đỏ, completed/xanh lá, disconnected/xám. Monitor bàn gõ chỉ khi agent có ít nhất một task running thuộc phiên đang theo dõi và nguồn còn kết nối. Hoàn thành một task không dừng agent nếu vẫn còn task running khác. Snapshot cuối cùng được giữ nhưng ghi rõ mất kết nối.

## Quyền và nghiệm thu

Kiểm tra quyền ở cả snapshot, stream, event, pairing và revoke; bridge không được trở thành credential đọc mọi phiên. Không nhận identity header trực tiếp ngoài trusted ingress. Không đưa token vào URL, localStorage trình xem, log hoặc Git. Pairing có thời hạn và xác nhận người dùng; revoke cắt cả kết nối đang mở. Endpoint cũ không được lộ dữ liệu mới.

Chạy riêng cho từng bề mặt: mở sẵn, phiên mới, hai dự án, phân công A→B→C, @ trong code, nhiều task cùng agent, completed/failed/approval, mất mạng/reload/reconnect, Chat thường, sidebar/menu, anonymous/cross-owner/cross-session và revoke. Thu timestamps nguồn nhận diện được và thời điểm render; p95 ≤ 2 giây là mục tiêu, báo số đo và điều kiện thật, không suy ra từ test mô phỏng.

## Điều kiện còn thiếu

Chưa quan sát DOM/accessibility của PC; chưa xác minh mode, project metadata, assignment signal, focus, partial updates hoặc lịch sử virtualized. Adapter phải ngừng thu khi nhận diện không chắc chắn. Không đoán selector và không coi việc xuất hiện chữ Codex trong nội dung là nhận diện mode. Chưa có số đo nguồn thật, kiểm thử viewer trên điện thoại hoặc minh chứng truy cập chéo. Các phần này là điều kiện đầu vào trước triển khai UI hội thoại.
