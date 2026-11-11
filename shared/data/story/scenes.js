// Story scenes played when entering a map while a quest is active
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
