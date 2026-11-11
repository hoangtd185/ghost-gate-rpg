// Main story: chapter 1 · Mệnh Thuần Âm
import { main } from './helpers.js';

export const CHAPTER1 = {
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
};
