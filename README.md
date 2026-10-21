# Quỷ Môn Quan

Game nhập vai 2D màn hình ngang (kiểu Ghost Online / MapleStory), bối cảnh kiếm hiệp ma quái châu Á.
Một người chơi, thế giới có bot giả làm người chơi khác (đi săn, ngồi nghỉ, chat, trả lời khi bạn chat).

- 3 môn phái: **Kiếm Khách** (cận chiến), **Đạo Sĩ** (bùa chú), **Thích Khách** (phi tiêu)
- 4 kỹ năng mỗi phái, nâng cấp bằng điểm kỹ năng
- 10 bản đồ, mỗi vùng có phông nền và thời tiết riêng (tuyết rơi, đom đóm, tàn lửa…):
  Làng Trúc Lâm → Rừng Ma Trơi → Cánh Đồng Hoang (→ nhánh Đầm Lầy Sương Mù) → Nghĩa Địa Cổ → Quỷ Môn Quan (boss)
  → Tuyết Sơn → Huyền Băng Động → Hỏa Diệm Sơn → Kỳ Lân Đài (boss)
- 14 loại quái + 2 boss (Hắc Quỷ Vương, Hỏa Kỳ Lân), trang bị rơi ra có độ hiếm và chỉ số ngẫu nhiên
- **Nguyên tố Hỏa / Băng / Lôi / Độc**: quái có điểm yếu và kháng riêng, trang bị cho kháng, khảm ngọc nguyên tố vào vũ khí
- **Cường hóa trang bị +1 → +10** ở Thợ Rèn (Đá Cường Hóa + ngân lượng, có tỉ lệ thất bại, Bùa Bảo Hộ chống tụt cấp)
- **Cốt truyện "Huyền Môn Phong Ấn"** 2 chương, 12 nhiệm vụ có hội thoại kèm chân dung nhân vật; NPC có dấu ! / ? trên đầu
- 34 nhiệm vụ: cốt truyện, chuỗi phụ ở từng vùng, 4 nhiệm vụ hằng ngày ở Bảng Truy Nã, quà mỗi ngày của Tiểu Lan; phần thưởng gồm đá cường hóa, ngọc, trang bị kháng, danh hiệu
- Cửa hàng mua bán, cộng điểm tiềm năng, danh hiệu hiện trên đầu nhân vật
- Pet **Tiểu Quỷ** bay theo và tự nhặt đồ rơi trong tầm, kể cả trên bục cao (nhận qua nhiệm vụ tân thủ ở Trưởng Làng)
- Nhảy đôi, giữ phím nhảy để nhảy cao hơn
- Nhân vật chibi đầu to mắt to, toàn bộ hình ảnh tự vẽ bằng code (không dùng hình của game nào khác)
- **Không dùng thư viện ngoài nào**: engine game viết bằng JavaScript thuần (canvas), server dùng `node:http` và `node:sqlite` có sẵn trong Node

## Bắt đầu nhanh trên Windows

**Bước 1. Cài Node.js** (chỉ làm một lần)

Vào https://nodejs.org, tải bản **LTS** (22 hoặc 24) rồi cài như phần mềm bình thường, cứ bấm Next.
Mở **PowerShell** hoặc **Terminal** mới và gõ:

```powershell
node -v
```

Ra `v22.13.0` trở lên là được.

**Bước 2. Mở terminal trong thư mục game**

Cách dễ nhất: mở thư mục `H:\Projects\quy-mon-quan` bằng **VS Code**, rồi bấm `` Ctrl + ` `` để mở terminal.
Hoặc trong PowerShell gõ:

```powershell
cd H:\Projects\quy-mon-quan
```

**Bước 3. Chạy game**

```powershell
npm run dev
```

Thấy dòng `Quỷ Môn Quan đang chạy: http://localhost:3000` thì mở trình duyệt vào địa chỉ đó.
Lần đầu bấm "Tạo tài khoản", đặt tên, tạo nhân vật rồi chơi.
Muốn tắt server: bấm `Ctrl + C` trong terminal.

Dòng `ExperimentalWarning: SQLite is an experimental feature` là cảnh báo bình thường của Node, không phải lỗi.

**Bước 4. Sửa game**

- Sửa file trong `client/src/` → lưu → **F5** trên trình duyệt là thấy.
- Sửa file trong `server/src/` → server tự khởi động lại.

**Bước 5. Build bản chính thức**

```powershell
npm run build
npm start
```

`npm run build` tạo ra `client/dist/index.html` (1 file chứa cả game).
`npm start` chạy server dùng bản đã build. Đây cũng là lệnh mà các dịch vụ hosting sẽ chạy.

## Yêu cầu

- **Node.js 22.13 trở lên** (để có `node:sqlite`). Kiểm tra: `node -v`
- Không cần `npm install`.

## Chạy trên máy

```bash
npm run dev      # chế độ phát triển: chạy thẳng mã nguồn client/src, sửa code rồi F5 là thấy
```

Mở http://localhost:3000, tạo tài khoản, tạo nhân vật và chơi.
Dữ liệu được lưu trong file `data/game.db` (SQLite).

Chế độ dev tự khởi động lại server khi bạn sửa file trong `server/src` (dùng `node --watch`).
Với code client, chỉ cần tải lại trang.

## Build

```bash
npm run build    # gộp toàn bộ client thành 1 file: client/dist/index.html
npm start        # chạy server ở chế độ production (phục vụ bản đã build)
```

`tools/build.mjs` là một "bundler" nhỏ tự viết. Nó lần theo các `import` từ `client/src/main.js`,
ghép các module theo đúng thứ tự, rồi nhúng JS + CSS vào một file HTML duy nhất.
Vì gộp chung phạm vi, hai module không được khai báo trùng tên ở cấp cao nhất; build sẽ báo lỗi nếu có.

`client/dist/index.html` cũng chạy được khi mở trực tiếp bằng trình duyệt (không có server).
Khi đó game tự lưu vào trình duyệt (localStorage).

## Game tự chọn nơi lưu dữ liệu

`client/src/storage/storage.js` thử lần lượt:

| Tình huống | Nơi lưu | Đăng nhập |
|---|---|---|
| Có server (`npm start`) | SQLite qua REST API | Có (tài khoản + mật khẩu) |
| Chạy trong link Claude | Database của artifact (theo tài khoản Claude) | Không cần |
| Mở file HTML trực tiếp | localStorage của trình duyệt | Không cần |

## Deploy lên mạng

Server là một tiến trình Node bình thường, nghe cổng `PORT` và lưu database vào thư mục `DATA_DIR`.
**SQLite cần ổ đĩa không bị xoá** khi deploy lại, nên hãy chọn nơi có volume/persistent disk.

### Cách 1: VPS (DigitalOcean, Vultr, máy chủ riêng…)

```bash
git clone <repo của bạn> quy-mon-quan && cd quy-mon-quan
npm run build
cp .env.example .env
# sửa .env: NODE_ENV=production, DATA_DIR=/var/lib/quymonquan, TOKEN_SECRET=<chuỗi ngẫu nhiên>, TRUST_PROXY=true nếu có Nginx/Caddy phía trước
node server/src/index.js
```

Để server chạy nền và tự bật lại khi máy khởi động, dùng pm2:

```bash
npm i -g pm2
pm2 start server/src/index.js --name quymonquan
pm2 save && pm2 startup
```

Muốn có tên miền + HTTPS thì đặt Nginx hoặc Caddy phía trước, trỏ về `localhost:3000`.

### Cách 2: Docker

```bash
docker build -t quymonquan .
docker run -d -p 3000:3000 -v quymonquan-data:/data -e TOKEN_SECRET=<chuỗi-ngẫu-nhiên-64-ký-tự> --name quymonquan quymonquan
```

Image chạy ở chế độ production nên bắt buộc truyền `TOKEN_SECRET`. Không dùng `--env-file .env` của bản dev vì nó sẽ ghi đè `DATA_DIR` và `NODE_ENV`.

### Cách 3: Railway (dễ nhất nếu mới làm lần đầu)

**3a. Đưa code lên GitHub**

1. Tạo tài khoản ở https://github.com, bấm **New repository**, đặt tên `quy-mon-quan`, để **Private**, bấm Create.
2. Cài Git cho Windows ở https://git-scm.com (cứ Next).
3. Trong terminal ở thư mục game:

```powershell
git init
git add .
git commit -m "Quỷ Môn Quan bản đầu tiên"
git branch -M main
git remote add origin https://github.com/<tên-của-bạn>/quy-mon-quan.git
git push -u origin main
```

Lần đầu push, Git sẽ mở cửa sổ đăng nhập GitHub, bạn đăng nhập là xong.
File `.gitignore` đã loại sẵn `data/` (database) và `client/dist/`, nên không đẩy nhầm dữ liệu lên.

**3b. Deploy lên Railway**

1. Vào https://railway.com, đăng nhập bằng GitHub.
2. **New Project → Deploy from GitHub repo** → chọn `quy-mon-quan`. Railway tự thấy `Dockerfile` và build.
3. Mở service vừa tạo → **Settings → Volumes → Add Volume**, Mount path: `/data`.
   Bước này bắt buộc. Không có volume thì mỗi lần deploy lại sẽ mất hết tài khoản và nhân vật.
4. Tab **Variables**: thêm `NODE_ENV=production`, `TRUST_PROXY=true` và `TOKEN_SECRET` = chuỗi ngẫu nhiên ít nhất 32 ký tự (tạo bằng lệnh ở mục Biến môi trường).
   `DATA_DIR=/data` và `PORT` đã có sẵn trong Dockerfile, Railway tự gán cổng.
5. **Settings → Networking → Generate Domain**. Bạn sẽ có link dạng `quy-mon-quan-production.up.railway.app`.

Sau này mỗi lần sửa game, chỉ cần:

```powershell
git add .
git commit -m "mô tả thay đổi"
git push
```

Railway sẽ tự build và deploy lại, dữ liệu trong volume vẫn giữ nguyên.

### Cách 3 (khác): Render / Fly.io

Làm tương tự Railway: tạo dịch vụ từ repo GitHub, nền tảng tự nhận `Dockerfile`.
Nếu không dùng Docker: Build command `npm run build`, Start command `npm start`.
Gắn **Persistent Disk** vào `/data`, đặt `DATA_DIR=/data`, `NODE_ENV=production`, `TRUST_PROXY=true` và `TOKEN_SECRET`.
Lưu ý: gói miễn phí của Render không có ổ đĩa lưu trữ, nên dữ liệu sẽ mất mỗi khi deploy lại.

### Cách 4: Chỉ host file tĩnh (không có backend)

Upload riêng `client/dist/index.html` lên GitHub Pages, Netlify hoặc Vercel.
Game vẫn chơi được, dữ liệu lưu trong trình duyệt của người chơi.

## Biến môi trường (.env)

Copy file mẫu rồi sửa:

```bash
cp .env.example .env        # Windows: copy .env.example .env
```

Server tự đọc `.env` khi khởi động (dùng `process.loadEnvFile` có sẵn của Node, không cần thư viện dotenv). Biến đặt thật trên Railway/Docker luôn được ưu tiên hơn `.env`.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `NODE_ENV` | `development` | `production` thì bắt buộc có `TOKEN_SECRET` ≥ 32 ký tự, thiếu là server không chạy |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | Cổng và địa chỉ lắng nghe |
| `DATA_DIR` | `./data` | Thư mục chứa `game.db` |
| `TOKEN_SECRET` | tự tạo khi dev | Khoá ký token đăng nhập. Tạo: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `TOKEN_DAYS` | `30` | Token hết hạn sau bao nhiêu ngày |
| `ALLOW_REGISTER` | `true` | `false` = khoá đăng ký tài khoản mới (chỉ mình bạn chơi) |
| `MAX_CHARS_PER_USER` | `6` | Số nhân vật mỗi tài khoản |
| `LOGIN_LIMIT_PER_MIN` | `10` | Số lần đăng nhập/đăng ký tối đa mỗi phút mỗi IP |
| `API_LIMIT_PER_MIN` | `240` | Số request API tối đa mỗi phút mỗi IP |
| `TRUST_PROXY` | `false` | Bật khi chạy sau proxy (Railway, Render, Nginx) để giới hạn theo đúng IP người chơi |
| `CORS_ORIGIN` | trống | Chỉ điền khi trang game và API ở hai địa chỉ khác nhau |

## Bảo mật và đưa lên GitHub

**Những thứ không bao giờ lên git** (đã có trong `.gitignore`): `.env`, thư mục `data/` (database người chơi và `secret.key`), mọi file `*.db`, `*.key`, `*.pem`. Chỉ `.env.example` được commit.

**Trước khi push lần đầu:**

```bash
git init
npm run hooks      # cài pre-commit: mỗi lần commit tự quét bí mật
npm run check      # quét thử ngay
git add .
git status         # kiểm tra lại: không được thấy .env hay data/
git commit -m "Quỷ Môn Quan"
```

`npm run check` (`tools/check-secrets.mjs`) chặn: file `.env`, database, khoá, và nội dung trông như token GitHub/AWS/Google/OpenAI, private key, biến `SECRET=`/`PASSWORD=` có giá trị. GitHub Actions (`.github/workflows/ci.yml`) cũng chạy lại bước này, build client và khởi động thử server mỗi lần push.

**Nếu lỡ đẩy bí mật lên:** xoá khỏi commit vẫn chưa đủ vì lịch sử git còn giữ. Hãy đổi `TOKEN_SECRET` mới ngay (mọi người chỉ phải đăng nhập lại), rồi mới dọn lịch sử.

**Server đã có sẵn:**

- Mật khẩu băm bằng scrypt có salt, so sánh chống timing attack. Token ký HMAC-SHA256, có hạn dùng.
- Giới hạn đăng nhập/đăng ký và tổng số request theo IP.
- Header bảo mật: Content-Security-Policy (không cho tải script từ trang khác), nosniff, chống nhúng iframe lạ, HSTS khi production.
- Chỉ nhận JSON, giới hạn 256 KB mỗi request, hết thời gian chờ để chống giữ kết nối treo.
- File tĩnh: chặn `../` và mọi file ẩn (`.env`, `.git`…).
- Kiểm tra dữ liệu lưu: chặn cấp > 50, ngân lượng âm hoặc quá lớn, điểm tiềm năng và điểm kỹ năng vượt mức có thể có, vật phẩm vô lý. Mỗi tài khoản chỉ sửa được nhân vật của chính mình.
- Docker chạy bằng user thường, không phải root.

**Giới hạn cần biết:**

- Code client (thư mục `client/`) luôn xem được trong trình duyệt, kể cả khi repo để private. Đừng bao giờ đặt bí mật trong code client.
- Game tính toán ở trình duyệt rồi gửi kết quả lên, nên server chỉ chặn được số liệu vô lý chứ không chống gian lận hoàn toàn. Với game một người chơi thì đủ dùng.
- Công cụ thử nghiệm `__game()` chỉ bật khi chạy ở `localhost`/file trên máy, hoặc khi thêm `?debug` vào địa chỉ.
- Muốn giấu mã nguồn thì để repo ở chế độ **Private** trên GitHub. Nếu để Public, nên thêm file LICENSE để nói rõ người khác được dùng code thế nào.

## Cấu trúc thư mục

```
client/
  index.html            trang dev (nạp src/main.js dạng ES module)
  src/
    main.js             khởi động, vòng lặp game, nối UI với thế giới game
    engine/             input bàn phím/cảm ứng, hàm tiện ích
    data/               DỮ LIỆU GAME: môn phái, kỹ năng, đồ, quái, bản đồ, NPC, nhiệm vụ, bot
      story.js          cốt truyện chính, nhiệm vụ hướng dẫn, cảnh có lựa chọn
      chatter.js        thoại thường ngày của NPC, NPC nói chuyện với nhau
      affixes.js        đặc tính quái, bậc trí khôn, quái Tinh Anh, boss truyện và boss dã ngoại
    gfx/
      draw.js           công cụ vẽ: canvas độ phân giải cao, viền, đổ bóng, gradient
      humanoid.js       nhân vật chibi (tóc, mắt, áo, mũ, vũ khí, 14 khung hình)
      monsters.js       6 loại quái + boss
      icons.js          icon vật phẩm và hình đạn
      backgrounds.js    phông nền nhiều lớp của từng bản đồ
    game/
      character.js      chỉ số, EXP, túi đồ, trang bị, trạng thái nhiệm vụ
      entities.js       vật lý (trọng lực, bục một chiều), người chơi, quái, đạn
      world.js          logic chính: chiến đấu, AI quái, boss, đồ rơi, vẽ khung hình
      bots.js           AI bot giả người chơi + chat
      chatter.js        chọn câu thoại NPC theo ngữ cảnh, không lặp
    ui/                 HUD, cửa sổ túi đồ/kỹ năng/nhiệm vụ/cửa hàng, màn hình đăng nhập
    storage/            3 cách lưu dữ liệu (API / Claude / trình duyệt)
    style.css
server/src/
  index.js              HTTP server, định tuyến API, phục vụ file tĩnh
  db.js                 schema SQLite + đọc/ghi nhân vật
  auth.js               băm mật khẩu (scrypt), token đăng nhập (HMAC)
tools/build.mjs         đóng gói client thành 1 file HTML
```

## Database

4 bảng (xem `server/src/db.js`):

- `users`: tài khoản, mật khẩu đã băm
- `characters`: chỉ số, cấp, vàng, vị trí, kỹ năng (JSON), pet, danh hiệu, `flags` (JSON: lựa chọn trong cốt truyện)
- `items`: mỗi món đồ một dòng, `equip_slot` khác NULL nghĩa là đang mặc; `enhance` là cấp cường hóa, `el` là nguyên tố đã khảm, `gems` (JSON) là ngọc đã ép
- `quests`: tiến độ từng nhiệm vụ, `day` là ngày hoàn thành (cho nhiệm vụ hằng ngày)

Khi thêm cột mới (ví dụ cột `pet`), hàm `migrate()` trong `db.js` tự `ALTER TABLE` cho database cũ lúc server khởi động, nên dữ liệu cũ không bị mất.

Muốn xem dữ liệu: mở `data/game.db` bằng [DB Browser for SQLite](https://sqlitebrowser.org/).

## API

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/health` | Kiểm tra server |
| POST | `/api/auth/register` | `{username, password}` → `{token}` |
| POST | `/api/auth/login` | `{username, password}` → `{token}` |
| GET | `/api/characters` | Danh sách nhân vật (cần token) |
| POST | `/api/characters` | Tạo nhân vật `{character}` |
| PUT | `/api/characters/:id` | Lưu tiến trình `{character}` |
| DELETE | `/api/characters/:id` | Xoá nhân vật |
| GET | `/api/leaderboard` | Top 10 cấp cao nhất |

Gửi token qua header `Authorization: Bearer <token>`.

## Tự mở rộng game

Hầu hết nội dung nằm trong `client/src/data/`, chỉ cần sửa dữ liệu:

- **Thêm quái**: thêm vào `data/monsters.js`, vẽ hình trong `gfx/monsters.js` (thêm hàm vẽ vào `MAKERS`), rồi đặt vào `spawns` của một bản đồ.
- **Thêm bản đồ**: thêm vào `maps.js` (bục, cổng, điểm sinh quái, NPC), chọn `theme` có sẵn (`village`, `forest`, `field`, `graveyard`, `hell`, `swamp`, `snow`, `icecave`, `volcano`, `temple`) hoặc thêm theme mới trong `gfx/backgrounds.js`. Nhớ thêm cổng nối hai chiều. Thời tiết của theme nằm trong `updateWeather` (`game/world.js`).
- **Thêm boss**: khai báo `behavior: 'boss'`, `proj` (loại đạn), `summon` (quái triệu hồi) và `lines` (câu thoại) trong `data/monsters.js`.
- **Thêm đồ**: thêm vào `items.js`, rồi cho vào bảng rơi đồ của quái hoặc cửa hàng NPC trong `npcs.js`.
- **Thêm nhiệm vụ**: thêm vào `QUESTS` trong `npcs.js` (nhiệm vụ phụ) hoặc `story.js` (cốt truyện, hướng dẫn) và ghi id vào danh sách `quests` của NPC.
- **Thêm thoại NPC**: thêm câu vào `data/chatter.js`. Câu có điều kiện viết `['lời thoại', { a: 'st7' }]` (chỉ nói sau khi xong st7).
- **Cân bằng game**: công thức chỉ số ở `calcStats`, EXP ở `expToNext` (`game/character.js`), sát thương ở `damageMonster` (`game/world.js`).

Khi thử nghiệm, mở DevTools (F12) và gõ:

```js
__game().giveExp(5000)          // cộng EXP
__game().ch.gold += 10000       // thêm vàng
__game().loadMap('quymon', 200) // dịch chuyển tới boss
```

## Điều khiển

| Phím | Tác dụng |
|---|---|
| ← → | Di chuyển |
| Space / X | Nhảy (giữ = nhảy cao, nhấn thêm lần nữa trên không = nhảy đôi) |
| ↓ + Space | Nhảy xuống khỏi bục |
| ↓ (đứng yên) | Ngồi nghỉ, hồi máu nhanh gấp 3 |
| Z / J (giữ) | Đánh thường |
| A S D | Kỹ năng |
| 1 / 2 | Bình máu / bình linh khí |
| ↑ / E | Qua cổng, nói chuyện với NPC |
| I C K L | Túi đồ, Nhân vật, Kỹ năng, Nhiệm vụ |
| Enter | Chat (bot sẽ trả lời) |
| P | Gọi / cất pet Tiểu Quỷ |
| Esc | Đóng cửa sổ / menu hệ thống |

Trên điện thoại, nút cảm ứng tự hiện khi bạn chạm màn hình.

## Hệ thống trong game

**Nguyên tố** (`data/elements.js`)

- Quái có bảng `res`: số dương là kháng, số âm là yếu. Ví dụ Quỷ Rơm `res: { hoa: -0.5 }` nhận thêm 50% sát thương Hỏa.
- Đòn đánh lấy hệ từ kỹ năng (Lôi Phù = Lôi, Hỏa Long Phù = Hỏa, Độc Vụ = Độc). Kỹ năng không có hệ riêng thì theo hệ của vũ khí.
- Vũ khí có hệ từ ngọc đã khảm (Hỏa/Băng/Lôi/Độc Châu, dùng trong túi đồ), hoặc hệ sẵn có (vũ khí bậc 5 là Băng, bậc 6 là Hỏa).
- Người chơi có kháng từ trang bị (`r_hoa`, `r_bang`…), tối đa 75%. Xem ở cửa sổ Nhân vật (phím C).

**Cường hóa** (`data/items.js` → `ENHANCE_*`, `game/character.js` → `enhanceEntry`)

- Mỗi cấp cộng 10% chỉ số gốc của món đồ.
- Tỉ lệ thành công giảm dần: +1 là 100%, +10 là 22%. Từ +5 trở lên, thất bại sẽ tụt 1 cấp, trừ khi dùng Bùa Bảo Hộ.
- Chi phí: `1 + cấp/3` Đá Cường Hóa và ngân lượng tăng theo cấp đồ.

**Nhiệm vụ hằng ngày**: nhiệm vụ có `daily: true` lưu ngày hoàn thành; sang ngày mới (giờ máy) là nhận lại được.

**Danh hiệu**: phần thưởng `title` của nhiệm vụ, hiện phía trên đầu nhân vật.

**Nội công (kỹ năng bị động)** (`data/classes.js` → `PASSIVES`)

- Mỗi môn phái 4 nội công xếp thành cây, mở ở cấp 5 / 10 / 16 / 22, tầng dưới cần tầng trên đạt cấp yêu cầu. Tối đa cấp 5.
- Dùng chung điểm kỹ năng với chiêu chủ động (+1 điểm mỗi cấp), nên phải chọn hướng cộng.
- Kiếm Khách: máu/thủ → công/sát thương chí mạng → hút máu → mạnh lên khi máu thấp. Đạo Sĩ: nội lực → sát thương hệ → giảm nội lực tốn → kháng mọi hệ. Thích Khách: né/tốc chạy → chí mạng → sát thương chí mạng → hồi máu khi hạ quái.
- Tẩy điểm ở cửa sổ Kỹ năng, tốn `cấp × 150` lượng.

**Quái theo cấp** (`data/affixes.js`, `game/entities.js` → `Monster`)

- Mỗi con có cấp riêng, dao động 0–3 cấp trên cấp gốc của loài. Mỗi cấp thêm: máu +12%, công +7%, thủ +5%, EXP +15%.
- Bậc trí khôn theo cấp: 1–5 bị đánh mới đuổi · 6–12 thấy là lao vào, quái bắn xa giữ khoảng cách · 13–20 né đạn, gọi đồng bọn, khựng lại rồi lao húc · 21+ bắn đón đầu, đánh dồn dập, máu thấp thì lùi lại hồi sức.
- **Tinh Anh** (★, tên vàng, có hào quang): 3–7% tùy cấp vùng. Máu ×4, công ×1.4, thêm 1–2 đặc tính ngẫu nhiên, rơi đồ tốt hơn.
- **Đặc tính**: Phản Đòn (dội 18% sát thương về bạn), Hút Huyết, Tự Hồi, Cuồng Nộ, Tự Bạo (vòng đỏ rồi nổ), Thuấn Di, Hàn Băng (làm chậm), Kịch Độc, Hộ Thể (khiên). Một số loài có sẵn: Băng Tinh Thạch phản đòn, Ếch Độc kịch độc, Nham Thạch Thú tự bạo, Băng Dực hàn băng…

**Boss có tên** (`NAMED` trong `data/affixes.js`)

- Boss truyện: Bù Nhìn Đầu Đàn, Lão Đăng Quỷ, Băng Dực Vương, Huyết Thi Tướng. Chỉ xuất hiện khi đang làm nhiệm vụ tương ứng.
- Boss dã ngoại: Cửu Vĩ Hồ Vương (Rừng Ma Trơi), Cương Thi Vương (Nghĩa Địa Cổ), Tuyết Sơn Ma Vương (Tuyết Sơn), Nham Ma Hỏa Thú (Hỏa Diệm Sơn), Bạch Diện Quỷ Chủ (Cổ Tự). Xuất hiện lại sau 4–10 phút khi bạn đang ở bản đồ đó, có thông báo trên kênh chat.

**Ngoại trang** (ô trang bị thứ 5, `slot: 'outfit'` trong `data/items.js`)

| Bộ | Cấp | Rơi từ |
|---|---|---|
| Ma Trơi Tinh Nghịch | 1 | Ma Trơi (cực hiếm), Cửu Vĩ Hồ Vương, quái Tinh Anh |
| Hồ Ly Y | 10 | Cửu Vĩ Hồ Vương 7% |
| Hắc Long Bào | 14 | Hắc Quỷ Vương 3%, Cương Thi Vương 6% |
| Thanh Liên Tiên Y | 18 | Băng Dực Vương 8%, Bạch Diện Quỷ Chủ 4%, quái Tinh Anh 0.4% |
| Nghê Thường Tiên Y (trắng) | 15 | Chế tạo ở Tú Nương · rơi 1.5–2% từ Tuyết Sơn Ma Vương, Băng Dực Vương, Bạch Diện Quỷ Chủ |
| Đào Hoa Tiên Y (hồng nhạt) | 15 | Chế tạo ở Tú Nương · rơi 1.5–2% từ Cửu Vĩ Hồ Vương, Cương Thi Vương |
| Bạch Hồ Cừu | 20 | Tuyết Sơn Ma Vương 7% |
| Phượng Vũ Y | 24 | Hỏa Kỳ Lân 4%, Nham Ma Hỏa Thú 6% |
| Huyết Nguyệt Chiến Giáp | 28 | Huyền Cơ 4%, Huyết Thi Tướng 6%, Bạch Diện Quỷ Chủ 7% |

Ngoại trang thay diện mạo (dải lụa tiên bay vòng quanh người, áo choàng, miện, tai và đuôi cáo, dải lụa, mặt nạ, hào quang) và cộng một ít chỉ số. Đồ hiếm rơi ra có cột sáng và thông báo trên kênh chat.

**Nhịp cốt truyện**

- Cổng sang vùng mới bị **phong ấn** tới khi xong bước truyện tương ứng (`lock` trong `maps.js`), ví dụ Đầm Lầy cần Hương Phá Chướng, Tuyết Sơn cần hạ Hắc Quỷ Vương.
- Cấp yêu cầu giãn ra và EXP thưởng chỉ bằng 12–65% một cấp (`main()` trong `story.js`), nên phải đánh quái mới đủ cấp. Bảng theo dõi nhiệm vụ gợi ý bản đồ nên luyện cấp.

**Chế tạo** (`data/recipes.js`, NPC Tú Nương ở Làng Trúc Lâm)

| Món | Nguyên liệu |
|---|---|
| Đào Hoa Tiên Y | 40 Cánh Đào Ma, 20 Đuôi Hồ Ly, 20 Lửa Ma Trơi, 1 Tiên Lộ, 15.000 lượng |
| Nghê Thường Tiên Y | 40 Tơ Băng Tằm, 20 Lông Tuyết Hồ, 15 Băng Tinh, 2 Tiên Lộ, 30.000 lượng |
| Hồ Ly Y | 60 Đuôi Hồ Ly, 15 Cánh Đào Ma, 1 Tiên Lộ, 10.000 lượng |
| Bình Máu Lớn ×5 / Đại Linh Đan ×5 / Đá Cường Hóa / Bùa Bảo Hộ / Ngọc Sơ ngẫu nhiên | nguyên liệu thường từ quái |

Nguyên liệu: **Cánh Đào Ma** (Hồ Ly Tinh 6%, Quỷ Rơm 5%, Ma Trơi 3%), **Tơ Băng Tằm** (Băng Dực 8%, Tuyết Hồ 5%, Tuyết Yêu 4%), **Tiên Lộ** (boss dã ngoại và boss chương chắc chắn rơi, boss truyện 50%, quái Tinh Anh 8%). Thêm công thức mới chỉ cần thêm một dòng vào `RECIPES`.

**Ép ngọc** (`data/items.js` → `GEM_*`, `game/character.js` → `socketGem`, `fuseGems`)

- 5 loại ngọc: Hồng (Công), Hoàng (Chí mạng), Lục (Máu), Tử (Thủ), Lam (Nội lực); mỗi loại 3 phẩm Sơ / Trung / Thượng.
- Số lỗ khảm: 1, thêm 1 nếu đồ Quý trở lên, thêm 1 nếu cường hóa từ +7 (tối đa 3).
- Vũ khí nhận Hồng/Hoàng/Lam, mũ áo nhận Lục/Tử/Lam, phụ kiện nhận tất cả (`GEM_SLOTS`).
- Hợp ngọc: 3 viên cùng loại cùng phẩm → 1 viên phẩm trên. Sơ → Trung 100%, Trung → Thượng 75% (hỏng vỡ 1 viên).
- Gỡ ngọc mất ít tiền công, ngọc trả về túi nguyên vẹn. Trong bảng rơi đồ, `GEM1`/`GEM2`/`GEM3` là ngọc ngẫu nhiên.

**Cốt truyện** (`data/story.js`)

Tuyến chính gồm Mở đầu và 3 chương (29 nhiệm vụ, cấp 1 → 27):

- **Mở đầu · Người Đến Từ Màn Sương**: tỉnh dậy mất trí nhớ ở Trúc Lâm, trên tay là nửa chiếc Chuông Trấn Hồn.
- **Chương 1 · Mệnh Thuần Âm**: Tiểu Lan bị bắt, lần theo dấu vết tới Quỷ Môn Quan, hạ Hắc Quỷ Vương.
- **Chương 2 · Huyết Ma Châu**: hai đệ tử Huyền Môn giận nhau ba mươi năm, giải thoát Hỏa Kỳ Lân.
- **Chương 3 · Mặt Nạ Trắng**: sự thật về Đạo Trưởng Huyền Cơ, Huyền Môn Cổ Tự, lựa chọn rung chuông hay không.

Cách viết:

- Mỗi nhiệm vụ có `intro` (lúc nhận) và `outro` (lúc trả). Mỗi câu là `[người nói, lời thoại, điều kiện?]`; người nói là id NPC, `'me'`, `'sys'` hoặc id quái. Điều kiện `'bell=ring'` chỉ hiện câu khi người chơi đã chọn rung chuông.
- `type`: `talk` (đi gặp `target`), `kill`, `collect`, `act` (thao tác hướng dẫn, `target` là tên sự kiện: `djump`, `potion`, `buy`, `stat`, `skillup`, `enhance`, `socket`, `fuse`, `orb`, `daily`).
- `turnIn`: NPC nhận trả; `drop`: vật phẩm nhiệm vụ rơi từ quái; `give`: vật phẩm phát lúc nhận; `hint`: mẹo hiện trong sổ nhiệm vụ.
- `SCENES`: cảnh chiếu khi vào một bản đồ lúc đang làm nhiệm vụ, có thể có lựa chọn (đặt cờ trong `ch.flags`).
- Trong `maps.js`, NPC có `after` (hiện sau khi xong nhiệm vụ), `until` (biến mất khi nhận nhiệm vụ), `hideWhile` (vắng mặt trong lúc làm); cổng có `req` (chỉ mở khi xong nhiệm vụ).
- Thêm nhiệm vụ vào tuyến chính thì ghi id vào `MAIN_ORDER` đúng vị trí: nhân vật cũ đã đi qua chỗ đó sẽ tự được tính là xong.

**Nhiệm vụ hướng dẫn**: Trưởng Làng (nhảy đôi, cộng điểm, pet), Bà Tư (bình máu, mua bán), Đạo Trưởng (kỹ năng, ngũ hành), Thợ Rèn (cường hóa, ép ngọc, hợp ngọc), Bộ Khoái (truy nã). Có dấu **!** xanh trên đầu NPC.

**Thoại NPC** (`data/chatter.js`): mỗi NPC có `lines` (tự nói khi bạn đứng gần), `greet` (câu mở đầu khi bấm nói chuyện), `hi` (chào khi bạn đi tới). Câu đổi theo tiến độ truyện, giờ trong ngày, cấp, môn phái, pet, danh hiệu, vũ khí. `BANTER` là các đoạn NPC nói chuyện với nhau.

## Đồ họa được vẽ thế nào

Game không dùng file ảnh nào. Lúc khởi động, mỗi nhân vật/quái được vẽ bằng Canvas 2D (đường cong Bézier,
gradient, viền tối) ở độ phân giải gấp 3 lần, lưu thành một "sprite sheet" trong bộ nhớ, rồi khi chơi chỉ việc
cắt từng khung ra vẽ lên màn hình. Nhờ vẽ to rồi thu nhỏ nên hình mịn, không vỡ hạt.

Muốn đổi màu áo, kiểu tóc, màu mắt của môn phái: sửa `look` trong `data/classes.js`
(`robe`, `trim`, `hair`, `hairStyle` 0–5, `eye`, `skin`). NPC sửa trong `data/npcs.js`.

Sau này nếu muốn dùng ảnh vẽ tay (PNG) thay cho hình vẽ bằng code, chỉ cần tạo sheet có cùng dạng
`{ img, fw, fh, s, frames }` trong `gfx/` là phần còn lại của game vẫn chạy như cũ.
