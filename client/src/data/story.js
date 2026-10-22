// Main story "Huyền Môn Phong Ấn" (The Huyền Môn Seal) + tutorial quests
//
// Each quest has:
//   cat      – 'main' (story), 'tut' (tutorial), 'side' (side), 'daily' (daily)
//   chapter  – chapter shown in the quest log
//   intro    – dialogue on accept, outro – dialogue on turn-in
//              each line is [speaker, text, condition?]
//              speaker: NPC id, 'me' (the player), 'sys' (narration), or a monster id (monster portrait)
//              condition (optional): 'bell=ring' – only shown when story flag bell = ring
//              text may use {name} {cls} {main} {title}
//   type     – 'talk' (go meet NPC target), 'kill', 'collect', 'act' (perform an action: target is the event name)
//   turnIn   – NPC to hand in to (defaults to the quest giver)
//   drop     – quest item dropped by monsters while active: { mob, item, chance }
//   give     – items handed out on accepting the quest
//   hint     – tip shown in the quest log (tutorial quests)
import { GAME } from '../config.js';
export const SPEAKERS = { boss: 'Hắc Quỷ Vương', qilin: 'Hỏa Kỳ Lân', blood_demon: 'Huyết Ma Huyền Cơ' };

export const CHAPTERS = {
  c0: 'Mở Đầu · Người Đến Từ Màn Sương',
  c1: 'Chương 1 · Mệnh Thuần Âm',
  c2: 'Chương 2 · Huyết Ma Châu',
  c3: 'Chương 3 · Mặt Nạ Trắng',
};

// Main-line order. If an old character finished a later quest, every earlier one counts as done.
export const MAIN_ORDER = [
  'm1', 'm2', 'm3', 'm4',
  'st1', 'st2', 'st3', 'st4', 'st4b', 'st5', 'st6', 'st6b', 'st6c', 'st6d', 'st7',
  'st8', 'st8b', 'st9', 'st10', 'st10b', 'st10c', 'st11', 'st11b', 'st11c', 'st12',
  'st13', 'st14', 'st15', 'st16', 'st16b', 'st17', 'st18',
];

// Reward EXP = a share of the EXP needed to level up (same formula as expToNext), so players still have to fight to reach the next step's level.
const { a: EA, p: EP, b: EB } = GAME.player.expCurve;
const needExp = (lv) => Math.floor(EA * Math.pow(lv, EP) + EB * lv);
const EXP_SHARE = GAME.story.expShare; // tuned in config.js
const BIG = ['st7', 'st12', 'st18']; // chapter boss kill
function main(chapter, q) {
  const out = { cat: 'main', chapter, ...q, reward: { ...q.reward } };
  const share = q.target && q.target.startsWith('nb_') ? EXP_SHARE.namedBoss : EXP_SHARE[q.type];
  out.reward.exp = Math.round(needExp(q.lv) * share / 10) * 10;
  return out;
}

export const STORY_QUESTS = {
  // ================= PROLOGUE =================
  m1: main('c0', {
    name: 'Tỉnh Giấc Dưới Mái Tre', npc: 'elder', lv: 1, type: 'talk', target: 'healer', count: 1,
    text: 'Đến chỗ Bà Tư (Thầy Lang) để bà khám lại cho.',
    intro: [
      ['sys', 'Mưa đêm gõ lộp độp trên mái tre. Bạn mở mắt, đầu đau như búa bổ.'],
      ['elder', 'Tỉnh rồi à? Ba hôm trước tiều phu thấy con nằm bất tỉnh ở bìa Rừng Ma Trơi, sương phủ kín người.'],
      ['me', 'Đây là đâu… Tôi không nhớ gì cả, ngoài cái tên của mình.'],
      ['elder', 'Làng Trúc Lâm. Lúc ấy con còn nắm chặt nửa chiếc chuông đồng vỡ, gỡ mãi không ra.'],
      ['elder', 'Lạ nhất là cái dấu trên cổ tay con. Đêm qua có đốm ma trơi bay ngang cửa sổ, nó sáng lên xanh lét.'],
      ['elder', 'Qua chỗ Bà Tư bắt mạch đã. Thuốc của bà ấy hay lắm.'],
    ],
    outro: [
      ['healer', 'Đứa trẻ ngủ ba ngày đây hả? Đưa tay bà xem nào.'],
      ['healer', '…Mạch con lạ thật. Nửa âm nửa dương, như có ai lấy chỉ khâu ký ức con lại.'],
      ['healer', 'Thứ đó bà không chữa được. Nhưng máu thịt thì bà lo. Cầm lấy mấy bình thuốc này.'],
      ['healer', 'Đi đâu cũng nhớ: hết máu thì uống, mỏi thì ngồi xuống nghỉ.'],
    ],
    reward: { exp: 40, gold: 30, items: [['hp_s', 5]] },
  }),
  m2: main('c0', {
    name: 'Ma Trơi Bìa Rừng', npc: 'healer', turnIn: 'elder', lv: 1, requires: 'm1', type: 'kill', target: 'wisp', count: 8,
    text: 'Dập tắt 8 đốm Ma Trơi ở Rừng Ma Trơi (cổng phía đông làng), rồi về báo Trưởng Làng.',
    intro: [
      ['healer', 'Muốn biết mình là ai thì quay lại chỗ người ta tìm thấy con: bìa Rừng Ma Trơi, cổng phía đông làng.'],
      ['healer', 'Dạo này ma trơi nhiều lắm. Chúng không hại ai, chỉ thích đốt người lạ… nói vậy chứ bỏng thật đấy.'],
      ['me', 'Để tôi dọn đường.'],
      ['healer', 'Dập tắt tám đốm cho bà. Xong thì về báo Trưởng Làng, ông ấy lo cho con lắm.'],
    ],
    outro: [
      ['elder', 'Con dập được tám đốm mà không hề bị bỏng?'],
      ['elder', 'Ma trơi vốn né người sống, chỉ bám theo người sắp chết… hoặc người mang âm khí.'],
      ['me', 'Lúc đánh chúng, cái dấu trên tay tôi nóng ran.'],
      ['elder', 'Hừm. Cái dấu đó lão từng thấy ở đâu rồi. Để lão nghĩ đã.'],
    ],
    reward: { exp: 120, gold: 120, items: [['hp_s', 5], ['mp_s', 3], ['stone', 1]] },
  }),
  m3: main('c0', {
    name: 'Chiếc Chuông Vỡ', npc: 'elder', turnIn: 'priest', lv: 3, requires: 'm2', type: 'collect', target: 'q_bell', count: 1,
    drop: { mob: 'fox', item: 'q_bell', chance: 0.4 },
    text: 'Lấy lại mảnh chuông đồng từ Hồ Ly Tinh trong Rừng Ma Trơi, mang tới Đạo Trưởng Huyền Cơ (cuối làng).',
    intro: [
      ['elder', 'Lão nhớ ra rồi! Cái dấu trên tay con giống hệt hoa văn khắc trên cửa am Đạo Trưởng Huyền Cơ.'],
      ['elder', 'Nhưng muốn ông ấy tin thì phải có chiếc chuông. Mà… chiếc chuông đâu rồi?'],
      ['me', 'Lúc tỉnh dậy tôi không thấy nó.'],
      ['elder', 'Chết thật. Đêm tiều phu cõng con về, lão nghe có tiếng cáo theo sau. Lũ Hồ Ly Tinh mê đồ lấp lánh lắm.'],
      ['elder', 'Vào rừng hạ vài con, thế nào nó cũng nằm trong ổ của chúng.'],
    ],
    outro: [
      ['priest', 'Người trẻ tuổi, Trưởng Làng bảo ngươi tìm ta? Đưa chiếc chuông đây.'],
      ['sys', 'Đạo Trưởng lật mảnh chuông trong tay. Ngón tay ông khựng lại ở hoa văn bát quái.'],
      ['priest', '…Chuông Trấn Hồn của Huyền Môn. Pháp khí của chưởng môn, rung một tiếng là gọi được hồn về xác.'],
      ['priest', 'Nó vỡ làm đôi. Nửa còn lại ở đâu, chỉ ngươi biết, mà ngươi lại không nhớ.'],
      ['me', 'Ông biết Huyền Môn sao?'],
      ['priest', 'Bần đạo… từng học đạo ở đó, lâu lắm rồi. Sư môn tan tác cả rồi.'],
      ['priest', 'Ngươi cứ giữ chuông. Ký ức bị phong ấn thì phải chờ cơ duyên, ép không được.'],
    ],
    reward: { exp: 250, gold: 150, items: [['mp_s', 5], ['stone', 1]] },
  }),
  m4: main('c0', {
    name: 'Ở Lại Trúc Lâm', npc: 'priest', lv: 3, requires: 'm3', type: 'talk', target: 'elder', count: 1,
    text: 'Về báo Trưởng Làng rằng bạn sẽ ở lại làng.',
    intro: [
      ['priest', 'Âm khí quanh làng mấy tháng nay nặng dần. Người mang ấn ký như ngươi ở lại đây, bần đạo yên tâm hơn.'],
      ['priest', 'Về nhờ Trưởng Làng cho chỗ ở. Rảnh thì ghé Thợ Rèn, binh khí cùn thì đánh quỷ không đau.'],
    ],
    outro: [
      ['elder', 'Đạo Trưởng bảo con ở lại? Tốt quá! Gian nhà kho cuối làng còn trống, con cứ ở đó.'],
      ['elder', 'Làm quen với mọi người đi. Bà Tư bán thuốc, Anh Sắt rèn binh khí, Bộ Khoái lúc nào cũng có việc treo thưởng.'],
      ['sys', 'Đêm ấy bạn ngủ một giấc không mộng mị. Đến canh ba, mặt trăng bỗng đỏ như máu…'],
    ],
    reward: { exp: 150, gold: 100, items: [['hp_s', 5]] },
  }),

  // ================= CHAPTER 1 =================
  st1: main('c1', {
    name: 'Đêm Trăng Máu', npc: 'elder', lv: 4, requires: 'm4', type: 'talk', target: 'healer', count: 1,
    text: 'Đến gặp Thầy Lang (Bà Tư) hỏi chuyện Tiểu Lan mất tích.',
    intro: [
      ['elder', 'Dậy đi con, có chuyện rồi!'],
      ['elder', 'Đêm qua trăng đỏ như máu. Sáng nay cháu gái Bà Tư, con bé Tiểu Lan, biến mất khỏi giường.'],
      ['elder', 'Trên bậu cửa chỉ còn vết chân cáo và mùi nhang lạ. Con qua hỏi Bà Tư xem, bà ấy đang rối lắm.'],
      ['me', 'Cháu đi ngay.'],
    ],
    outro: [
      ['healer', 'Tiểu Lan nhà bà chưa bao giờ ra khỏi làng một mình.'],
      ['healer', 'Con bé sinh đúng rằm tháng Bảy. Thầy bói bảo nó mang mệnh Thuần Âm, thứ ma quỷ thèm khát nhất.'],
      ['healer', 'Đêm qua bà nghe tiếng cáo kêu ngoài bìa rừng. Bà sợ… bà sợ lắm.'],
    ],
    reward: { exp: 80, gold: 60 },
  }),
  st2: main('c1', {
    name: 'Dải Lụa Trong Rừng', npc: 'healer', lv: 4, requires: 'st1', type: 'collect', target: 'q_ribbon', count: 1,
    drop: { mob: 'fox', item: 'q_ribbon', chance: 0.35 },
    text: 'Tìm dấu vết Tiểu Lan ở Rừng Ma Trơi. Hồ Ly Tinh hay tha đồ về hang.',
    intro: [
      ['healer', 'Tiểu Lan luôn buộc tóc bằng dải lụa đỏ bà may. Nếu con bé đi qua rừng, hẳn phải để lại dấu.'],
      ['healer', 'Lũ Hồ Ly Tinh hay tha đồ lấp lánh về hang. Con thử hạ vài con xem.'],
    ],
    outro: [
      ['healer', 'Đúng rồi… lụa của nó. Còn dính cả tro nhang.'],
      ['healer', 'Mùi nhang này không phải nhang nhà người sống. Con mang tới Đạo Trưởng Huyền Cơ, ông ấy sẽ hiểu.'],
    ],
    reward: { exp: 250, gold: 120, items: [['hp_s', 5]] },
  }),
  st3: main('c1', {
    name: 'Mùi Nhang Âm Phủ', npc: 'healer', lv: 5, requires: 'st2', type: 'talk', target: 'priest', count: 1,
    text: 'Mang dải lụa tới Đạo Trưởng Huyền Cơ ở cuối làng.',
    intro: [['healer', 'Đi đi con, nhanh lên. Bà ở nhà thắp hương cầu cho con bé.']],
    outro: [
      ['priest', 'Đưa bần đạo xem.'],
      ['sys', 'Đạo Trưởng chỉ ngửi qua một lần, không cần nhìn kỹ.'],
      ['priest', 'Nhang Dẫn Hồn. Chỉ kẻ muốn mở cửa âm dương mới dùng thứ này.'],
      ['priest', 'Hồ Ly chỉ là kẻ chạy việc. Kẻ đứng sau muốn đưa một linh hồn Thuần Âm qua Quỷ Môn Quan.'],
      ['me', 'Tiểu Lan vẫn còn sống chứ?'],
      ['priest', 'Nếu là để hiến tế, chúng phải đợi đến đêm rằm. Còn thời gian, nhưng không nhiều.'],
    ],
    reward: { exp: 300, gold: 150, items: [['stone', 1]] },
  }),
  st4: main('c1', {
    name: 'Tiếng Khóc Ngoài Đồng', npc: 'priest', lv: 7, requires: 'st3', type: 'kill', target: 'nb_scarecrow', count: 1,
    text: 'Hạ Bù Nhìn Đầu Đàn đứng giữa vòng vây Quỷ Rơm ở Cánh Đồng Hoang (phía đông).',
    intro: [
      ['priest', 'Đêm qua người gác đồng nghe tiếng con gái khóc giữa ruộng hoang.'],
      ['priest', 'Lũ Quỷ Rơm đứng thành vòng tròn quanh một con bù nhìn to gấp đôi. Nó là đầu đàn.'],
      ['priest', 'Hạ được nó thì vòng vây tự tan. Cẩn thận: rơm sợ lửa, nhưng đầu đàn mà sắp gục thì nổi điên đấy.'],
    ],
    outro: [
      ['priest', 'Không thấy Tiểu Lan à? Vậy là chúng đã kịp đưa con bé đi.'],
      ['priest', 'Hướng chúng đi là về phía đầm lầy. Ngư Ông sống ở đó cả đời, hỏi ông ta.'],
      ['priest', 'Nhưng sương đầm lầy có độc. Trước khi đi, ngươi giúp bần đạo một việc đã.'],
    ],
    reward: { exp: 900, gold: 300, items: [['W2', 1], ['stone', 2]] },
  }),
  st4b: main('c1', {
    name: 'Hương Phá Chướng', npc: 'priest', lv: 8, requires: 'st4', type: 'collect', target: 'mat_straw', count: 10,
    text: 'Gom 10 bó Rơm Ma từ Quỷ Rơm để Đạo Trưởng chế hương đi qua sương độc.',
    intro: [
      ['priest', 'Sương Đầm Lầy có độc, người thường đi vào là mê man. Bần đạo sẽ chế Hương Phá Chướng.'],
      ['priest', 'Lõi hương phải là rơm nhuốm âm khí, cháy rất lâu mà không tắt. Mang về mười bó Rơm Ma.'],
    ],
    outro: [
      ['priest', 'Đủ rồi. Hương này đốt lên, sương độc sẽ tránh ngươi ba bước.'],
      ['sys', 'Đạo Trưởng xe hương thoăn thoắt, như đã làm việc này cả nghìn lần.'],
      ['priest', 'Lối vào Đầm Lầy Sương Mù nằm giữa Cánh Đồng Hoang. Cẩn thận lũ ếch độc.'],
    ],
    reward: { exp: 1200, gold: 350, items: [['hp_l', 3], ['stone', 2]] },
  }),
  st5: main('c1', {
    name: 'Con Thuyền Lúc Nửa Đêm', npc: 'priest', lv: 9, requires: 'st4b', type: 'talk', target: 'fisherman', count: 1,
    text: 'Vào Đầm Lầy Sương Mù (lối giữa Cánh Đồng Hoang) tìm Ngư Ông.',
    intro: [['priest', 'Cầm nén hương này. Ngư Ông ở ngay đầu đầm, căn nhà sàn duy nhất còn sáng đèn.']],
    outro: [
      ['fisherman', 'Cô bé áo trắng? Có… lão thấy.'],
      ['fisherman', 'Nửa đêm, một con thuyền giấy trôi ngược dòng. Trên thuyền có mấy cái xác đứng thẳng đơ.'],
      ['fisherman', 'Cương Thi! Chúng chở cô bé về phía Nghĩa Địa Cổ. Con bé không khóc, cứ như đang ngủ.'],
      ['me', 'Cảm ơn ông. Tôi sẽ đuổi theo.'],
    ],
    reward: { exp: 1500, gold: 400, items: [['hp_l', 3]] },
  }),
  st6: main('c1', {
    name: 'Huyết Thư', npc: 'fisherman', turnIn: 'priest', lv: 10, requires: 'st5', type: 'collect', target: 'q_letter', count: 1,
    drop: { mob: 'jiangshi', item: 'q_letter', chance: 0.3 },
    text: 'Lục soát Cương Thi ở Nghĩa Địa Cổ tìm manh mối, rồi mang về cho Đạo Trưởng.',
    intro: [
      ['fisherman', 'Cương Thi không biết nghĩ. Kẻ điều khiển chúng hẳn phải để lại lệnh bài hay thư từ.'],
      ['fisherman', 'Tìm được gì thì đưa ngay cho Đạo Trưởng. Lão già rồi, chỉ giúp được tới đây.'],
    ],
    outro: [
      ['priest', 'Viết bằng máu… ký tên Hắc Quỷ Vương.'],
      ['priest', '"Đêm rằm, đưa Thuần Âm vào Quỷ Môn. Phong ấn vỡ, Chủ Nhân trở về."'],
      ['me', 'Chủ Nhân? Hắc Quỷ Vương còn có chủ?'],
      ['priest', 'Ba mươi năm trước, sư phụ ta dùng cả mạng mình phong ấn một thứ dưới Quỷ Môn Quan. Không lẽ…'],
    ],
    reward: { exp: 2500, gold: 800, items: [['arm_chain', 1], ['stone', 3]] },
  }),
  st6b: main('c1', {
    name: 'Trận Bùa Bị Phá', npc: 'priest', lv: 11, requires: 'st6', type: 'collect', target: 'mat_charm', count: 8,
    text: 'Gom 8 lá Bùa Rách từ Cương Thi ở Nghĩa Địa Cổ.',
    intro: [
      ['priest', 'Nghĩa Địa Cổ vốn có trận bùa trấn yểm do sư môn lập. Cương Thi trồi lên được là vì trận đã bị phá.'],
      ['priest', 'Gom những lá bùa rách về đây. Bần đạo cần xem ai đã ra tay.'],
    ],
    outro: [
      ['priest', 'Nét bùa bị vẽ đè… là tay Hắc Quỷ Vương.'],
      ['priest', 'Nhưng chữ "Thuần Âm" ở góc này, nét mực…'],
      ['sys', 'Đạo Trưởng vội gấp lá bùa lại, cất vào tay áo.'],
      ['priest', 'Không có gì. Viên ngọc này hộ thân cho ngươi.'],
    ],
    reward: { exp: 3000, gold: 900, items: [['acc_guard', 1], ['stone', 2]] },
  }),
  st6c: main('c1', {
    name: 'Tắt Đèn Âm Phủ', npc: 'priest', lv: 12, requires: 'st6b', type: 'kill', target: 'lantern', count: 10,
    text: 'Đập tắt 10 Quỷ Đèn Lồng ở Nghĩa Địa Cổ.',
    intro: [
      ['priest', 'Quỷ Đèn Lồng soi đường cho âm binh. Tắt hết đèn, đường xuống Quỷ Môn Quan sẽ tối, chúng không kịp gọi quân.'],
      ['priest', 'Đèn mang lửa, dùng băng mà dập. Có Băng Châu thì khảm vào binh khí.'],
    ],
    outro: [
      ['priest', 'Tốt. Đêm rằm chỉ còn hai ngày.'],
      ['priest', 'Nghỉ ngơi đi, rồi chúng ta tính chuyện vào Quỷ Môn.'],
    ],
    reward: { exp: 3600, gold: 1000, items: [['W3', 1], ['mp_l', 5], ['stone', 3]] },
  }),
  st6d: main('c1', {
    name: 'Ngọn Đèn Cuối Cùng', npc: 'priest', lv: 13, requires: 'st6c', type: 'kill', target: 'nb_lantern', count: 1,
    text: 'Hạ Lão Đăng Quỷ ở cuối Nghĩa Địa Cổ để mở đường vào Quỷ Môn Quan.',
    intro: [
      ['priest', 'Còn một ngọn đèn chưa tắt. Ngọn lớn nhất, treo ngay trước cửa Quỷ Môn Quan.'],
      ['priest', 'Lão Đăng Quỷ đã canh cửa ấy trăm năm. Nó có lá chắn âm khí, đánh vỡ khiên rồi mới làm nó đau được.'],
      ['priest', 'Và đừng đứng chờ. Không bị đánh là nó tự hồi lại ngay.'],
    ],
    outro: [
      ['sys', 'Ngọn đèn cuối cùng tắt lịm. Phong ấn trên cửa Quỷ Môn Quan rã ra như giấy ướt.'],
      ['priest', 'Đường đã mở. Nhưng ngươi chưa đủ sức đâu.'],
      ['priest', 'Hắc Quỷ Vương mạnh hơn mọi thứ ngươi từng gặp. Luyện thêm vài cấp nữa rồi hãy quay lại tìm bần đạo.'],
    ],
    reward: { gold: 1400, items: [['hp_l', 5], ['stone', 3], ['GEM1', 1]] },
  }),
  st7: main('c1', {
    name: 'Phá Quỷ Môn', npc: 'priest', lv: 15, requires: 'st6d', type: 'kill', target: 'boss', count: 1,
    text: 'Vào Quỷ Môn Quan (cuối Nghĩa Địa Cổ), hạ Hắc Quỷ Vương và cứu Tiểu Lan.',
    intro: [
      ['priest', 'Ngươi đã mạnh lên nhiều. Đến lúc rồi, phải vào Quỷ Môn Quan trước khi trăng lên.'],
      ['priest', 'Hắc Quỷ Vương là vong hồn, sợ lửa và sấm. Đừng để nó gọi được âm binh vây ngươi.'],
      ['me', 'Tôi sẽ đưa Tiểu Lan về.'],
      ['priest', 'Bần đạo tin ngươi. Hơn bất cứ ai.'],
    ],
    outro: [
      ['sys', 'Hắc Quỷ Vương gục xuống, tiếng cười khàn đặc vọng khắp Quỷ Môn Quan…'],
      ['boss', 'Ngươi tưởng… đã thắng sao? Ta chỉ là… một cái bóng… Chủ Nhân đang ngủ… nơi băng và lửa gặp nhau…'],
      ['lan', '…Đại hiệp là ai? Em… em đang ở đâu vậy?'],
      ['lan', 'Trong mơ em thấy một người đeo mặt nạ trắng thắp nhang quanh em. Giọng ông ấy hiền lắm, cứ bảo em đừng sợ.'],
      ['priest', 'Mặt nạ trắng? Chắc con bé hoảng quá mà mơ thôi.'],
      ['priest', 'Lời trăn trối kia… "nơi băng và lửa gặp nhau". Phía sau Quỷ Môn là Tuyết Sơn, xa hơn nữa là Hỏa Diệm Sơn.'],
    ],
    reward: { exp: 6000, gold: 3000, items: [['W4', 1], ['stone', 4], ['protect', 1]], title: 'Trấn Quỷ Sư' },
  }),

  // ================= CHAPTER 2 =================
  st8: main('c2', {
    name: 'Giấc Mơ Kỳ Lân', npc: 'lan', lv: 16, requires: 'st7', type: 'talk', target: 'huntress', count: 1,
    text: 'Lên Tuyết Sơn (đi qua Quỷ Môn Quan) tìm thợ săn A Tuyết.',
    intro: [
      ['lan', 'Từ hôm được cứu, đêm nào em cũng mơ thấy một con kỳ lân lửa bị xích bằng băng…'],
      ['lan', 'Nó khóc, nói "hãy tìm hai đệ tử của Huyền Môn". Em không hiểu gì cả.'],
      ['me', 'Huyền Môn… Đạo Trưởng Huyền Cơ cũng là người Huyền Môn.'],
      ['lan', 'Bà em kể trên Tuyết Sơn có chị thợ săn tên A Tuyết, xưa từng học đạo. Đại hiệp thử tìm chị ấy nhé.'],
    ],
    outro: [
      ['huntress', 'Huyền Môn à… lâu lắm rồi không ai gọi cái tên đó.'],
      ['huntress', 'Ta và sư đệ Liệt Dương là hai đệ tử cuối cùng. Ba mươi năm trước, sư phụ phong ấn Huyết Ma Châu dưới Quỷ Môn Quan.'],
      ['me', 'Đạo Trưởng Huyền Cơ ở làng tôi cũng nói mình từng học ở Huyền Môn.'],
      ['huntress', 'Huyền Cơ? …Sư môn không có ai mang đạo hiệu đó. Có lẽ ông ta học lỏm được vài ngón.'],
      ['huntress', 'Mặc kệ. Huyết Ma Châu biến thần thú thành ma vật. Nếu Hắc Quỷ Vương chỉ là cái bóng của nó, thì viên châu đã bị ai đó lấy đi.'],
    ],
    reward: { exp: 5000, gold: 1500 },
  }),
  st8b: main('c2', {
    name: 'Áo Lông Mùa Đông', npc: 'huntress', lv: 16, requires: 'st8', type: 'collect', target: 'mat_fur', count: 8,
    text: 'Mang cho A Tuyết 8 Lông Tuyết Hồ để may áo ấm.',
    intro: [
      ['huntress', 'Mặc cái áo mỏng thế kia mà đòi đi sâu vào núi? Đi được nửa đường là thành tượng băng.'],
      ['huntress', 'Mang cho ta tám nhúm Lông Tuyết Hồ, ta may cho một cái áo tử tế.'],
    ],
    outro: [
      ['huntress', 'Mặc vào. Giờ thì gió tuyết cũng phải nể ngươi ba phần.'],
      ['huntress', 'Áo này kháng Băng. Đồ có kháng hệ nào thì đỡ được đòn hệ đó, xem trong bảng Nhân vật.'],
    ],
    reward: { exp: 6000, gold: 1800, items: [['arm_fur', 1], ['stone', 3]] },
  }),
  st9: main('c2', {
    name: 'Dấu Máu Trên Tuyết', npc: 'huntress', lv: 17, requires: 'st8b', type: 'collect', target: 'q_bloodfur', count: 5,
    drop: { mob: 'yeti', item: 'q_bloodfur', chance: 0.4 },
    text: 'Thu thập 5 nhúm Lông Nhuốm Huyết từ Tuyết Yêu.',
    intro: [
      ['huntress', 'Gần đây Tuyết Yêu hung dữ khác thường, lông chúng nhuốm màu máu.'],
      ['huntress', 'Mang về cho ta vài nhúm. Ta muốn biết thứ gì đang làm chúng phát điên.'],
    ],
    outro: [
      ['huntress', 'Huyết khí… đúng là của Huyết Ma Châu. Nó đã đi qua đây, xuống phía Huyền Băng Động.'],
      ['huntress', 'Băng ngàn năm trong động khắc chế được huyết khí. Có Băng Tâm, ta sẽ làm được Phong Ấn Phù.'],
    ],
    reward: { exp: 8000, gold: 2000, items: [['stone', 3], ['orb_ice', 1]] },
  }),
  st10: main('c2', {
    name: 'Băng Tâm Ngàn Năm', npc: 'huntress', lv: 19, requires: 'st9', type: 'collect', target: 'q_icecore', count: 1,
    drop: { mob: 'golem', item: 'q_icecore', chance: 0.25 },
    text: 'Lấy Băng Tâm từ lõi Băng Tinh Thạch ở Huyền Băng Động.',
    intro: [['huntress', 'Băng Tâm nằm trong lõi Băng Tinh Thạch. Chúng cứng như sắt, chỉ có lửa mới làm chúng nứt.']],
    outro: [
      ['huntress', 'Lạnh thật… nhưng nó vẫn đập như một trái tim.'],
      ['huntress', 'Phong Ấn Phù khắc xong rồi, chỉ còn thiếu lửa thiêng để kích hoạt. Thứ đó chỉ sư đệ Liệt Dương có.'],
    ],
    reward: { exp: 12000, gold: 3000, items: [['acc_frost', 1], ['stone', 4]] },
  }),
  st10b: main('c2', {
    name: 'Cánh Dơi Trong Động', npc: 'huntress', lv: 20, requires: 'st10', type: 'kill', target: 'icebat', count: 12,
    text: 'Dọn 12 con Băng Dực chặn lối từ Huyền Băng Động sang Hỏa Diệm Sơn.',
    intro: [
      ['huntress', 'Lối sang Hỏa Diệm Sơn đi xuyên qua Huyền Băng Động, mà lũ Băng Dực làm tổ kín cả trần.'],
      ['huntress', 'Dọn đường đi. Trong lúc đó, ta kể ngươi nghe chuyện cũ.'],
    ],
    outro: [
      ['huntress', 'Ba mươi năm trước, Huyền Môn có ba đệ tử, không phải hai.'],
      ['huntress', 'Đại sư huynh của bọn ta học trộm cấm thuật gọi hồn. Sư phụ phát hiện, đuổi hắn khỏi sư môn.'],
      ['huntress', 'Đêm đó hắn lấy trộm Huyết Ma Châu. Sư phụ đuổi theo, dùng cả mạng mình phong ấn viên châu.'],
      ['huntress', 'Còn ta… ta là người đã mở cửa cho hắn chạy. Liệt Dương không bao giờ tha thứ cho ta vì chuyện đó.'],
    ],
    reward: { exp: 13000, gold: 3200, items: [['stone', 3], ['gem_def1', 1]] },
  }),
  st10c: main('c2', {
    name: 'Vua Của Bầy Dơi', npc: 'huntress', lv: 21, requires: 'st10b', type: 'kill', target: 'nb_icebat', count: 1,
    text: 'Hạ Băng Dực Vương ở sâu trong Huyền Băng Động để mở lối sang Hỏa Diệm Sơn.',
    intro: [
      ['huntress', 'Bầy dơi tan rồi, nhưng con đầu đàn vẫn treo mình trước cửa hang phía nam.'],
      ['huntress', 'Băng Dực Vương. Đánh trúng ngươi là ngươi chậm hẳn lại, và nó biết bay ra sau lưng ngươi.'],
      ['huntress', 'Đừng đứng yên một chỗ. Cứ di chuyển liên tục mà đánh.'],
    ],
    outro: [
      ['huntress', 'Lối sang Hỏa Diệm Sơn mở rồi. Gió nóng thổi lên tận đây.'],
      ['huntress', 'Hỏa Diệm Sơn khác hẳn nơi này. Luyện thêm đi, đừng để ta phải lên đó nhặt xác ngươi.'],
    ],
    reward: { gold: 3600, items: [['stone', 4], ['GEM2', 1], ['protect', 1]] },
  }),
  st11: main('c2', {
    name: 'Hai Đệ Tử Huyền Môn', npc: 'huntress', lv: 22, requires: 'st10c', type: 'talk', target: 'fire_master', count: 1,
    text: 'Mang Phong Ấn Phù tới Hỏa Sư Liệt Dương ở Hỏa Diệm Sơn.',
    intro: [['huntress', 'Đưa Phong Ấn Phù này cho hắn. Và nói với hắn… sư tỷ xin lỗi.']],
    outro: [
      ['fire_master', 'Phong Ấn Phù của Huyền Môn… nét bùa này là của sư tỷ.'],
      ['fire_master', '…Bà ấy xin lỗi? Ba mươi năm rồi mới chịu nói câu đó.'],
      ['fire_master', 'Bà ấy có kể với ngươi tên đại sư huynh không? Thẩm Huyền. Kẻ đã giết sư phụ.'],
      ['fire_master', 'Hỏa Kỳ Lân trên đỉnh núi vốn là thần thú hộ sơn. Một tháng trước, có kẻ khảm Huyết Ma Châu vào trán nó.'],
      ['fire_master', 'Ta không nỡ giết nó. Nhưng nếu ngươi phá được viên châu, nó sẽ tỉnh lại.'],
    ],
    reward: { exp: 15000, gold: 4000 },
  }),
  st11b: main('c2', {
    name: 'Lửa Không Tắt', npc: 'fire_master', lv: 23, requires: 'st11', type: 'kill', target: 'fire_spirit', count: 15,
    text: 'Dập 15 đốm Hỏa Linh chặn đường lên Kỳ Lân Đài.',
    intro: [
      ['fire_master', 'Muốn lên Kỳ Lân Đài thì phải qua biển Hỏa Linh. Chúng là lửa thừa từ thân Kỳ Lân, càng ngày càng đông.'],
      ['fire_master', 'Băng khắc hỏa. Nhớ lấy.'],
    ],
    outro: [
      ['fire_master', 'Không tệ. Bộ giáp này rèn trong miệng núi lửa, lửa thường không làm gì được nó.'],
      ['fire_master', 'Mặc vào rồi hãy lên đài. Kỳ Lân không phải Hỏa Linh đâu.'],
    ],
    reward: { exp: 15000, gold: 4000, items: [['arm_fire', 1], ['orb_ice', 1]] },
  }),
  st11c: main('c2', {
    name: 'Lửa Thiêng', npc: 'fire_master', lv: 24, requires: 'st11b', type: 'collect', target: 'mat_ember', count: 10,
    text: 'Gom 10 Hỏa Tinh Thạch để Liệt Dương luyện lửa thiêng cho Phong Ấn Phù.',
    intro: [['fire_master', 'Phong Ấn Phù cần lửa thiêng mới cháy được. Lửa thiêng luyện từ mười viên Hỏa Tinh Thạch.']],
    outro: [
      ['fire_master', 'Xong. Ngọc này giữ lửa trong lòng mà không bỏng tay, coi như quà ra mắt.'],
      ['fire_master', '…Sư tỷ dạo này có khỏe không? Ta chỉ hỏi vậy thôi.'],
    ],
    reward: { exp: 18000, gold: 5000, items: [['acc_flame', 1], ['stone', 5], ['protect', 1]] },
  }),
  st12: main('c2', {
    name: 'Lửa Thiêng Kỳ Lân', npc: 'fire_master', lv: 26, requires: 'st11c', type: 'kill', target: 'qilin', count: 1,
    text: 'Lên Kỳ Lân Đài, đánh bại Hỏa Kỳ Lân và dán Phong Ấn Phù lên trán nó.',
    intro: [
      ['fire_master', 'Ta đã truyền lửa thiêng vào Phong Ấn Phù. Khi Kỳ Lân kiệt sức, dán bùa lên trán nó.'],
      ['fire_master', 'Đừng nương tay. Nó mạnh nhất khi còn đầy huyết khí, và nó kháng lửa. Dùng băng mà đánh.'],
    ],
    outro: [
      ['sys', 'Phong Ấn Phù rực sáng. Huyết Ma Châu trên trán Kỳ Lân vỡ tan thành bụi đỏ, bay về phía tây.'],
      ['qilin', '…Cảm ơn ngươi, người phàm. Ta đã ngủ một giấc ác mộng thật dài.'],
      ['qilin', 'Kẻ khảm châu vào ta đeo mặt nạ trắng, trên người toàn mùi nhang dẫn hồn.'],
      ['qilin', 'Hắn bảo viên châu cần lửa của ta nuôi đủ một tháng. Hắn bảo sẽ có người đến phá nó giúp hắn.'],
      ['me', '…Người đến phá nó giúp hắn?'],
      ['fire_master', 'Bụi đỏ bay về phía tây… về phía Nghĩa Địa Cổ. Ngươi vừa làm đúng điều hắn muốn.'],
      ['fire_master', 'Nhưng không sao. Hôm nay ngươi đã cứu cả ngọn núi này. Từ nay ngươi là Người Giữ Phong Ấn.'],
    ],
    reward: { exp: 50000, gold: 25000, items: [['W6', 1], ['acc_five_elements', 1], ['stone', 10], ['protect', 3]], title: 'Người Giữ Phong Ấn' },
  }),

  // ================= CHAPTER 3 =================
  st13: main('c3', {
    name: 'Tro Tàn Trở Về', npc: 'fire_master', lv: 27, requires: 'st12', type: 'talk', target: 'lan', count: 1,
    text: 'Về Làng Trúc Lâm gặp Tiểu Lan.',
    intro: [
      ['fire_master', 'Đạo Trưởng làng ngươi tên Huyền Cơ, nhận ra chuông Trấn Hồn, lại rành Nhang Dẫn Hồn?'],
      ['fire_master', 'Thẩm Huyền năm xưa giỏi nhất môn chế hương. Và hắn luôn đeo mặt nạ trắng mỗi khi luyện cấm thuật.'],
      ['me', 'Không thể nào… Ông ấy đã giúp tôi suốt từ đầu.'],
      ['fire_master', 'Hoặc là đã dùng ngươi suốt từ đầu. Về Trúc Lâm ngay. Con bé Thuần Âm đang ở gần hắn nhất.'],
    ],
    outro: [
      ['lan', 'Đại hiệp về rồi! Em đợi mãi…'],
      ['lan', 'Đạo Trưởng đi đâu mất từ ba hôm trước. Am của ông ấy khóa trái, đêm nào cũng có mùi nhang bay ra.'],
      ['lan', 'Hôm qua em lén nhìn qua khe cửa… trên bàn thờ có một chiếc mặt nạ trắng.'],
      ['lan', 'Đại hiệp… người trong giấc mơ của em có phải là…'],
      ['me', 'Đừng sợ. Có ta ở đây.'],
    ],
    reward: { exp: 12000, gold: 3000 },
  }),
  st14: main('c3', {
    name: 'Nhật Ký Trong Am', npc: 'lan', lv: 27, requires: 'st13', type: 'talk', target: 'elder', count: 1,
    text: 'Xin Trưởng Làng mở am của Đạo Trưởng.',
    intro: [
      ['lan', 'Chìa khóa am Đạo Trưởng do Trưởng Làng giữ. Ông ấy không cho em vào đâu.'],
      ['lan', 'Đại hiệp đi hỏi đi. Ông ấy thương đại hiệp nhất làng.'],
    ],
    outro: [
      ['elder', 'Lão biết sớm muộn gì cũng có ngày này.'],
      ['elder', 'Ba mươi năm trước, Huyền Cơ lết vào làng giữa đêm mưa, người đầy máu, trong tay nải có một chiếc mặt nạ trắng. Lão đã cứu hắn.'],
      ['elder', 'Hắn trừ tà giúp làng ba mươi năm. Lão cứ ngỡ hắn đã chôn quá khứ rồi.'],
      ['sys', 'Trưởng Làng mở am. Trên bàn thờ có một cuốn nhật ký đã ngả vàng.'],
      ['sys', '"Sư phụ chết vì ta. Ta chỉ muốn học cách gọi người chết trở về, sư phụ lại gọi đó là cấm thuật."'],
      ['sys', '"Cần ba thứ: thân xác Thuần Âm làm vật chứa, huyết khí của Huyết Ma Châu làm lửa dẫn, và Chuông Trấn Hồn để gọi hồn."'],
      ['sys', '"Cái bóng ta luyện từ viên châu đã phản chủ, bắt con bé đi trước kỳ. Đứa trẻ mang ấn ký đã diệt nó giúp ta."'],
      ['sys', '"Viên châu nuôi trong lửa Kỳ Lân đã đủ ngày. Chỉ cần có người phá nó, huyết khí sẽ tự chảy về Cổ Tự."'],
      ['sys', '"Đứa trẻ đó đã cướp chuông trên tế đàn. Ta lỡ tay đánh nó mất trí. Có lẽ là ý trời: cứ để nó làm thanh kiếm thay ta."'],
      ['me', '…Thanh kiếm thay ông ta.'],
      ['elder', 'Trang cuối viết: "Đêm trăng máu thứ hai, tại Huyền Môn Cổ Tự."'],
    ],
    reward: { exp: 12000, gold: 3000 },
  }),
  st15: main('c3', {
    name: 'Lời Thú Nhận Của A Tuyết', npc: 'elder', lv: 28, requires: 'st14', type: 'talk', target: 'huntress', count: 1,
    text: 'Lên Tuyết Sơn hỏi A Tuyết đường tới Huyền Môn Cổ Tự.',
    intro: [
      ['elder', 'Huyền Môn Cổ Tự ở đâu, lão không biết. Nhưng người Huyền Môn thì còn A Tuyết trên Tuyết Sơn.'],
      ['elder', 'Đi đi con. Lão sẽ trông chừng con bé Tiểu Lan.'],
    ],
    outro: [
      ['huntress', 'Thẩm Huyền… Huyền Cơ… Hắn chẳng buồn đổi tên cho khác đi.'],
      ['huntress', 'Năm đó ta mở cửa cho hắn chạy vì hắn khóc, nói chỉ muốn cứu sư phụ. Ta đã tin.'],
      ['huntress', 'Cổ Tự nằm sau một bức tường ảo giữa Nghĩa Địa Cổ. Ta đã vẽ lại lối mở lên bản đồ của ngươi.'],
      ['huntress', 'Sư phụ từng dặn: Chuông Trấn Hồn không gọi hồn theo ý người rung, mà theo ý người được gọi.'],
      ['huntress', 'Nếu hắn bắt ngươi rung chuông, hãy nhớ câu đó. Ta và Liệt Dương sẽ đợi ngươi ở cổng Cổ Tự.'],
    ],
    reward: { exp: 13000, gold: 3200, items: [['hp_l', 10], ['mp_l', 5]] },
  }),
  st16: main('c3', {
    name: 'Âm Binh Huyết Sắc', npc: 'huntress_temple', lv: 28, requires: 'st15', type: 'kill', target: 'blood_jiangshi', count: 15,
    text: 'Diệt 15 Huyết Cương Thi ở sân ngoài Huyền Môn Cổ Tự để hai đệ tử lập trận.',
    intro: [
      ['huntress_temple', 'Ngươi tới rồi. Cả Liệt Dương cũng tới… cái tên cứng đầu đó.'],
      ['fire_master_temple', 'Ta tới vì sư phụ, không phải vì sư tỷ.'],
      ['huntress_temple', '…Ừ.'],
      ['huntress_temple', 'Sân ngoài đầy Huyết Cương Thi, xác người hắn nuôi bằng huyết khí. Dọn đường cho bọn ta lập trận.'],
    ],
    outro: [
      ['huntress_temple', 'Trận đã dựng. Huyết khí bị chặn ở chính điện, hắn không hút thêm được nữa.'],
      ['fire_master_temple', 'Sư tỷ… năm đó nếu là ta, có lẽ ta cũng mở cửa cho hắn.'],
      ['huntress_temple', 'Ngươi nói gì?'],
      ['fire_master_temple', 'Không có gì. Lo đánh đi.'],
    ],
    reward: { exp: 16000, gold: 4000, items: [['stone', 5], ['gem_atk2', 1]] },
  }),
  st16b: main('c3', {
    name: 'Tướng Quân Không Đầu Hàng', npc: 'huntress_temple', lv: 29, requires: 'st16', type: 'kill', target: 'nb_blood_jiangshi', count: 1,
    text: 'Hạ Huyết Thi Tướng canh cửa Chính Điện ở cuối Huyền Môn Cổ Tự.',
    intro: [
      ['huntress_temple', 'Trước cửa chính điện có một cái xác mặc giáp tướng. Hắn từng là tướng quân giữ thành này.'],
      ['fire_master_temple', 'Thẩm Huyền dùng huyết khí trói hồn ông ta lại. Mỗi nhát ngươi chém trúng, nó sẽ dội ngược vào ngươi.'],
      ['huntress_temple', 'Đánh từng nhịp, máu thấp thì lùi ra uống thuốc. Đừng tham đòn.'],
    ],
    outro: [
      ['sys', 'Huyết Thi Tướng quỳ xuống, đầu gục trên cán thương. Cánh cửa chính điện kẽo kẹt mở ra một khe.'],
      ['fire_master_temple', 'Ông ta được yên nghỉ rồi. Đến lượt Thẩm Huyền.'],
    ],
    reward: { gold: 6000, items: [['stone', 5], ['GEM2', 1], ['protect', 1]] },
  }),
  st17: main('c3', {
    name: 'Nửa Kia Của Chiếc Chuông', npc: 'fire_master_temple', turnIn: 'smith', lv: 30, requires: 'st16b', type: 'collect', target: 'q_bell2', count: 1,
    drop: { mob: 'maskghost', item: 'q_bell2', chance: 0.3 },
    text: 'Lấy nửa chiếc chuông còn lại từ Bạch Diện Quỷ, mang về Thợ Rèn Anh Sắt ở làng để nối lại.',
    intro: [
      ['fire_master_temple', 'Lũ Bạch Diện Quỷ kia đeo mặt nạ giống hắn. Hắn chia hồn mình ra để canh nửa chiếc chuông còn lại.'],
      ['fire_master_temple', 'Lấy lại nó. Chuông nguyên vẹn thì hắn mới sợ.'],
      ['fire_master_temple', 'Pháp khí Huyền Môn rèn bằng đồng thiên thạch, nối lại phải nhờ thợ giỏi. Làng ngươi có ai không?'],
      ['me', 'Có. Anh Sắt.'],
    ],
    outro: [
      ['smith', 'Đồng thiên thạch? Cả đời tôi mới thấy lần đầu!'],
      ['smith', 'Nối pháp khí thì không dùng búa. Phải dùng lửa và… cái này.'],
      ['sys', 'Anh Sắt ép một viên Hoàng Ngọc vào vết nứt. Hai nửa chuông liền lại không còn đường nối.'],
      ['sys', 'Chiếc chuông tự rung lên một tiếng. Ký ức ùa về như nước vỡ bờ…'],
      ['sys', 'Đêm trăng máu ba tháng trước. Bạn, một kẻ lữ hành, lạc vào Cổ Tự. Người đeo mặt nạ trắng đang tụng chú bên tế đàn.'],
      ['sys', 'Chiếc chuông trên tế đàn tự bay vào tay bạn. Hắn quát lên, một luồng huyết quang đánh thẳng vào trán bạn…'],
      ['me', 'Tôi nhớ ra rồi. Chuông đã chọn tôi, không phải chọn hắn.'],
      ['smith', 'Tôi chẳng hiểu gì cả, nhưng nghe ngầu đấy. Cầm lấy, đi đánh cho hắn một trận.'],
    ],
    reward: { exp: 20000, gold: 5000, items: [['acc_bell', 1]] },
  }),
  st18: main('c3', {
    name: 'Đêm Trăng Máu Thứ Hai', npc: 'elder', lv: 32, requires: 'st17', type: 'kill', target: 'blood_demon', count: 1,
    text: 'Vào Chính Điện ở cuối Huyền Môn Cổ Tự, cứu Tiểu Lan và chấm dứt mọi chuyện.',
    intro: [
      ['elder', 'Con về rồi! Tiểu Lan… con bé biến mất lúc chập tối. Cửa am Đạo Trưởng mở toang.'],
      ['elder', 'Trăng lại đỏ như ba tháng trước. Lão già này không làm được gì nữa, chỉ biết trông vào con.'],
      ['me', 'Tôi sẽ đưa cô bé về. Lần này, kết thúc mọi chuyện.'],
    ],
    outro: [
      ['sys', 'Huyết Ma tan biến. Giữa tro bụi, Huyền Cơ nằm đó, chiếc mặt nạ trắng vỡ làm đôi.'],
      ['priest', 'Ta đã… làm gì thế này…'],
      ['old_master', 'Thẩm Huyền, về thôi con. Ta đợi con ba mươi năm rồi.', 'bell=ring'],
      ['priest', 'Sư phụ… con xin lỗi.', 'bell=ring'],
      ['me', 'Tiếng chuông cuối cùng này là để tiễn ông.', 'bell=refuse'],
      ['sys', 'Bạn rung chuông. Trong ánh sáng, một bóng hình già nua hiện ra, đưa tay về phía Huyền Cơ.', 'bell=refuse'],
      ['priest', 'Sư phụ… người đến đón con sao?', 'bell=refuse'],
      ['sys', 'Hai bóng hình nhạt dần trong tiếng chuông ngân. Lần này chuông gọi hồn đi, chứ không gọi về.'],
      ['lan', 'Đại hiệp! Em mơ thấy Đạo Trưởng xoa đầu em, bảo em về nhà đi…'],
      ['elder', 'Con đã cứu làng này hai lần. Từ nay Trúc Lâm là nhà của con.'],
      ['sys', 'Chương 3 kết thúc. Chuông Trấn Hồn đã chọn người kế thừa Huyền Môn.'],
    ],
    reward: { exp: 45000, gold: 30000, items: [['W7', 1], ['stone', 10], ['protect', 3], ['gem_atk3', 1]], title: 'Chưởng Môn Huyền Môn' },
  }),

  // Tiểu Lan's daily gift (after she is rescued)
  d_gift: {
    cat: 'daily', name: 'Túi Bùa Bình An', npc: 'lan', lv: 1, requires: 'st7', daily: true, type: 'talk', target: 'lan', count: 1,
    text: 'Ghé thăm Tiểu Lan mỗi ngày để nhận quà.',
    intro: [['lan', 'Đại hiệp! Hôm nay em gấp được một túi bùa bình an, tặng đại hiệp nè.']],
    outro: [['lan', 'Ngày mai nhớ ghé em nữa nha!']],
    reward: { exp: 200, gold: 100, items: [['hp_l', 3], ['mp_l', 2], ['stone', 1]], random: [['protect', 0.15], ['orb_thunder', 0.05], ['gem_hp1', 0.2], ['gem_mp1', 0.2]] },
  },
};

// ================= STORY SCENES ON MAP ENTRY =================
// When the player enters `map` while quest `quest` is active, the dialogue plays once.
// choices: each choice sets a story flag and plays its own extra dialogue.
export const SCENES = {
  sc_altar: {
    map: 'sanctum', quest: 'st18',
    lines: [
      ['sys', 'Giữa chính điện, Tiểu Lan nằm trên tế đàn, quanh người cắm chín nén Nhang Dẫn Hồn.'],
      ['priest', 'Ngươi tới rồi. Ta biết ngươi sẽ tới.'],
      ['priest', 'Ngươi đã đọc nhật ký. Vậy thì hiểu cho ta. Ta không muốn hại ai, ta chỉ muốn sư phụ sống lại.'],
      ['priest', 'Con bé sẽ không chết, chỉ ngủ một giấc dài. Rung chuông đi. Chỉ một tiếng thôi.'],
    ],
    choices: [
      { label: 'Rung chuông', flag: ['bell', 'ring'], lines: [
        ['sys', 'Bạn rung chuông. Âm thanh trong vắt lan khắp chính điện.'],
        ['sys', 'Nhưng thứ hiện ra không bước vào thân xác Tiểu Lan. Một bóng hình già nua đứng giữa không trung, ánh mắt buồn bã.'],
        ['old_master', 'Thẩm Huyền. Ba mươi năm rồi, con vẫn chưa chịu buông.'],
        ['priest', 'Sư phụ! Con… con chỉ muốn…'],
        ['old_master', 'Ta không về. Người chết thì để người chết yên. Con trói ta lại đây mới là cấm thuật.'],
        ['priest', 'Không… KHÔNG! Huyết khí, nghe lệnh ta!'],
        ['sys', 'Huyết khí khắp Cổ Tự cuộn về, nhấn chìm Huyền Cơ. Mặt nạ trắng nứt toác.'],
      ] },
      { label: 'Không bao giờ', flag: ['bell', 'refuse'], lines: [
        ['me', 'Chuông Trấn Hồn gọi hồn theo ý người được gọi. Sư phụ ông không muốn về.'],
        ['priest', 'Ngươi thì biết gì về sư phụ ta?!'],
        ['priest', 'Không rung thì ta tự lấy. Huyết khí, nghe lệnh ta!'],
        ['sys', 'Huyết khí khắp Cổ Tự cuộn về, nhấn chìm Huyền Cơ. Mặt nạ trắng nứt toác.'],
      ] },
    ],
  },
};

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

for (const id of BIG) STORY_QUESTS[id].reward.exp = Math.round(needExp(STORY_QUESTS[id].lv) * EXP_SHARE.chapterFinale / 10) * 10;
