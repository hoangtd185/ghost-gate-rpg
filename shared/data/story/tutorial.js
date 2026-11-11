// Tutorial quests (double jump, stats, potions, enhancement, gems, crafting...)
import { GAME } from '../../config.js';
// ================= TUTORIAL QUESTS =================
// type 'act': target is the name of the game event fired when the player performs that action
const tut = (q) => ({ cat: 'tut', type: 'act', count: 1, ...q });

export const TUTORIAL_QUESTS = {
  tut_move: tut({
    name: 'Khinh Công Nhập Môn', npc: 'elder', lv: 1, target: 'djump', count: 3,
    text: 'Nhảy đôi 3 lần cho Trưởng Làng xem.',
    hint: 'Nhấn Space (hoặc X) để nhảy, đang trên không nhấn thêm lần nữa để nhảy đôi. Giữ Space để nhảy cao hơn. ↓ + Space (hoặc Ctrl + ↓) để nhảy xuống khỏi bục. Nhấn đúp ← hoặc → rồi giữ để chạy nhanh.',
    intro: [
      ['elder', 'Khoan đi đã. Con nằm ba ngày, chân tay chắc cứng đờ cả rồi.'],
      ['elder', 'Thử nhảy xem nào: nhấn Space để nhảy, giữ lâu thì nhảy cao hơn. Đang trên không nhấn thêm lần nữa là nhảy đôi.'],
      ['elder', 'Nhảy đôi ba lần cho lão xem.'],
    ],
    outro: [
      ['elder', 'Nhanh nhẹn đấy! Đồ rơi trên bục cao thì cứ thế mà nhảy lên nhặt.'],
      ['elder', 'Muốn xuống khỏi bục thì giữ ↓ rồi nhấn nhảy.'],
    ],
    reward: { exp: 30, gold: 20, items: [['hp_s', 3]] },
  }),
  tut_potion: tut({
    name: 'Bình Máu Của Bà Tư', npc: 'healer', lv: 1, requires: 'm1', target: 'potion', count: 2, give: [['hp_s', 3]],
    text: 'Uống thử 2 bình thuốc.',
    hint: 'Nhấn 1 để uống bình máu, 2 để uống bình linh khí. Giữ ↓ khi đứng yên để ngồi nghỉ, hồi máu nhanh gấp 3.',
    intro: [
      ['healer', 'Bà cho con thêm ba bình máu. Đánh nhau mà thấy máu đỏ vơi đi thì nhấn phím 1 mà uống, phím 2 là bình linh khí.'],
      ['healer', 'Hết thuốc thì ngồi xuống (giữ ↓) nghỉ một lát, máu sẽ hồi nhanh gấp ba. Ở trong làng còn nhanh hơn nữa.'],
      ['healer', 'Uống thử hai bình cho quen tay đi.'],
    ],
    outro: [['healer', 'Đấy, dễ không? Thuốc bà bán ở mục Mua bán, rẻ lắm.']],
    reward: { exp: 40, items: [['mp_s', 5]] },
  }),
  tut_shop: tut({
    name: 'Đi Chợ', npc: 'healer', lv: 2, requires: 'tut_potion', target: 'buy',
    text: 'Mua thử một món ở cửa hàng.',
    hint: 'Nói chuyện với Bà Tư (hoặc NPC có cửa hàng) → Mua bán → Mua. Tab Bán để bán đồ thừa lấy ngân lượng.',
    intro: [
      ['healer', 'Ngân lượng nhặt được thì đừng để mốc. Mua thử một món ở chỗ bà xem, chọn "Mua bán" ấy.'],
      ['healer', 'Đồ thừa trong túi cũng bán được, sang tab Bán.'],
    ],
    outro: [
      ['healer', 'Khéo mặc cả đấy! Bà tặng thêm Hồi Thành Phù.'],
      ['healer', 'Đi xa mà kẹt thì dùng nó, chớp mắt là về tới làng.'],
    ],
    reward: { exp: 50, gold: 40, items: [['scroll_home', 2]] },
  }),
  tut_stat: tut({
    name: 'Rèn Luyện Thân Thể', npc: 'elder', lv: 2, requires: 'tut_move', target: 'stat', count: 3,
    text: 'Cộng 3 điểm tiềm năng trong bảng Nhân vật.',
    hint: 'Nhấn C để mở bảng Nhân vật, bấm dấu + cạnh chỉ số. {cls} nên ưu tiên {main}, thêm ít Thể để chịu đòn.',
    intro: [
      ['elder', `Lên cấp rồi đấy! Mỗi cấp con được ${GAME.player.statPointsPerLevel} điểm tiềm năng.`],
      ['elder', 'Mở bảng Nhân vật (phím C) mà cộng. {cls} như con thì cần {main} nhất. Thể thì ai cũng cần, để chịu đòn.'],
      ['elder', 'Cộng thử ba điểm cho lão xem.'],
    ],
    outro: [['elder', 'Người khỏe ra hẳn! Nhớ cộng hết điểm mỗi lần lên cấp.']],
    reward: { exp: 60, items: [['hp_s', 5]] },
  }),
  tut_skill: tut({
    name: 'Võ Học Nhập Môn', npc: 'priest', lv: 2, target: 'skillup',
    text: 'Nâng một kỹ năng trong bảng Kỹ năng.',
    hint: 'Nhấn K, bấm dấu + cạnh kỹ năng. Đánh thường bằng Z/J (giữ để đánh liên tục), kỹ năng bằng A, S, D.',
    intro: [
      ['priest', 'Ngươi có căn cơ. Mỗi lần lên cấp, ngươi ngộ ra thêm một điểm kỹ năng.'],
      ['priest', 'Mở bảng Kỹ năng (phím K) mà nâng. Chiêu càng cao cấp càng mạnh. Chiêu mới sẽ tự mở khi đủ cấp.'],
      ['priest', 'Kỹ năng dùng bằng phím A, S, D. Đánh thường là Z hoặc J.'],
    ],
    outro: [['priest', 'Tốt. Võ học không có đường tắt, nhưng có đường đúng.']],
    reward: { exp: 60, items: [['mp_s', 5]] },
  }),
  tut_daily: tut({
    name: 'Bảng Truy Nã', npc: 'constable', lv: 3, target: 'daily',
    text: 'Nhận một nhiệm vụ Truy Nã hằng ngày.',
    hint: 'Nói chuyện với Bộ Khoái, chọn nhiệm vụ có nhãn Hằng ngày. Mỗi ngày làm lại được một lần.',
    intro: [
      ['constable', 'Người mới tới à? Quan phủ đang thiếu tay săn yêu.'],
      ['constable', 'Mỗi ngày bảng truy nã đổi một lần. Diệt đủ số yêu quái thì về lĩnh thưởng, mai lại nhận tiếp.'],
      ['constable', 'Nhận thử một tờ truy nã đi.'],
    ],
    outro: [['constable', 'Tốt, cứ thế mà làm. Đá Cường Hóa của quan phủ chẳng bao giờ thiếu.']],
    reward: { exp: 50, items: [['stone', 1]] },
  }),
  tut_forge1: tut({
    name: 'Lửa Lò Rèn', npc: 'smith', lv: 3, target: 'enhance', give: [['stone', 2]],
    text: 'Cường hóa một món trang bị.',
    hint: 'Thợ Rèn → Lò rèn → tab Cường hóa → chọn trang bị → bấm Cường hóa. +1 đến +4 không bao giờ tụt cấp.',
    intro: [
      ['smith', 'Người mới hả? Binh khí cùn thế kia thì chém quỷ nó cười cho.'],
      ['smith', 'Đây, hai viên Đá Cường Hóa, quà làm quen. Chọn "Lò rèn", chọn món muốn rèn rồi bấm nút.'],
      ['smith', 'Từ +1 tới +4 không bao giờ mất cấp. Lên +5 trở đi mà hỏng thì tụt một cấp, lúc đó mới cần Bùa Bảo Hộ.'],
    ],
    outro: [
      ['smith', 'Nghe tiếng búa chưa? Mỗi cấp cường hóa tăng 10% chỉ số gốc.'],
      ['smith', 'Lên tới +7 còn mở thêm một lỗ khảm ngọc. Có đá thì cứ mang tới.'],
    ],
    reward: { exp: 80, gold: 50, items: [['stone', 1]] },
  }),
  tut_forge2: tut({
    name: 'Ép Ngọc', npc: 'smith', lv: 5, requires: 'tut_forge1', target: 'socket', give: [['gem_atk1', 1]],
    text: 'Ép một viên ngọc vào trang bị.',
    hint: 'Thợ Rèn → Lò rèn → tab Ép ngọc → chọn trang bị → bấm vào viên ngọc muốn ép. Vũ khí nhận Hồng/Hoàng/Lam Ngọc, mũ áo nhận Lục/Tử/Lam Ngọc, phụ kiện nhận tất cả.',
    intro: [
      ['smith', 'Cường hóa là làm cứng xương, ép ngọc là đắp thêm thịt.'],
      ['smith', 'Mỗi trang bị có lỗ khảm. Đồ thường một lỗ, đồ Quý trở lên hai lỗ, cường hóa tới +7 mở thêm một lỗ nữa.'],
      ['smith', 'Vũ khí hợp Hồng Ngọc (Công) với Hoàng Ngọc (Chí mạng). Mũ áo hợp Lục Ngọc (Máu) với Tử Ngọc (Thủ). Lam Ngọc thì món nào cũng nhận, phụ kiện thì nhận hết.'],
      ['smith', 'Cầm viên Hồng Ngọc này, ép vào vũ khí thử xem.'],
    ],
    outro: [
      ['smith', 'Đẹp chưa! Muốn gỡ ra thì tôi gỡ cho, mất ít tiền công, ngọc vẫn còn nguyên.'],
      ['smith', 'Tặng thêm viên Lục Ngọc, ép vào áo cho dày máu.'],
    ],
    reward: { exp: 200, gold: 100, items: [['gem_hp1', 1]] },
  }),
  tut_forge3: tut({
    name: 'Hợp Ngọc', npc: 'smith', lv: 8, requires: 'tut_forge2', target: 'fuse', give: [['gem_hp1', 3]],
    text: 'Hợp 3 viên ngọc cùng loại thành ngọc cấp cao hơn.',
    hint: 'Thợ Rèn → Lò rèn → tab Hợp ngọc → chọn loại có từ 3 viên → Hợp. Sơ → Trung luôn thành công, Trung → Thượng 75%.',
    intro: [
      ['smith', 'Ngọc Sơ phẩm thì yếu. Ba viên cùng loại hợp lại được một viên Trung phẩm, mạnh gấp hai lần rưỡi.'],
      ['smith', 'Trung lên Thượng thì khó hơn, hỏng là vỡ mất một viên. Nhưng Thượng phẩm thì đáng đồng tiền.'],
      ['smith', 'Đây, ba viên Lục Ngọc. Hợp thử đi.'],
    ],
    outro: [
      ['smith', 'Viên Trung phẩm sáng hơn hẳn nhỉ? Ngọc rơi từ quái, từ nhiệm vụ, hoặc mua ở chỗ tôi.'],
      ['smith', 'Tặng thêm Bùa Bảo Hộ. Cường hóa từ +5 trở lên nhớ dán nó vào, hỏng cũng không tụt cấp.'],
    ],
    reward: { exp: 500, gold: 200, items: [['protect', 1]] },
  }),
  tut_craft: tut({
    name: 'Kim Chỉ Đầu Tiên', npc: 'embroiderer', lv: 4, requires: 'm2', target: 'craft', give: [['mat_tail', 4], ['mat_wisp', 4]],
    text: 'Chế tạo một món bất kỳ ở Tú Nương.',
    hint: 'Nói chuyện với Tú Nương → Chế tạo → chọn công thức đủ nguyên liệu → Chế tạo. Nguyên liệu rơi từ quái, rê chuột vào nguyên liệu để xem nguồn.',
    intro: [
      ['embroiderer', 'Ơ, người mới à? Tôi là Tú Nương, thêu thùa may vá, chế bình thuốc cũng được.'],
      ['embroiderer', 'Đồ quái rơi ra đừng vội bán. Đuôi hồ ly, lửa ma trơi, rơm ma… mang tới đây tôi chế thành đồ tốt.'],
      ['embroiderer', 'Có Cánh Đào Ma với Tơ Băng Tằm thì tôi thêu được cả tiên y, mặc vào nhìn như tiên nữ giáng trần ấy. Nhưng phải có Tiên Lộ, thứ đó chỉ boss mới giữ.'],
      ['embroiderer', 'Thử trước đi, tôi tặng ít nguyên liệu. Chế năm bình máu lớn nhé.'],
    ],
    outro: [['embroiderer', 'Khéo tay đấy! Gom đủ nguyên liệu thì quay lại, tôi thêu tiên y cho.']],
    reward: { exp: 120, gold: 100, items: [['mat_peach', 5]] },
  }),
  tut_orb: tut({
    name: 'Ngũ Hành Tương Khắc', npc: 'priest', lv: 9, target: 'orb', give: [['orb_thunder', 1]],
    text: 'Khảm một viên Châu nguyên tố vào vũ khí.',
    hint: 'Mở túi đồ (I) khi đang cầm vũ khí, chọn Lôi Châu → Dùng. Hệ vũ khí và kháng xem ở bảng Nhân vật (C).',
    intro: [
      ['priest', 'Yêu quái mỗi loài một hệ. Rơm sợ lửa, lửa sợ băng, nước sợ sét, xác chết cũng sợ sét.'],
      ['priest', 'Khảm Châu nguyên tố vào vũ khí thì đòn đánh mang hệ đó. Đánh trúng chỗ yếu, sát thương tăng mạnh. Đánh vào chỗ kháng thì yếu hẳn.'],
      ['priest', 'Cầm Lôi Châu này. Dùng nó trong túi đồ khi đang cầm vũ khí. Cương Thi ở Nghĩa Địa sẽ biết tay ngươi.'],
    ],
    outro: [
      ['priest', 'Hệ của vũ khí hiện trong bảng Nhân vật. Giáp có kháng thì đỡ được đòn hệ tương ứng.'],
      ['priest', 'Thêm một viên Băng Châu. Gặp quỷ lửa thì đổi sang.'],
    ],
    reward: { exp: 1500, gold: 400, items: [['orb_ice', 1]] },
  }),
};
