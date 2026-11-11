// World quests (Nhiệm vụ thế giới), Genshin style: short story chains found around the world, each with its own
// mood (cheerful or dark), a choice at a key moment that changes how the story ends, and Nguyên Bảo as a reward.
//
// Chain: { name, tone: 'light' | 'dark', region (map id), blurb, steps: [quest ids in order] }
// Quest fields on top of the usual ones (see data/npcs.js):
//   cat: 'world', chain: chain id
//   choice: { options: [{ label, flag: [key, value], lines }] }  asked after the outro, before the reward;
//           the flag is saved in ch.flags and decides which epilogue opens
//   needFlag: 'key=value'  the quest only opens when that story flag is set (a branch of the chain)
//   reward.ingots: Nguyên Bảo (online the server grants them, see server/src/premium.js)

export const WORLD_CHAINS = {
  lantern: {
    name: 'Đêm Hội Rước Đèn', tone: 'light', region: 'village',
    blurb: 'Bé Bin mất chiếc đèn ông sao ngay trước đêm Trung Thu. Cả xóm nhỏ đang chờ một đêm hội thật vui.',
    steps: ['wq_lan1', 'wq_lan2', 'wq_lan3', 'wq_lan4'],
  },
  well: {
    name: 'Giếng Cạn Nghĩa Địa', tone: 'dark', region: 'graveyard',
    blurb: 'Lão canh mộ nghe tiếng trẻ con khóc dưới cái giếng cạn đã bị lấp từ năm đói. Có những lời hứa người sống không giữ được.',
    steps: ['wq_well1', 'wq_well2', 'wq_well3', 'wq_well4', 'wq_well5a', 'wq_well5b'],
  },
  carp: {
    name: 'Lý Ngư Biết Nói', tone: 'light', region: 'swamp',
    blurb: 'Ngư Ông thề rằng có một con cá chép vàng biết nói sống trong Đầm Lầy. Cả làng bảo lão say rượu.',
    steps: ['wq_carp1', 'wq_carp2', 'wq_carp3'],
  },
  bride: {
    name: 'Tân Nương Tuyết Sơn', tone: 'dark', region: 'snow_peak',
    blurb: 'Một bóng áo đỏ đứng giữa bão tuyết, đợi chú rể đã hẹn đến rước dâu từ ba mươi mùa đông trước.',
    steps: ['wq_bride1', 'wq_bride2', 'wq_bride3', 'wq_bride4a', 'wq_bride4b'],
  },
};

const wq = (chain, q) => ({ cat: 'world', chain, ...q });

export const WORLD_QUESTS = {
  // ===================== Đêm Hội Rước Đèn (cheerful) =====================
  wq_lan1: wq('lantern', {
    name: 'Chiếc Đèn Ông Sao', npc: 'kid_bin', lv: 3, requires: 'm2', type: 'collect', target: 'q_star_lantern', count: 1,
    drop: { mob: 'wisp', item: 'q_star_lantern', chance: 0.35 },
    text: 'Một đốm Ma Trơi tinh nghịch cuỗm mất đèn ông sao của Bé Bin. Lấy lại nó ở Rừng Ma Trơi.',
    intro: [
      ['kid_bin', 'Huhu… đại ca ơi! Đèn ông sao của em… bị một đốm ma trơi cuỗm mất rồi!'],
      ['kid_bin', 'Em mới dán xong năm cánh sao, còn chưa kịp thắp nến nữa…'],
      ['kid_bin', 'Nó bay vào Rừng Ma Trơi rồi. Ma trơi thích đồ sáng lấp lánh lắm, chắc nó tưởng đèn em là bạn nó.'],
      ['me', 'Để ta đi tìm. Đừng khóc nữa, mai còn rước đèn.'],
    ],
    outro: [
      ['kid_bin', 'ĐÈN CỦA EM! Còn nguyên năm cánh luôn!'],
      ['kid_bin', 'Ơ… sao cánh này cháy sém một tí? Chắc ma trơi ôm nó ngủ. Hihi, thôi kệ, nhìn còn ngầu hơn.'],
    ],
    reward: { exp: 160, gold: 80, items: [['hp_s', 3]], ingots: 5 },
  }),
  wq_lan2: wq('lantern', {
    name: 'Nến Cho Cả Xóm', npc: 'kid_bin', lv: 4, requires: 'wq_lan1', type: 'collect', target: 'mat_wisp', count: 8,
    text: 'Gom 8 Lửa Ma Trơi để làm nến cho đèn của lũ trẻ trong xóm.',
    intro: [
      ['kid_bin', 'Đại ca ơi, còn một chuyện nữa…'],
      ['kid_bin', 'Năm nay nến đắt quá, bạn Tũn với bạn Na không có nến thắp đèn.'],
      ['kid_bin', 'Lửa Ma Trơi cháy cả đêm mà không nóng tay, đẹp hơn nến nhiều! Đại ca gom giúp tụi em tám đốm nha?'],
    ],
    outro: [
      ['kid_bin', 'Oa, xanh lét luôn! Đèn tụi em năm nay sẽ là đèn đẹp nhất làng!'],
      ['kid_bin', 'Tũn bảo đại ca là anh hùng. Na bảo đại ca là… ờm… "người lớn tốt bụng". Em thì bảo cả hai!'],
    ],
    reward: { exp: 220, gold: 120, items: [['mp_s', 3]], ingots: 5 },
  }),
  wq_lan3: wq('lantern', {
    name: 'Bánh Nướng Của Bà Tư', npc: 'kid_bin', lv: 4, requires: 'wq_lan2', type: 'talk', target: 'healer', count: 1,
    text: 'Bà Tư hứa nướng bánh trung thu cho đêm hội. Qua hỏi thăm xem bánh xong chưa.',
    intro: [
      ['kid_bin', 'Bà Tư năm nào cũng nướng bánh nhân đậu xanh cho cả xóm. Mà năm nay em chưa thấy mùi bánh đâu cả…'],
      ['kid_bin', 'Đại ca qua hỏi giùm em được không? Em… em ngại. Hôm trước em lỡ hái trộm cây ngải của bà.'],
    ],
    outro: [
      ['healer', 'Bánh à? Nướng xong từ chiều rồi, bà để trong chạn, sợ thằng Bin nó ăn vụng.'],
      ['healer', 'Mà cây ngải nhà bà bị ai nhổ mất ba khóm, cậu có biết không?'],
      ['me', '…Cháu không biết ạ.'],
      ['healer', 'Hừm. Thôi, cầm hộ bà mấy cái bánh. Mai rước đèn qua rừng thì nhớ dẹp lũ Hồ Ly, chúng hay ra trêu trẻ con lắm.'],
    ],
    reward: { exp: 240, gold: 100, items: [['hp_s', 5]], ingots: 5 },
  }),
  wq_lan4: wq('lantern', {
    name: 'Đêm Rước Đèn', npc: 'healer', turnIn: 'kid_bin', lv: 5, requires: 'wq_lan3', type: 'kill', target: 'fox', count: 10,
    text: 'Dẹp 10 Hồ Ly Tinh ven Rừng Ma Trơi để lũ trẻ rước đèn an toàn, rồi về với Bé Bin.',
    intro: [
      ['healer', 'Lũ Hồ Ly năm nào cũng giả làm người lạ, dụ trẻ con đi lạc vào rừng.'],
      ['healer', 'Cậu đi trước dọn đường. Mười con là đủ cho chúng nó sợ, không dám ló mặt đêm nay.'],
    ],
    outro: [
      ['sys', 'Đêm rằm. Một hàng đèn xanh lấp lánh lượn qua bìa rừng, tiếng trống ếch thình thịch, lũ trẻ hát ầm cả lên.'],
      ['kid_bin', 'Tết Trung Thu rước đèn đi chơi…! Đại ca hát theo đi!'],
      ['me', 'Ta… không thuộc lời.'],
      ['kid_bin', 'Không sao, cứ "la la la" là được! Ai cũng làm thế mà!'],
      ['sys', 'Lũ trẻ chia nhau bánh của Bà Tư. Bé Bin để dành cho bạn một miếng to nhất, nhân đậu xanh có cả hạt dưa.'],
      ['kid_bin', 'Đại ca ơi… hết hội rồi, cái đèn ông sao này… em nên làm gì với nó?'],
    ],
    choice: { options: [
      { label: 'Giữ lấy, sang năm rước tiếp', flag: ['lantern', 'keep'], lines: [
        ['kid_bin', 'Dạ! Em sẽ cất trên đầu giường. Sang năm em dán thêm cánh thứ sáu, thành đèn sáu cánh có một không hai!'],
        ['me', 'Sao thì làm gì có sáu cánh.'],
        ['kid_bin', 'Thì sao của em có! Đại ca nhớ về rước đèn với tụi em nha!'],
      ] },
      { label: 'Thả đèn theo gió cho ma trơi', flag: ['lantern', 'gift'], lines: [
        ['kid_bin', 'Thả cho ma trơi ạ? …Ừ ha. Chắc nó thích đèn em lắm mới lấy trộm.'],
        ['sys', 'Chiếc đèn ông sao bay lên khỏi rặng tre. Từ trong rừng, một đốm ma trơi nhỏ bay ra, lượn quanh chiếc đèn ba vòng rồi ôm lấy nó.'],
        ['kid_bin', 'Nó vẫy tay kìa! Đại ca thấy không? Ma trơi cũng biết vui đó!'],
      ] },
    ] },
    reward: { exp: 380, gold: 200, items: [['hp_l', 3]], ingots: 20, title: 'Sứ Giả Trung Thu' },
  }),

  // ===================== Giếng Cạn Nghĩa Địa (dark) =====================
  wq_well1: wq('well', {
    name: 'Tiếng Khóc Dưới Giếng', npc: 'gravekeeper', lv: 8, requires: 'st5', type: 'talk', target: 'ghost_girl', count: 1,
    text: 'Lão canh mộ nghe tiếng trẻ khóc từ cái giếng cạn giữa nghĩa địa. Đến xem.',
    intro: [
      ['gravekeeper', 'Ngươi nghe thấy không? …Không à. Ừ, chỉ lão nghe thấy thôi.'],
      ['gravekeeper', 'Đêm nào cũng vậy. Canh ba, từ cái giếng cạn kia, có tiếng con gái nhỏ khóc. Khóc rồi gọi "mẹ ơi".'],
      ['gravekeeper', 'Cái giếng ấy lấp từ năm đói, bốn mươi năm rồi. Ngươi là người cầm kiếm, ngươi ra đó xem giùm lão.'],
    ],
    outro: [
      ['sys', 'Thành giếng phủ rêu, lạnh buốt. Một bé gái chừng bảy tuổi ngồi vắt vẻo trên miệng giếng, chân trần, tóc ướt sũng dù trời không mưa.'],
      ['ghost_girl', 'Anh… anh nhìn thấy em hả? Không ai nhìn thấy em lâu lắm rồi.'],
      ['ghost_girl', 'Em tên Nụ. Em đợi mẹ. Mẹ bảo em ngồi đây ngoan, mẹ đi xin gạo rồi về.'],
      ['ghost_girl', 'Mà lâu quá… Anh có thấy mẹ em không?'],
    ],
    reward: { exp: 1200, gold: 300, items: [['hp_l', 2]], ingots: 5 },
  }),
  wq_well2: wq('well', {
    name: 'Chiếc Kẹp Tóc Hình Bướm', npc: 'ghost_girl', lv: 8, requires: 'wq_well1', type: 'collect', target: 'q_hairpin', count: 1,
    drop: { mob: 'jiangshi', item: 'q_hairpin', chance: 0.3 },
    text: 'Nụ đánh rơi chiếc kẹp tóc hình bướm mẹ cho. Lũ Cương Thi đã nhặt mất.',
    intro: [
      ['ghost_girl', 'Em mất cái kẹp tóc rồi. Hình con bướm, mẹ khắc bằng gỗ thị, thơm lắm.'],
      ['ghost_girl', 'Mấy ông cứng đờ nhảy lò cò ngoài kia nhặt mất. Em gọi mà mấy ông không nghe.'],
      ['ghost_girl', 'Mẹ về mà thấy em đầu bù tóc rối, mẹ buồn.'],
    ],
    outro: [
      ['ghost_girl', 'Đúng nó rồi! Anh cài giùm em được không? Tay em… không cầm được đồ nữa.'],
      ['sys', 'Bạn cài chiếc kẹp lên mái tóc ướt. Nó xuyên qua như xuyên qua sương, rơi xuống đất. Nụ nhìn nó rất lâu.'],
      ['ghost_girl', '…Em biết rồi. Em biết lâu rồi, chỉ là không muốn nghĩ tới.'],
      ['ghost_girl', 'Anh hỏi ông canh mộ giùm em. Ông ấy biết. Hồi đó ông ấy cũng ở đây, ông ấy là anh Tư nhà bên cạnh.'],
    ],
    reward: { exp: 1500, gold: 350, items: [['stone', 1]], ingots: 5 },
  }),
  wq_well3: wq('well', {
    name: 'Sự Thật Năm Đói', npc: 'ghost_girl', lv: 9, requires: 'wq_well2', type: 'talk', target: 'gravekeeper', count: 1,
    text: 'Hỏi lão canh mộ chuyện năm đói, chuyện cái giếng bị lấp.',
    intro: [
      ['ghost_girl', 'Anh đừng giận ông ấy nha. Hồi đó ông ấy mới mười tuổi thôi.'],
    ],
    outro: [
      ['gravekeeper', '…Con bé nhận ra lão à.'],
      ['gravekeeper', 'Năm ấy hạn ba tháng. Lúa chết khô, giếng cạn trơ đáy. Ông thầy cúng trong làng bảo giếng đòi người, phải "gả" một đứa trẻ thuần âm cho Hà Bá thì trời mới mưa.'],
      ['gravekeeper', 'Mẹ con bé không chịu. Bà ấy đi xin gạo ở làng bên để khỏi phải bán con. Trong lúc bà ấy đi…'],
      ['gravekeeper', 'Người lớn trong làng bế con bé ra giếng. Lão đứng sau bụi tre. Lão thấy hết. Lão không dám kêu.'],
      ['gravekeeper', 'Ba ngày sau trời mưa thật. Mẹ con bé về, tìm con khắp làng, rồi cũng nhảy xuống cái giếng ấy. Người ta lấp giếng lại, coi như chưa có gì.'],
      ['gravekeeper', 'Lão xin làm canh mộ ở đây bốn mươi năm. Không phải để trông người chết. Để không ai quên.'],
      ['gravekeeper', 'Cái giếng bị trấn bằng mười mấy ngọn đèn lồng phù chú. Chính lũ Đèn Lồng Ma lượn quanh đây đêm đêm. Chúng giữ hồn con bé lại.'],
    ],
    reward: { exp: 1600, gold: 400, items: [['hp_l', 3]], ingots: 5 },
  }),
  wq_well4: wq('well', {
    name: 'Mười Ngọn Đèn Trấn Yểm', npc: 'gravekeeper', turnIn: 'ghost_girl', lv: 9, requires: 'wq_well3', type: 'kill', target: 'lantern', count: 10,
    text: 'Đập tan 10 Đèn Lồng Ma đang trấn giữ hồn Nụ, rồi quay lại miệng giếng.',
    intro: [
      ['gravekeeper', 'Phá đèn thì hồn con bé được tự do. Được đi, hay được ở lại, là tuỳ ngươi với nó.'],
      ['gravekeeper', 'Có người bảo hồn oán mà thả ra là hại cả làng. Lão không biết. Lão chỉ biết lão nợ nó một tiếng kêu.'],
    ],
    outro: [
      ['sys', 'Ngọn đèn cuối cùng vỡ tan. Gió nghĩa địa bỗng ngừng thổi. Nụ đứng dậy khỏi thành giếng lần đầu tiên sau bốn mươi năm.'],
      ['ghost_girl', 'Nhẹ quá… Em nghe thấy tiếng mẹ. Mẹ ở dưới kia, ở sâu lắm, mẹ gọi em.'],
      ['ghost_girl', 'Nhưng mà… nếu em đi rồi, ông Tư ở lại một mình. Còn những người lớn năm ấy, họ vẫn sống trong làng, vẫn cười, vẫn ăn cơm mới…'],
      ['ghost_girl', 'Anh ơi, em nên làm gì?'],
    ],
    choice: { options: [
      { label: 'Đi với mẹ đi, Nụ', flag: ['well', 'free'], lines: [
        ['me', 'Em đợi đủ rồi. Mẹ em cũng đợi đủ rồi. Đi đi, chuyện người sống để người sống lo.'],
        ['ghost_girl', 'Dạ. Anh nói với ông Tư là em không giận ông. Hồi đó ông còn nhỏ mà, giống em thôi.'],
        ['sys', 'Bé gái mỉm cười, cúi xuống nhặt chiếc kẹp tóc. Lần này tay em cầm được. Rồi em tan vào màn sương như một con bướm trắng.'],
      ] },
      { label: 'Trấn yểm lại giếng cho yên làng', flag: ['well', 'seal'], lines: [
        ['me', 'Thả em ra, oán khí sẽ tìm tới những người năm đó. Cả làng sẽ không yên. Ta xin lỗi.'],
        ['ghost_girl', 'Anh cũng giống họ.'],
        ['sys', 'Bạn đặt lá bùa lên miệng giếng. Tiếng khóc dội lên từ đáy sâu, rồi im bặt. Nhưng trong im lặng, có tiếng gõ. Cộc. Cộc. Cộc.'],
      ] },
    ] },
    reward: { exp: 2400, gold: 600, items: [['stone', 2], ['protect', 1]], ingots: 30 },
  }),
  wq_well5a: wq('well', {
    name: 'Bó Hoa Trắng', npc: 'gravekeeper', lv: 9, requires: 'wq_well4', needFlag: 'well=free', type: 'collect', target: 'mat_peach', count: 5,
    text: 'Mang 5 Cánh Đào Ma để lão canh mộ kết một bó hoa đặt lên giếng.',
    intro: [
      ['gravekeeper', 'Con bé đi rồi à… Nó còn dặn gì không? …Nó không giận lão.'],
      ['sys', 'Lão già quay đi rất lâu.'],
      ['gravekeeper', 'Hồi đó nó mê hoa đào lắm. Ngươi kiếm giùm lão mấy cánh đào, lão kết cho nó một bó. Bốn mươi năm, giờ mới dám.'],
    ],
    outro: [
      ['sys', 'Bó hoa đào nằm trên miệng giếng đã lấp. Không có tiếng khóc nào nữa. Chỉ có tiếng chim sáo trên cây gạo già.'],
      ['gravekeeper', 'Mai lão xuống làng. Có mấy người già cần nghe lão kể chuyện cái giếng. Họ phải nghe.'],
    ],
    reward: { exp: 2000, gold: 500, items: [['gem_hp1', 1]], ingots: 10, title: 'Người Giữ Lời Hứa' },
  }),
  wq_well5b: wq('well', {
    name: 'Tiếng Gõ Từ Đáy Giếng', npc: 'gravekeeper', lv: 9, requires: 'wq_well4', needFlag: 'well=seal', type: 'kill', target: 'jiangshi', count: 15,
    text: 'Từ đêm trấn yểm, Cương Thi trong nghĩa địa không chịu nằm yên. Diệt 15 con.',
    intro: [
      ['gravekeeper', 'Ngươi nghe tiếng gõ không? Cộc, cộc. Đêm qua nó gõ đủ ba trăm sáu mươi lăm cái.'],
      ['gravekeeper', 'Lũ xác trong nghĩa địa cứ nghe tiếng gõ là ngồi dậy. Dẹp chúng giúp lão. Còn cái giếng… để lão canh. Lão quen rồi.'],
    ],
    outro: [
      ['gravekeeper', 'Yên được ít hôm. Rồi nó sẽ lại gõ.'],
      ['gravekeeper', 'Không sao. Bốn mươi năm lão chưa bỏ nó, giờ cũng không bỏ.'],
      ['sys', 'Đêm ấy, nếu áp tai xuống đất, bạn vẫn nghe thấy. Cộc. Cộc. Như ai đó đếm ngày.'],
    ],
    reward: { exp: 2200, gold: 700, items: [['stone', 2], ['gem_def1', 1]], ingots: 10 },
  }),

  // ===================== Lý Ngư Biết Nói (cheerful) =====================
  wq_carp1: wq('carp', {
    name: 'Mồi Câu Thượng Hạng', npc: 'fisherman', lv: 9, requires: 'st4b', type: 'collect', target: 'mat_slime', count: 8,
    text: 'Gom 8 Nhớt Ếch Độc làm mồi câu cho Ngư Ông.',
    intro: [
      ['fisherman', 'Ngươi tin lão không? Đầm này có một con cá chép vàng. Biết nói. Còn cãi tay đôi với lão.'],
      ['fisherman', 'Cả làng bảo lão say. Lão say thật, nhưng lão cũng thấy thật!'],
      ['fisherman', 'Nó chê mồi giun của lão "nhạt nhẽo". Nhớt Ếch Độc thì khác, thơm lừng, cá nào cũng mê. Gom cho lão tám vốc.'],
    ],
    outro: [
      ['fisherman', 'Thơm chưa! …Ờ, thơm với cá thôi. Ngươi đừng ngửi.'],
      ['fisherman', 'Tối nay lão thả câu. Con cá ấy mà không cắn câu thì lão bỏ nghề đi bán bánh đa.'],
    ],
    reward: { exp: 1300, gold: 400, items: [['hp_l', 2]], ingots: 5 },
  }),
  wq_carp2: wq('carp', {
    name: 'Kẻ Trộm Mồi', npc: 'fisherman', lv: 10, requires: 'wq_carp1', type: 'kill', target: 'water_ghost', count: 8,
    text: 'Lũ Thủy Quỷ ăn trộm sạch mồi câu. Đánh tan 8 con.',
    intro: [
      ['fisherman', 'Hết sạch! Cả tám vốc! Không phải con cá, mà là lũ Thủy Quỷ, chúng nó thò tay lên ăn vụng!'],
      ['fisherman', 'Đánh tan tám đứa cho lão. Đứa nào miệng còn dính nhớt ếch là đứa ăn trộm.'],
    ],
    outro: [
      ['sys', 'Bạn quay về thì thấy Ngư Ông đang ngồi nói chuyện với… mặt nước.'],
      ['fisherman', 'Đấy! Nó đấy! Nó trồi lên rồi! Ngươi thấy chưa, lão đâu có say!'],
    ],
    reward: { exp: 1600, gold: 500, items: [['stone', 1]], ingots: 5 },
  }),
  wq_carp3: wq('carp', {
    name: 'Ba Điều Ước', npc: 'fisherman', lv: 10, requires: 'wq_carp2', type: 'talk', target: 'golden_carp', count: 1,
    text: 'Con cá chép vàng có thật. Nó muốn nói chuyện với bạn.',
    intro: [
      ['fisherman', 'Nó bảo nó chỉ nói chuyện với "người tử tế", chê lão hôi rượu. Ngươi ra đó đi.'],
    ],
    outro: [
      ['golden_carp', 'Khụ khụ. Ta là Lý Ngư Tinh, tu luyện ba trăm năm trong đầm này. Cảm ơn ngươi đã dẹp lũ Thủy Quỷ, chúng nó cứ giật vây ta.'],
      ['golden_carp', 'Theo lệ, ai giúp Lý Ngư thì được ba điều ước.'],
      ['me', 'Thật à?'],
      ['golden_carp', 'Không. Ngân sách năm nay eo hẹp. Một điều thôi. Ước đi, ước nhanh lên, ta khô vảy rồi đây.'],
    ],
    choice: { options: [
      { label: 'Ước có thật nhiều Nguyên Bảo', flag: ['carp', 'wish'], lines: [
        ['golden_carp', 'Ha! Ai cũng ước cái đó. Được, đây, một túi Nguyên Bảo.'],
        ['sys', 'Lý Ngư Tinh phun ra một nắm Nguyên Bảo sáng loáng. Ướt nhẹp và hơi tanh.'],
        ['golden_carp', 'Đừng nhìn ta như thế. Ngươi nghĩ ta cất tiền ở đâu, ngân hàng chắc?'],
      ] },
      { label: 'Ước cho Ngư Ông câu được cá', flag: ['carp', 'kind'], lines: [
        ['golden_carp', 'Ước cho người khác à? …Hiếm đấy. Ba trăm năm mới gặp người thứ hai.'],
        ['golden_carp', 'Được. Từ mai lão già ấy thả câu đâu trúng đó. Còn ngươi, cầm lấy chút quà, coi như ta tự nguyện.'],
        ['sys', 'Phía xa, Ngư Ông giật cần, kéo lên một con cá to bằng bắp đùi, rồi ngã chổng vó xuống bùn. Lý Ngư Tinh cười sặc nước.'],
      ] },
    ] },
    reward: { exp: 2200, gold: 700, items: [['orb_thunder', 1]], ingots: 20, title: 'Bạn Của Lý Ngư' },
  }),

  // ===================== Tân Nương Tuyết Sơn (dark) =====================
  wq_bride1: wq('bride', {
    name: 'Bóng Áo Đỏ Trong Bão Tuyết', npc: 'huntress', lv: 15, requires: 'st7', type: 'talk', target: 'snow_bride', count: 1,
    text: 'A Tuyết thấy một bóng áo đỏ đứng giữa bão tuyết mỗi đêm. Đến xem đó là ai.',
    intro: [
      ['huntress', 'Ngươi đi qua đèo có thấy không? Một người đàn bà mặc áo cưới đỏ, đứng im giữa bão.'],
      ['huntress', 'Ta bắn thử một mũi tên cảnh cáo. Mũi tên xuyên qua người cô ta, cắm vào tuyết.'],
      ['huntress', 'Ta là thợ săn, ta không sợ quỷ. Nhưng ta không thích cái cách cô ta nhìn xuống chân núi. Như đang đợi ai.'],
    ],
    outro: [
      ['snow_bride', 'Chàng tới rồi sao? …Không. Không phải chàng. Chàng cao hơn, và vai chàng không có tuyết.'],
      ['snow_bride', 'Ta là Tuyết Nương, con gái nhà họ Hàn dưới chân núi. Hôm nay là ngày cưới của ta.'],
      ['snow_bride', 'Chàng hẹn sẽ trèo đèo sang rước ta trước khi tuyết đầu mùa rơi. Ta đã mặc áo đỏ, đứng đợi ở đây.'],
      ['sys', 'Tuyết đã phủ dày lên vai nàng, lên mái tóc vấn cao. Áo cưới đỏ đã bạc màu thành hồng nhạt. Ba mươi mùa đông.'],
    ],
    reward: { exp: 4500, gold: 1200, items: [['hp_l', 3]], ingots: 5 },
  }),
  wq_bride2: wq('bride', {
    name: 'Lá Thư Chưa Gửi', npc: 'snow_bride', lv: 15, requires: 'wq_bride1', type: 'collect', target: 'q_love_letter', count: 1,
    drop: { mob: 'yeti', item: 'q_love_letter', chance: 0.3 },
    text: 'Chàng trai từng gửi thư cho Tuyết Nương qua đèo. Lũ Tuyết Yêu đã cướp túi thư của người đưa tin.',
    intro: [
      ['snow_bride', 'Chàng hay viết thư cho ta. Người đưa thư trèo đèo mỗi tháng một lần.'],
      ['snow_bride', 'Lá thư cuối cùng không bao giờ tới. Người đưa thư bị Tuyết Yêu bắt, cả túi thư rơi đâu đó trên núi.'],
      ['snow_bride', 'Ngươi tìm giúp ta. Ta muốn biết chàng đã viết gì. Chắc chàng bảo chàng đang trên đường tới.'],
    ],
    outro: [
      ['sys', 'Lá thư nhàu nát, mực nhoè vì tuyết, nhưng vẫn còn đọc được. Tuyết Nương không chạm được vào giấy. Nàng bảo bạn đọc.'],
      ['sys', '"Hàn muội. Ta xin lỗi. Cha ta đã nhận sính lễ nhà họ Lục dưới xuôi. Ta không sang rước muội được nữa. Đừng đợi ta."'],
      ['snow_bride', '…Ngươi đọc sai rồi.'],
      ['me', 'Ta—'],
      ['snow_bride', 'Ngươi đọc sai rồi. Đọc lại đi. Chàng bảo chàng đang trên đường tới.'],
      ['sys', 'Gió trên đỉnh núi rít lên. Lũ Băng Dực trong động phía xa bay ra thành một đám đen kịt.'],
    ],
    reward: { exp: 5500, gold: 1500, items: [['stone', 2]], ingots: 5 },
  }),
  wq_bride3: wq('bride', {
    name: 'Hôn Ước Đóng Băng', npc: 'snow_bride', lv: 17, requires: 'wq_bride2', type: 'kill', target: 'icebat', count: 12,
    text: 'Lũ Băng Dực đánh hơi thấy oán khí của Tuyết Nương, kéo về Huyền Băng Động. Hạ 12 con trước khi chúng làm tổ trong nỗi đau của nàng.',
    intro: [
      ['snow_bride', 'Ngươi nghe chúng rít không? Băng Dực ăn nỗi buồn. Nỗi buồn của ta nhiều lắm, đủ cho chúng làm tổ cả trăm năm.'],
      ['snow_bride', 'Đuổi chúng đi. Ta không muốn chàng tới mà thấy ta bị dơi bâu kín người.'],
    ],
    outro: [
      ['snow_bride', 'Chúng đi rồi. Yên tĩnh quá.'],
      ['snow_bride', 'Người lạ, lá thư ấy… nói thật với ta đi. Chàng có tới không?'],
    ],
    choice: { options: [
      { label: 'Nói sự thật', flag: ['bride', 'truth'], lines: [
        ['me', 'Chàng không tới. Chàng đã cưới người khác dưới xuôi. Chàng bảo nàng đừng đợi.'],
        ['snow_bride', '…'],
        ['snow_bride', 'Ba mươi năm. Ta biết từ năm thứ hai rồi. Chỉ là cần có người nói ra cho ta nghe.'],
        ['sys', 'Tuyết Nương tháo tấm khăn voan đỏ khỏi đầu. Bão tuyết lặng đi. Lần đầu tiên, nàng quay lưng lại với chân núi.'],
      ] },
      { label: 'Nói dối: chàng đang tới', flag: ['bride', 'lie'], lines: [
        ['me', 'Chàng đang tới. Đường đèo bị tuyết lấp, chàng phải đi vòng. Nàng đợi thêm chút nữa.'],
        ['snow_bride', 'Thật sao? Ta biết mà. Ta biết chàng sẽ tới!'],
        ['sys', 'Nàng chỉnh lại khăn voan, phủi tuyết trên vai, đứng thẳng lưng nhìn xuống chân núi. Nụ cười ấy đẹp đến mức bạn phải quay mặt đi.'],
      ] },
    ] },
    reward: { exp: 7000, gold: 2000, items: [['stone', 3], ['protect', 1]], ingots: 30 },
  }),
  wq_bride4a: wq('bride', {
    name: 'Hồng Y Tan Trong Tuyết', npc: 'snow_bride', lv: 17, requires: 'wq_bride3', needFlag: 'bride=truth', type: 'talk', target: 'huntress', count: 1,
    text: 'Tuyết Nương nhờ bạn mang tấm khăn voan cưới tới cho A Tuyết.',
    intro: [
      ['snow_bride', 'Cô thợ săn từng bắn ta một mũi tên. Mũi tên lệch hẳn sang trái, cô ấy cố tình bắn trượt.'],
      ['snow_bride', 'Mang tấm khăn này cho cô ấy. Bảo cô ấy cưới ai thì cưới người dám trèo đèo.'],
      ['sys', 'Tuyết Nương tan dần vào bão tuyết, từ chân lên đầu. Thứ cuối cùng còn lại là nụ cười, rồi đến tấm khăn voan đỏ rơi vào tay bạn.'],
    ],
    outro: [
      ['huntress', '…Khăn cưới của cô ta à.'],
      ['huntress', '"Cưới người dám trèo đèo." Hừ. Đàn bà gì mà chết ba mươi năm rồi còn dạy đời.'],
      ['huntress', 'Ta không cần khăn cưới. Ngươi giữ đi. Khoác lên mà đi đường, gió núi sẽ không làm khó ngươi.'],
    ],
    reward: { exp: 6000, gold: 1800, items: [['cape_bride', 1]], ingots: 10, title: 'Người Nói Thật' },
  }),
  wq_bride4b: wq('bride', {
    name: 'Người Vợ Chờ Mãi', npc: 'huntress', lv: 17, requires: 'wq_bride3', needFlag: 'bride=lie', type: 'talk', target: 'snow_bride', count: 1,
    text: 'A Tuyết bảo đêm qua bão tuyết dữ hơn mọi năm. Lên đỉnh núi xem Tuyết Nương.',
    intro: [
      ['huntress', 'Đêm qua bão to chưa từng thấy. Ta nghe tiếng đàn bà hát ru trong gió.'],
      ['huntress', 'Ngươi đã nói gì với cô ta vậy?'],
    ],
    outro: [
      ['snow_bride', 'Ngươi lại tới! Chàng đâu? Chàng đi tới khúc nào rồi?'],
      ['me', 'Chàng… sắp tới rồi.'],
      ['snow_bride', 'Ta biết mà. Ta sẽ đợi. Mười năm, trăm năm, ta đợi được.'],
      ['snow_bride', 'Cầm lấy tấm khăn này. Khi nào gặp chàng dưới chân núi, đưa cho chàng, bảo chàng nhanh lên. Tuyết dày lắm rồi.'],
      ['sys', 'Bạn xuống núi với tấm khăn voan đỏ trong tay. Sau lưng, giọng hát ru vẫn vang theo gió, rất vui, rất dài, không bao giờ dứt.'],
    ],
    reward: { exp: 6000, gold: 1800, items: [['cape_bride', 1]], ingots: 10, title: 'Kẻ Giữ Bí Mật' },
  }),
};
