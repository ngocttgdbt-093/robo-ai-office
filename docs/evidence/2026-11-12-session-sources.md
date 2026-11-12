# Kiểm tra nguồn phiên thật — 12/11/2026

Chủ dự án: Nguyễn Minh Ngọc. PC chạy Work/Codex trong app ChatGPT và trình duyệt; điện thoại xem văn phòng. Chat thường ngoài phạm vi. Đây là báo cáo kiểm tra nền, chưa phải nghiệm thu tính năng.

## Bằng chứng mã nguồn và triển khai

| Nguồn | Commit đã đối chiếu | Kết quả |
| --- | --- | --- |
| GitHub `main` | `37c108ee25e8d0e67db5ff926fc2d0b1ee23cd78` | Có AGENTS.md; README vẫn mô tả foundation |
| `fix/live-office-display` | `1c475edecf4977dc790f15ed095cf020065622c9` | Runtime, D1, monitor, LED, vị trí phòng và hoạt cảnh |
| `test/codex-live-activity` | `11a30eee0a0ee5d55adb0b561356cbe5b75ceadd` | Publisher tự tạo tiến trình Codex; không chứng minh đọc phiên đã mở |
| `feature/openmausbot-status-bridge` | `5dd55b99ebd91641baaaace6c5dbe50c5313f12d` | Nguồn trạng thái GitHub riêng |
| Site thử nghiệm v26 | `cd732bf696dba023d80959196c960e478fa6632f` | Đã clone kho nguồn gắn với Sites và khớp HEAD |
| `rbai/gh-pages` | Blob index `a593a6c62d857eccfb86ceb82f80066381ecb01b` | Redirect tới site thử nghiệm |

Site: https://robo-ai-office-test.mrngochp.chatgpt.site

Sites project: `appgprj_6af120b366b48191a0eedf71c23fc83c`.
Deployment: `appgdep_6af2e7a0ce4481918a3dcd01a244342e`, API báo `succeeded`, version 26. Đây là bằng chứng triển khai, chưa phải kiểm tra giao diện hay phiên thật. Access mode báo `custom`; không suy ra rằng mọi endpoint đã cách ly chủ phiên.

Commit v26 không tìm thấy trong GitHub repo (API trả 422). Nó thuộc kho nguồn Sites riêng. Runtime v26 thêm `/api/dashboard-work`, và office.js thêm nguồn Dashboard 093. Không thay v26 bằng nhánh GitHub cũ vì có thể làm mất tích hợp hiện có. Không đọc secret hoặc gọi Dashboard/PTI trong lần kiểm tra này.

## Luồng hiện có và khoảng trống

- `scripts/codex-activity.mjs` ở nhánh thử tạo `codex exec --json --ephemeral`; nhận tên dự án bằng tham số.
- `runtime.mjs` nhận checkpoint tại `/api/work`; dữ liệu gồm task ID, seq, title, phase, status, agent, skills, project. Chưa có hội thoại, source/session/message ID hoặc phân công được xác nhận.
- GET `/api/work` chấp nhận bridge secret hoặc identity đăng nhập; truy vấn bảng work_events không lọc owner. Phải bổ sung cách ly và quyền thu hồi trước khi lưu hội thoại.
- `office.js` poll Work mỗi 3,5 giây khi trang hiện; riêng chu kỳ này đã không bảo đảm mục tiêu p95 2 giây. Monitor dùng các dòng minh họa theo phase, không phải phản hồi thật.
- `phaseZones`, `zonePositions`, `drawHandoff` có thể tái sử dụng vị trí; chuyển phase không đủ chứng minh một phân công thật. Phải dùng task/event ID, bên giao và bên nhận đã xác nhận.
- Mã có GitHub, Dashboard và Work checkpoints. Monitor hội thoại mới phải chọn nguồn phiên thật riêng và không lấy các feed này thay thế.

## Bảng hỗ trợ theo bề mặt

| Bề mặt | Kênh cần thẩm định | Quyền và điều kiện | Trạng thái hiện tại |
| --- | --- | --- | --- |
| Work trong trình duyệt PC | API được hỗ trợ nếu có; nếu thiếu, extension đọc vùng hội thoại đã cấp quyền | Quyền theo origin/tab; cần nhận diện Work rõ ràng; PC và tab hoạt động | Chưa kiểm chứng, chưa báo hỗ trợ |
| Codex trong trình duyệt PC | Kênh sự kiện được hỗ trợ hoặc adapter theo vùng hội thoại đã xác minh | Chứng minh session/project và nội dung hiển thị; không suy từ tên sản phẩm | Chưa kiểm chứng, chưa báo hỗ trợ |
| Work/Codex trong app ChatGPT PC | API được hỗ trợ hoặc accessibility nếu cung cấp nội dung đúng phạm vi | Cần xác nhận hệ điều hành, mode, cây trợ năng và điều kiện cửa sổ | Chưa hỗ trợ nguồn này trong bản hiện tại |
| Codex CLI/desktop riêng | Chỉ khảo sát thêm nếu người dùng thực sự dùng | App-server không tự chứng minh có quyền quan sát mọi phiên của ứng dụng khác | Chưa xác nhận có sử dụng; chưa kiểm chứng |
| Work/Codex trên app mobile làm nguồn | Chưa có kênh được chứng minh trong lần kiểm tra | Không lấy việc đăng nhập cùng tài khoản làm quyền đọc phiên | Chưa hỗ trợ nguồn này trong bản hiện tại |
| Điện thoại làm trình xem | Site HTTPS có xác thực | Đăng nhập đúng người có quyền; nguồn PC phải kết nối nếu dùng bridge cục bộ | Chưa kiểm tra giao diện trên điện thoại |

Không có công cụ truy cập trình duyệt của người dùng hoặc accessibility máy PC trong phiên kiểm tra này. Môi trường cloud hiện tại không phải PC của người dùng. Chưa đọc được bất kỳ phiên Work/Codex thật nào qua một kênh collector. Chưa có số đo độ trễ hoặc kết quả phiên mở sẵn/phiên mới.

Tài liệu cần tham chiếu khi thẩm định Codex: https://developers.openai.com/codex/app-server/ . Không coi app-server, Remote, GitHub hay Graphify là API đọc mọi hội thoại trong tài khoản.

## Graphify

Đã đọc AGENTS.md trên main. Scheduled baseline: run `42933226797`, main tại `41ae81978726f038570c0212f961803209a3d112`; job graphify success, verify-drive-backup skipped. Artifact metadata: ID `13817192407`, tên `graphify-robo-41ae81978726f038570c0212f961803209a3d112`, 28.847 byte, SHA-256 `47840f5326ebf3057e678afeeba41389379592fc1de8661041152cb904e1ee21`, chưa expired.

Chưa tải và kiểm chứng nội dung ZIP; chưa dùng map để kết luận phụ thuộc. Báo cáo này dùng đọc mã và so sánh trực tiếp, không sửa sản phẩm. Trước thay đổi xuyên tệp, tiếp tục quy trình tải qua GitHub/Drive và xác minh hash, coverage; nếu không có map dùng source search và báo giới hạn theo AGENTS.md.

## Kiểm tra đã chạy

| Cây mã | Lệnh | Kết quả |
| --- | --- | --- |
| GitHub fix/live-office-display, checkout sạch | `npm test` | 2 test-file subtests qua, 0 thất bại |
| Kho nguồn Sites v26, checkout sạch | `npm test` | 2 test-file subtests qua, 0 thất bại |
| Kho nguồn Sites v26 | `npm run build` | exit 0 |

Các lệnh trên không chứng minh quyền truy cập chéo, kết nối thật, hiển thị trên thiết bị, hoạt động 24/7 hoặc độ trễ. Không có thay đổi runtime được triển khai. Chưa đạt định nghĩa hoàn thành.

## Bước cần PC để mở khóa

Khi người dùng về PC: xác định hệ điều hành/trình duyệt; kết nối công cụ trình duyệt được cấp quyền trong phiên làm việc; mở một phiên Work đã có và một phiên Codex đang dùng bình thường. Chỉ đọc vùng hội thoại và metadata tối thiểu. Nếu công cụ chưa kết nối, không yêu cầu gửi cookie, token, mật khẩu hoặc dán hội thoại. App PC cần một lần thẩm định riêng; một kết quả web không nghiệm thu thay app.
