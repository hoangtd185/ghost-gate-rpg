// Pets: small companions that follow the player and pick up drops (client/src/game/pet.js, sprites in
// client/src/gfx/pet.js). A character owns pets (ch.pet.owned) and has one of them out or resting (ch.pet.id, ch.pet.on).
//   name: shown under the pet · color: its name tag and sparkles · src: how to get it (shown in the character window)
//   lines: said after a pickup · idle: said now and then · call / rest: toasts when called out or sent to rest
export const PETS = {
  imp: {
    name: 'Tiểu Quỷ', color: '#e8dcff', src: 'Nhiệm vụ Bạn Đồng Hành Nhỏ (Trưởng Làng)',
    lines: ['Để em nhặt cho!', 'Của chủ nhân nè~', 'Hihi, lấp lánh quá', 'Đồ rơi kìa!', 'Em giỏi không?'],
    idle: ['Chủ nhân cố lên!', 'Đánh quái vui ghê', 'Em đói…', '♪ la la ♪'],
    call: 'Tiểu Quỷ: "Em đây, chủ nhân!"', rest: 'Tiểu Quỷ đi nghỉ rồi',
  },
  // A three-tailed fox kit, nursed back to health by the old fisherman
  fox_kit: {
    name: 'Tiểu Hồ', color: '#ffd9a8', src: 'Nhiệm vụ Hồ Ly Lạc Mẹ (Ngư Ông, Đầm Lầy Sương Mù)',
    lines: ['Kyu! Của chủ nhân đây', 'Em ngửi thấy đồ quý nè', 'Nhặt được rồi~', 'Đuôi em quét sạch hết!'],
    idle: ['Kyu kyu~', 'Vuốt đuôi em đi mà', 'Em muốn ăn đậu phụ rán…', 'Trăng đêm nay đẹp ghê'],
    call: 'Tiểu Hồ: "Kyu! Em tới đây!"', rest: 'Tiểu Hồ cuộn đuôi đi ngủ rồi',
  },
};

// The pets a character owns, in the order of PETS (the one it has out always counts)
export const ownedPets = (pet) => (pet ? Object.keys(PETS).filter((id) => id === pet.id || (pet.owned || []).includes(id)) : []);

// A clean pet field from saved or uploaded data: known pets only, the active one among the owned. null = no pet.
export function cleanPet(pet) {
  if (!pet || typeof pet !== 'object') return null;
  const owned = ownedPets({ id: String(pet.id || ''), owned: Array.isArray(pet.owned) ? pet.owned.map(String) : [] });
  if (!owned.length) return null;
  return { id: owned.includes(pet.id) ? pet.id : owned[0], on: pet.on !== false, owned };
}
