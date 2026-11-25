import { number, rows, type Row } from '../../services/api';

// A sale line can be allocated across multiple stock lots.
export function saleProductLines(value: unknown): Row[] {
    const lines = new Map<number, Row>();
    const legacy: Row[] = [];
    for (const line of rows(value)) {
        if (typeof line.saleLine !== 'number') {
            legacy.push(line);
            continue;
        }
        const existing = lines.get(line.saleLine);
        const quantity = number(existing?.quantity) + number(line.quantity);
        const amount = number(existing?.amount) + number(line.amount);
        lines.set(line.saleLine, {
            ...line,
            quantity,
            amount,
            price: quantity > 0 ? amount / quantity : 0,
        });
    }
    return [...lines.entries()].sort(([left], [right]) => left - right).map(([, line]) => line).concat(legacy);
}
