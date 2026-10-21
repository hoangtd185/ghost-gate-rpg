// Everyday NPC lines that change with story progress, time of day, level, class, pet, title…
//
// Each line is a string, or [string, condition]. Conditions (all must hold):
//   a: 'st7'    quest done                 b: 'st7'   quest not done yet
//   lv: [min, max]                          cls: 'swordsman' | 'taoist' | 'assassin'
//   night: true/false (19:00–05:00 local)   pet: true/false   title: true (has a title)
//   enh: 5  (wielded weapon is +5 or more)  gem: true (wearing gear with gems)
//   flag: 'bell=ring'
// Placeholders: {name} {cls} {title} {lv} {weapon} {main}
//
//   lines – said by the NPC when the player stands nearby (speech bubble)
//   greet – opening line when talking to the NPC
//   hi    – greeting when the player walks up
export const CHATTER = {
  elder: {
    lines: [
      'Năm nay mưa thuận gió hòa, chỉ có ma là không thuận.',
      'Hồi trẻ lão cũng từng cầm kiếm đấy. Giờ thì cầm gậy cho chắc.',
      'Tre làng mình mọc thẳng, người làng mình sống cũng phải thẳng.',
      'Ai đi qua cổng làng cũng phải chào cây đa. Lệ làng đấy.',
      ['Con ngủ ba ngày, lão tưởng con không dậy nữa.', { b: 'm2' }],
      ['Đêm qua trăng đỏ. Lão sống sáu mươi năm mới thấy hai lần.', { a: 'm4', b: 'st7' }],
      ['Con bé Tiểu Lan… lão không dám nhìn mặt Bà Tư nữa.', { a: 'st1', b: 'st7' }],
      ['Từ hôm Tiểu Lan về, Bà Tư cười suốt. Lão cũng cười theo.', { a: 'st7', b: 'st13' }],
      ['Bù nhìn ngoài đồng yên rồi. Mùa này chắc được mùa.', { a: 'st4' }],
      ['Am Đạo Trưởng vẫn khóa. Lão không nỡ dọn.', { a: 'st14' }],
      ['Ba mươi năm lão cứ ngỡ mình cứu một người tốt.', { a: 'st14', b: 'st18' }],
      ['Mỗi năm lão sẽ thắp cho Huyền Cơ một nén nhang. Nhang thường thôi.', { a: 'st18' }],
      ['{name} à, ngủ sớm đi. Khuya rồi ma nó ra đấy.', { night: true }],
      ['Trời sáng rồi, ra đồng thôi… à quên, ruộng đầy bù nhìn sống.', { night: false, b: 'st4' }],
      ['Người ta gọi con là {title}. Lão nghe mà nở mày nở mặt.', { title: true }],
      ['Con ma nhỏ theo con dạo này mập ra đấy. Cho nó ăn gì thế?', { pet: true }],
      ['Kiếm Khách phải biết lúc nào thu kiếm. Ai cũng chém thì ai giữ làng?', { cls: 'swordsman' }],
      ['Đạo Sĩ mà chân yếu thì quỷ nó đuổi kịp đấy, nhớ cộng ít Thể.', { cls: 'taoist' }],
      ['Thích Khách đi đứng nhẹ quá, lão cứ giật mình.', { cls: 'assassin' }],
      ['Cả làng nói về con đấy. Lão già này cũng được khoe ké.', { lv: [20, 99] }],
    ],
    greet: [
      'Con đến rồi đấy à, {name}. Có việc gì cần lão giúp?',
      'Ngồi xuống đây, uống chén trà đã.',
      ['Người ngủ ba ngày mà dậy khỏe thế là có phúc lắm.', { b: 'm2' }],
      ['Tiểu Lan vẫn chưa có tin gì… lão sốt ruột lắm.', { a: 'st1', b: 'st7' }],
      ['Trấn Quỷ Sư của làng ta đây rồi! Hôm nay muốn gì cứ nói.', { a: 'st7', b: 'st13' }],
      ['Con đã biết hết rồi phải không… về chuyện Huyền Cơ.', { a: 'st14', b: 'st18' }],
      ['Trúc Lâm là nhà con. Đi đâu cũng nhớ đường về.', { a: 'st18' }],
    ],
    hi: ['Ồ, {name} đấy à!', 'Đi đâu mà vội thế con?', ['Khuya rồi còn đi đâu?', { night: true }]],
  },

  healer: {
    lines: [
      'Lá ngải phơi ba nắng mới thơm, người phải ngã ba lần mới khôn.',
      'Ai thấy chóng mặt thì ghé bà, có trà gừng.',
      'Bình máu nhỏ thì rẻ, bình lớn thì đắt. Mạng thì có một, đừng tiếc tiền.',
      'Thuốc đắng dã tật, lời thật mất lòng. Bà thì toàn bán thuốc đắng.',
      ['Tiểu Lan ơi… con ở đâu…', { a: 'st1', b: 'st7' }],
      ['Con bé nhà bà lại trốn ra bờ suối hái hoa rồi.', { a: 'st7', b: 'st18' }],
      ['Từ hôm về, đêm nào Tiểu Lan cũng nói mê. Bà lo quá.', { a: 'st7', b: 'st12' }],
      ['Đạo Trưởng tốt với làng thật… nhưng mắt ông ấy lúc nào cũng buồn.', { a: 'st7', b: 'st13' }],
      ['Nhang Dẫn Hồn… lẽ ra bà phải nhận ra mùi đó sớm hơn.', { a: 'st14' }],
      ['Tiểu Lan lại mất tích… lần này bà không khóc nữa. Bà tin con.', { a: 'st17', b: 'st18' }],
      ['Mặt con xanh quá, {name}. Ăn uống gì chưa?', { night: true }],
      ['Pet của con dễ thương thế. Nó có uống thuốc được không nhỉ?', { pet: true }],
      ['Đạo Sĩ mà cũng mua thuốc à? Tự hồi máu được cơ mà!', { cls: 'taoist', lv: [10, 99] }],
      ['Kiếm Khách toàn lao vào trước, nên toàn mua thuốc nhiều nhất.', { cls: 'swordsman' }],
    ],
    greet: [
      'Bà bán thuốc, không bán lời khuyên. Nhưng lời khuyên thì cho không: đừng liều.',
      'Mua gì thì mua, nhưng phải về nhà nguyên vẹn cho bà.',
      ['Tiểu Lan… con có tin gì không?', { a: 'st1', b: 'st7' }],
      ['Ân nhân của nhà bà đây rồi! Lấy gì cứ lấy, bà tính rẻ.', { a: 'st7' }],
    ],
    hi: ['Lại bị thương ở đâu rồi?', 'Ồ, con đấy à.', ['Khuya rồi, uống chén trà gừng không?', { night: true }]],
  },

  smith: {
    lines: [
      'Keng! Keng! …Gì? Đang nghe đây!',
      'Thép tốt phải qua lửa, người tốt phải qua chuyện.',
      'Đá Cường Hóa nhặt được thì đừng bán, mang tới đây.',
      'Có ai cường hóa lên +10 chưa nhỉ? Tôi muốn xem tận mắt một lần.',
      'Hôm qua có người ép ba viên Hồng Ngọc vào một cây kiếm gỗ. Tôi cũng chịu.',
      'Ngọc Sơ phẩm hợp ba viên thành Trung phẩm. Đừng để ngọc mốc trong túi.',
      ['{weapon} của cậu cần mài rồi đấy.', { weapon: true }],
      ['{weapon}… tay nghề tôi đấy, đừng nói với ai.', { enh: 5 }],
      ['Đồ có ép ngọc nhìn sang hẳn ra nhỉ?', { gem: true }],
      ['Lò rèn ban đêm đẹp nhất. Lửa đỏ rực, không ai làm phiền.', { night: true }],
      ['Đồng thiên thạch… cả đời mới thấy một lần. Tôi vẫn còn run tay.', { a: 'st17' }],
      ['Kiếm Khách thì tôi quý nhất. Ai cũng cần kiếm, mà kiếm thì cần tôi.', { cls: 'swordsman' }],
      ['Trượng của Đạo Sĩ gỗ là chính, tôi chỉ bọc đồng. Nhưng bọc đẹp đấy nhé.', { cls: 'taoist' }],
      ['Phi tiêu mài mỏng quá dễ gãy, mài dày quá thì bay không xa. Khó lắm đấy.', { cls: 'assassin' }],
    ],
    greet: [
      'Rèn, mua, ép ngọc, cứ nói. Búa tôi không biết mệt.',
      'Muốn mạnh lên nhanh thì cường hóa vũ khí trước, rồi mới tới giáp.',
      'Lên +7 là mở thêm lỗ khảm đấy. Đáng thử.',
      ['Chuông Trấn Hồn vẫn kêu tốt chứ? Tôi hỏi thật đấy.', { a: 'st17' }],
    ],
    hi: ['Keng! Ơ, chào!', 'Binh khí có cần mài không?', ['Muộn thế này còn rèn à? Tôi thì lúc nào cũng được.', { night: true }]],
  },

  constable: {
    lines: [
      'Bắt được yêu thì lĩnh thưởng, bắt không được thì lĩnh mắng.',
      'Quan phủ trả thưởng sòng phẳng, ta làm chứng.',
      'Bảng truy nã mới dán sáng nay, mực còn chưa khô.',
      'Có kẻ trộm gà nhà Lão Lý. Ta nghi là con hồ ly.',
      ['Ca trực đêm chán chết. Chỉ có ma với ta.', { night: true }],
      ['Ngươi lên Tuyết Sơn chưa? Đoàn buôn kêu trời mỗi ngày.', { lv: [14, 99] }],
      ['Ta nghe nói có người một mình vào Quỷ Môn Quan rồi đi ra. Ngươi à?', { a: 'st7' }],
      ['Một đạo sĩ phản sư môn trốn ba mươi năm ngay trong làng… nghe như truyện.', { a: 'st14' }],
    ],
    greet: [
      'Truy nã hôm nay đây. Diệt đủ số rồi về lĩnh thưởng.',
      ['Ồ, {title} {name}! Quan phủ có lời khen.', { title: true }],
    ],
    hi: ['Đứng lại! …À, người quen.', 'Có việc thì nói nhanh, ta đang trực.'],
  },

  priest: {
    lines: [
      'Âm dương có trật tự, sống chết có thời. Kẻ phá trật tự thì trời phạt.',
      'Bần đạo trấn yểm ngôi làng này đã ba mươi năm.',
      'Nhang hôm nay cháy lệch. Không phải điềm lành.',
      ['Người mang ấn ký… ngươi có nhớ ra gì chưa?', { a: 'm3', b: 'st7' }],
      ['Chuông Trấn Hồn, ngươi cứ giữ cẩn thận.', { a: 'm3' }],
      ['Sư phụ bần đạo từng nói: người chết thì nên để yên. Bần đạo… vẫn chưa hiểu hết câu đó.', { a: 'st6' }],
      ['Đêm rằm sắp tới. Bần đạo sẽ trông chừng làng.', { a: 'st6', b: 'st7' }],
      ['Kẻ đeo mặt nạ trắng? Chắc con bé hoảng quá mà mơ thôi.', { a: 'st7' }],
      ['Ngươi lên tới Tuyết Sơn rồi à? …Có gặp ai không?', { a: 'st8' }],
      ['Đêm nay trăng sáng. Bần đạo muốn ngồi một mình.', { night: true }],
      ['Đạo Sĩ trẻ như ngươi, nếu sinh sớm ba mươi năm, chắc đã là đồng môn của bần đạo.', { cls: 'taoist' }],
    ],
    greet: [
      'Vô lượng thiên tôn. Ngươi tìm bần đạo có việc gì?',
      'Âm khí hôm nay nặng. Cẩn thận.',
      ['Ngươi làm tốt lắm. Hơn cả bần đạo mong đợi.', { a: 'st7' }],
    ],
    hi: ['Vô lượng thiên tôn.', ['Ấn ký trên tay ngươi… hôm nay sáng hơn.', { a: 'm3' }]],
  },

  fisherman: {
    lines: [
      'Sương độc thế này, cá chết, người cũng chết.',
      'Lão chài sáu mươi năm, chưa thấy con ếch nào to như con chó.',
      'Lâu lắm mới có người tới chỗ lão. Ngồi đi, câu với lão một lúc.',
      ['Con thuyền giấy đêm ấy… lão còn nằm mơ thấy.', { a: 'st5' }],
      ['Đêm xuống là Thủy Quỷ lên. Đứng xa mép nước ra.', { night: true }],
      ['Hương Phá Chướng của ngươi thơm thế. Đạo Trưởng chế à? Khéo tay thật.', { a: 'st4b', b: 'st13' }],
      ['Ếch ít đi rồi, lão lại thả lưới được.', { a: 'q_frog' }],
    ],
    greet: [
      'Cá thì hết rồi, chỉ còn thuốc. Mua thì mua đi.',
      ['Ngươi lại tới. Có tin gì của cô bé áo trắng không?', { a: 'st5', b: 'st7' }],
      ['Cô bé áo trắng về nhà rồi à? Tốt, tốt lắm.', { a: 'st7' }],
    ],
    hi: ['Suỵt! Cá cắn câu.', 'Ồ, người lạ.'],
  },

  huntress: {
    lines: [
      'Tuyết lở từ đỉnh núi xuống chỉ cần một tiếng hét. Đừng hét.',
      'Lông Tuyết Hồ ấm nhất, nhưng Tuyết Hồ cắn đau nhất.',
      'Ta ở trên núi này lâu tới mức quên mất mùa hè có màu gì.',
      ['Liệt Dương… hắn vẫn còn giận ta sao?', { a: 'st8', b: 'st11' }],
      ['Ba mươi năm không gặp, hắn già đi nhiều không?', { a: 'st11', b: 'st16' }],
      ['Thẩm Huyền… ta đã tin hắn một lần. Đó là lần cuối.', { a: 'st15', b: 'st18' }],
      ['Ban đêm trên núi, sao gần tới mức với tay là chạm.', { night: true }],
      ['Thích Khách à? Bước chân nhẹ đấy. Đi săn với ta không?', { cls: 'assassin' }],
    ],
    greet: [
      'Lạnh thế này mà còn lên được tới đây, ngươi cũng gan đấy.',
      ['Áo ấm chưa? Chưa thì đừng đi sâu hơn.', { b: 'st8b' }],
      ['Ngươi mang lửa thiêng đi cùng hy vọng của ta. Cảm ơn.', { a: 'st12' }],
    ],
    hi: ['Ai đó?', 'Ngươi lại lên núi à.'],
  },

  lan: {
    lines: [
      'Em hái được hoa cúc dại nè, đại hiệp có muốn một bông không?',
      'Bà em bảo em là "Thuần Âm". Nghe như tên một loại bánh.',
      'Lớn lên em cũng muốn làm đại hiệp!',
      'Anh Sắt hứa rèn cho em một thanh kiếm gỗ đào.',
      ['Tiểu Quỷ ơi, lại đây chơi với chị!', { pet: true }],
      ['Đêm qua em lại mơ thấy kỳ lân. Lần này nó không khóc nữa.', { a: 'st12' }],
      ['Đêm nay trăng tròn… em hơi sợ.', { night: true, b: 'st18' }],
      ['Em không sợ trăng nữa rồi.', { night: true, a: 'st18' }],
      ['Em nhớ Đạo Trưởng… dù ông ấy đã làm thế.', { a: 'st18' }],
      ['Bà em bảo đại hiệp là {title}. Ngầu quá!', { title: true }],
    ],
    greet: [
      'Đại hiệp! Hôm nay đại hiệp đi đánh quỷ ở đâu thế?',
      'Đại hiệp về rồi! Em đợi mãi.',
    ],
    hi: ['Đại hiệp ơi!', 'A, đại hiệp!'],
  },

  fire_master: {
    lines: [
      'Lửa không biết tha thứ. Ta cũng vậy.',
      'Núi này mà phun trào thì cả thiên hạ thành tro.',
      ['Hỏa Kỳ Lân ngủ yên rồi. Đêm nào ta cũng lên nghe nó thở.', { a: 'st12' }],
      ['Sư tỷ… bà ấy có khỏe không?', { a: 'st11', b: 'st16' }],
      ['Sư tỷ hứa sẽ ghé uống trà. Ta đã pha sẵn rồi.', { a: 'st18' }],
      ['Đạo Sĩ mà không biết dùng lửa thì phí cả đời tu.', { cls: 'taoist' }],
    ],
    greet: [
      'Muốn lên Kỳ Lân Đài thì mặc giáp kháng hỏa vào.',
      ['Người Giữ Phong Ấn. Ngọn núi này nợ ngươi.', { a: 'st12' }],
    ],
    hi: ['Hừm.', 'Nóng không? Quen là được.'],
  },

  embroiderer: {
    lines: [
      'Một tấm tiên y phải thêu ba ngày ba đêm, không được sai một mũi.',
      'Cánh Đào Ma đẹp lắm, mà Hồ Ly Tinh cứ giấu đi đâu mất.',
      'Tơ Băng Tằm trên Tuyết Sơn mảnh như sương, đứt một sợi là tiếc cả tháng.',
      ['Tiên Lộ à… boss nào cũng giữ khư khư.', {}],
      ['Bộ đồ đẹp đấy! Ai thêu cho cậu vậy?', { gem: true }],
      ['Đêm thêu dưới đèn là đẹp nhất.', { night: true }],
    ],
    greet: ['Muốn chế gì nào? Mang nguyên liệu tới là được.', 'Thêu tiên y thì cần Tiên Lộ, nhớ đấy.'],
    hi: ['Ồ, khách quý!', 'Lại đây xem đồ mới này!'],
  },
  huntress_temple: {
    lines: [
      'Huyết khí ở đây đặc tới mức ngửi thấy vị sắt.',
      ['Thẩm Huyền… sao ngươi lại thành ra thế này.', { b: 'st18' }],
      ['Xong rồi. Ta nên về núi thôi… nhưng chắc phải ghé Hỏa Diệm Sơn trước.', { a: 'st18' }],
    ],
    greet: [
      ['Cẩn thận lũ Bạch Diện Quỷ. Chúng bắn hồn hỏa từ xa.', { b: 'st18' }],
      ['Cảm ơn ngươi đã tiễn hắn đi.', { a: 'st18' }],
    ],
    hi: ['Ngươi tới rồi.'],
  },

  fire_master_temple: {
    lines: [
      'Ta không đứng sau ai cả.',
      ['Sư tỷ, năm đó… thôi, đánh xong rồi nói.', { b: 'st18' }],
      ['Ba mươi năm giận một người, mệt thật.', { a: 'st18' }],
    ],
    greet: [['Nửa chiếc chuông kia, lấy được chưa?', { b: 'st17' }], 'Hừm.'],
    hi: ['Hừm.'],
  },
};

// NPCs talking to each other (when near the player). map: where it happens.
export const BANTER = [
  { map: 'village', when: { b: 'st1' }, lines: [
    ['elder', 'Bà Tư ơi, thuốc đau lưng của lão hết rồi.'],
    ['healer', 'Lão Lý, ông uống như uống trà thì hết là phải!'],
    ['elder', 'Thì nó ngon…'],
  ] },
  { map: 'village', lines: [
    ['smith', 'Bộ Khoái! Cho mượn cái khiên làm đe nhé?'],
    ['constable', 'Đó là khiên của quan phủ!'],
    ['smith', 'Thì quan phủ cũng cần đe mà.'],
  ] },
  { map: 'village', lines: [
    ['constable', 'Bà Tư, có thuốc nào chữa buồn ngủ không?'],
    ['healer', 'Có. Đi ngủ.'],
  ] },
  { map: 'village', when: { a: 'st1', b: 'st7' }, lines: [
    ['healer', 'Đạo Trưởng, Tiểu Lan nhà tôi… có cứu được không?'],
    ['priest', 'Còn trước đêm rằm thì còn hy vọng.'],
    ['healer', 'Tôi đặt cả vào ông đấy.'],
  ] },
  { map: 'village', when: { a: 'st7', b: 'st13' }, lines: [
    ['lan', 'Trưởng Làng ơi, kể chuyện ma đi!'],
    ['elder', 'Con vừa bị ma bắt mà còn muốn nghe chuyện ma?'],
    ['lan', 'Vì giờ em không sợ nữa!'],
  ] },
  { map: 'village', when: { a: 'st7', b: 'st13' }, lines: [
    ['priest', 'Tiểu Lan, đêm qua con có mơ gì không?'],
    ['lan', 'Có ạ… em mơ thấy kỳ lân.'],
    ['priest', '…Vậy à. Ngủ ngon nhé.'],
  ] },
  { map: 'village', when: { a: 'st7', b: 'st18' }, lines: [
    ['lan', 'Anh Sắt ơi, rèn cho em một thanh kiếm!'],
    ['smith', 'Con nít cầm kiếm làm gì?'],
    ['lan', 'Để đánh quỷ giống đại hiệp!'],
    ['smith', 'Được, kiếm gỗ nhé. Gỗ đào trừ tà đấy.'],
  ] },
  { map: 'village', when: { a: 'st14', b: 'st18' }, lines: [
    ['elder', 'Bà Tư… ba mươi năm, không ai trong chúng ta nhận ra.'],
    ['healer', 'Hắn trừ tà cho làng thật. Đó mới là chỗ khó tha thứ.'],
  ] },
  { map: 'village', when: { a: 'st18' }, lines: [
    ['healer', 'Am Đạo Trưởng, có nên dỡ đi không?'],
    ['elder', 'Để đó. Mỗi năm thắp cho hắn một nén nhang.'],
    ['healer', 'Nhang thường thôi nhé.'],
  ] },
  { map: 'village', when: { night: true }, lines: [
    ['constable', 'Trưởng Làng, khuya rồi sao chưa ngủ?'],
    ['elder', 'Già rồi, ngủ ít. Ngồi canh làng cho các con ngủ.'],
  ] },
  { map: 'temple', when: { b: 'st18' }, lines: [
    ['huntress_temple', 'Ngươi còn giữ lá bùa hộ thân ta vẽ năm mười tuổi không?'],
    ['fire_master_temple', '…Cháy mất rồi.'],
    ['huntress_temple', 'Ừ.'],
    ['fire_master_temple', 'Ta vẽ lại theo trí nhớ. Nó trong túi áo ta.'],
  ] },
  { map: 'temple', when: { a: 'st18' }, lines: [
    ['fire_master_temple', 'Sư tỷ, về núi lửa uống trà không?'],
    ['huntress_temple', 'Trà của ngươi đắng như thuốc.'],
    ['fire_master_temple', 'Ba mươi năm rồi, ta học pha lại rồi.'],
  ] },
];
