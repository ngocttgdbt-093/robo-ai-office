# Authorized Session Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hiển thị phiên Work/Codex thật từ PC lên văn phòng xem trên điện thoại sau cấp quyền một lần.

**Architecture:** Chứng minh từng adapter trước; collector tách khỏi runtime và render. Runtime xác thực, cách ly owner/source/session, giữ snapshot và cursor; monitor/LED/agent cùng dùng phiên đã chọn.

**Tech Stack:** JavaScript ESM, Node 24 kiểm thử, SQLite/D1, Sites Worker; bridge trình duyệt nếu chứng minh được bề mặt.

**Spec:** [Thiết kế đề xuất](../specs/2026-11-12-authorized-session-bridge-design.md).

## Global Constraints

- Không tuyên bố hỗ trợ khi chưa qua phiên thật mở sẵn và phiên mới.
- Work và Codex nghiệm thu riêng; web và app PC nghiệm thu riêng.
- Chat thường ngoài phạm vi; không thu ngoài khung hội thoại và metadata cần thiết.
- Không ghi token, cookie, mật khẩu hoặc nội dung riêng tư vào Git/log/URL.
- Một chiều; không điều khiển hay duyệt ngược vào phiên.
- Không merge hoặc deploy khi chưa được phê duyệt theo AGENTS.md.
- Mục tiêu p95 ≤ 2 giây, phải đo riêng theo nguồn.

## Review Focus

- Phiên đã mở/virtualized không được báo đủ snapshot khi thiếu tin nhắn.
- Mất tín hiệu mode phải dừng thu thay vì thu Chat thường.
- Identity/source/session do client khai không được vượt phạm vi quyền pairing.
- Reconnect/snapshot không phát lại assignment và không nối delta sang phiên khác.
- Nhiều task cùng agent chỉ ngừng gõ khi hết task running hoặc nguồn mất kết nối.

## Task 1: Xác định nền và đối chiếu nguồn đang phục vụ

Files: `docs/evidence/2026-11-12-session-sources.md`.

Consumes: metadata GitHub/Sites được cấp quyền, mã ở commit cụ thể. Produces: baseline xác minh được, nguồn nào chưa có bằng chứng được ghi rõ.

- [x] Đọc AGENTS.md, đối chiếu bốn nhánh và redirect.
- [x] Đối chiếu deployment v26 với HEAD kho nguồn Sites riêng.
- [x] So sánh runtime/office.js, ghi nhận Dashboard source cần bảo toàn.
- [x] Chạy `npm test` trên nhánh giao diện và mã nguồn v26; chạy `npm run build` trên v26.
- [x] Lập bảng bề mặt người dùng thực sự sử dụng và khoảng trống quyền.
- [ ] Trước thay đổi sản phẩm: tải/kiểm chứng Graphify qua GitHub hoặc Drive, xác định coverage và ghi giới hạn.

## Task 2: Chứng minh một nguồn web trên PC — cần kết nối máy người dùng

Files: bổ sung bằng chứng đã lược bỏ nội dung riêng tư trong tài liệu Task 1. Chưa chốt file adapter trước khi quan sát bề mặt.

Consumes: phiên Work đã mở và phiên Codex dùng bình thường, công cụ trình duyệt được cấp quyền. Produces: hợp đồng adapter đã kiểm chứng, hoặc kết luận chưa hỗ trợ có bằng chứng.

- [ ] Xác định OS/trình duyệt; thiết lập kết nối được cấp quyền, không yêu cầu credential trong chat.
- [ ] Chứng minh nhận diện mode/source/session/project từ bề mặt hoặc API; ghi trường thiếu. Lấy một snapshot khung hội thoại; xác nhận không có menu/sidebar/toolbar.
- [ ] Quan sát một tương tác mới, phản hồi đang chạy và dòng @; ghi có/không có partial event, focus, agent assignment. Không tự tạo assignment từ văn bản.
- [ ] Lặp với phiên mới và hai dự án; xác minh ID phiên không trộn, user interaction chọn đúng phiên.
- [ ] Kiểm tra Chat thường, mất mode, lịch sử virtualized; thiếu dữ liệu phải báo thiếu, không tự dựng lại.
- [ ] Ghi giới hạn PC/tab hoạt động; không công bố cloud độc lập.

## Task 3: Chốt thiết kế adapter và quyền từ bằng chứng Task 2

Files: thiết kế trong spec, sau đó mới xác định file sản phẩm và kiểm thử chính xác.

Consumes: hợp đồng nguồn thật của Task 2. Produces: thiết kế triển khai không dựa trên selector/API phỏng đoán; quyết định nền tích hợp v26 được bảo toàn.

- [ ] Cập nhật spec với source IDs, message semantics, mode/project/focus rules đã chứng minh.
- [ ] Chốt pairing/revoke và trusted ingress, giới hạn lưu dữ liệu, thời hạn heartbeat, SSE/resync phù hợp Worker.
- [ ] Kiểm tra cách ly owner ở mọi truy vấn; không dùng bridge secret chung làm quyền đọc hội thoại.
- [ ] Chốt file và test cases bằng giao diện thật; review trước sửa mã.

## Task 4: Runtime có xác thực và đồng bộ snapshot/delta

Chỉ bắt đầu khi Task 2–3 đạt. Các đường dẫn `/api/session-events`, `/api/session-snapshot`, `/api/session-stream` là đề xuất trong spec, chưa phải API hiện có.

- [ ] Viết test đỏ cho anonymous, cross-owner/source/session và revoked credential; chạy và quan sát thất bại đúng nguyên nhân.
- [ ] Thêm migration có owner/source/session, validate whitelist, dedupe/event order và quyền có phạm vi; không đổi hợp đồng checkpoint cũ ngoài phần được review.
- [ ] Viết test đỏ snapshot watermark, gap/resync, late packet, reconnect, message delta và text mang HTML; triển khai tối thiểu rồi chạy xanh.
- [ ] Kiểm tra stream đang mở bị cắt khi revoke; không trả credential/nội dung trong lỗi hoặc log.
- [ ] Chạy bộ test toàn repo, build và review diff. Chưa deploy.

## Task 5: Monitor/LED/agent cùng phiên và viewer điện thoại

- [ ] Viết test đỏ đổi phiên nguyên tử, pin/focus/interaction, tên dự án thiếu, cùng message ID ở hai phiên.
- [ ] Tích hợp snapshot/stream theo Task 4, dựng hội thoại bằng DOM an toàn; tách GitHub/Dashboard khỏi nguồn monitor phiên thật.
- [ ] Viết test đỏ confirmed A→B→C, duplicate ID, @ trong code, nhiều task cùng agent và replay snapshot.
- [ ] Nối điểm neo phòng, mũi tên và hoạt cảnh theo confirmed assignment/status; mất heartbeat dừng gõ, không xóa snapshot cuối.
- [ ] Chạy kiểm thử trạng thái, viewport điện thoại và accessibility; kiểm tra nguồn/LED luôn cùng session.

## Task 6: Mở rộng app PC và nghiệm thu riêng từng nguồn

- [ ] Chỉ thử accessibility app PC khi có kết nối được cấp quyền và cây nội dung đủ mode/session/conversation. Thiếu kênh ghi “Chưa hỗ trợ nguồn này”.
- [ ] Chạy toàn bộ kịch bản trong spec với phiên mở sẵn/phiên mới cho từng nguồn; không dùng publisher tự tạo phiên thay thế.
- [ ] Đo emission→render, báo cỡ mẫu/điều kiện/p95 riêng; không báo con số mô phỏng thành độ trễ thật.
- [ ] Mở PR tính năng với commit, CI, minh chứng lược bỏ nội dung, thiết lập một lần và giới hạn PC/cloud.
- [ ] Chuẩn bị bản được review và xin phê duyệt merge/deploy theo AGENTS.md; giữ `/rbai/` sau khi được duyệt.

## Trạng thái bàn giao hiện tại

Task 1 đã có bằng chứng nền; Task 2 chưa chạy do chưa kết nối PC người dùng. Task 3–6 chưa thực hiện. PR tài liệu không phải PR tính năng hoàn chỉnh. Không có nguồn nào được báo hỗ trợ và không có thay đổi runtime/collector/UI được triển khai.
