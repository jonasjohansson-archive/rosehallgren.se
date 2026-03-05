const STREET_HALF_WIDTH = 4;
const LOT_SPACING = 6;

export function getLotPositions(count) {
  const lots = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 'left' : 'right';
    const x = side === 'left' ? -STREET_HALF_WIDTH - 3 : STREET_HALF_WIDTH + 3;
    const z = -(i * LOT_SPACING + 8);
    const rotationY = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
    lots.push({ x, z, side, rotationY });
  }
  return lots;
}

export function getStreetLength(count) {
  return count * LOT_SPACING + 20;
}
