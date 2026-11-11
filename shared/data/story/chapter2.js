// Main story: chapter 2 · Huyết Ma Châu
import { main } from './helpers.js';

export const CHAPTER2 = {
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
};
