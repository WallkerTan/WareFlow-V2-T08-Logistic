// Dữ liệu demo từ sheet CauThu, lọc ma_doi = GF; chạy được bằng file://.
const players = [
  { number: 1, name: 'Nguyen Minh Quan', position: 'Thu mon' },
  { number: 3, name: 'Tran Duc Huy', position: 'Hau ve' },
  { number: 4, name: 'Le Hoang Nam', position: 'Hau ve' },
  { number: 6, name: 'Pham Gia Bao', position: 'Tien ve' },
  { number: 8, name: 'Vo Thanh Dat', position: 'Tien ve' },
  { number: 10, name: 'Doan Quoc Viet', position: 'Tien ve' },
  { number: 9, name: 'Bui Anh Khoa', position: 'Tien dao' },
  { number: 11, name: 'Nguyen Tuan Kiet', position: 'Tien dao' },
];
const statusNode = document.querySelector('#status');
const playersNode = document.querySelector('#players');
const rows = document.createDocumentFragment();
for (const player of players) {
  const row = document.createElement('tr');
  for (const value of [player.number, player.name, player.position]) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  }
  rows.appendChild(row);
}
playersNode.replaceChildren(rows);
statusNode.textContent = `Đã tải ${players.length} cầu thủ GreenField FC.`;
