// Main story: prologue
import { main } from './helpers.js';

export const PROLOGUE = {
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
};
