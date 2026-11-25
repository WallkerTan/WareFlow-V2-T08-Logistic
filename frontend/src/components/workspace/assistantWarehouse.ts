type WarehouseFields = {
    name: string;
    warehouseType: 'BUY' | 'RENT';
    region: string;
    address: string;
    area: number;
    price: number;
};

export type WarehouseDraft = Partial<WarehouseFields>;
export const warehouseCommand = /^(?:(?:hay|vui long|giup toi|tu dong)\s+)?(?:tao|them|lap)\s+(?:mot\s+)?kho\b/;
export const foldWarehouseText = (text: string) =>
    text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd');

const fields = {
    name: 'tên kho', warehouseType: 'hình thức (bán hoặc cho thuê)',
    region: 'khu vực', address: 'địa chỉ', area: 'diện tích (m²)', price: 'giá (VNĐ)',
};
type Field = keyof WarehouseFields;

export function missingWarehouseFields(draft: WarehouseDraft) {
    return (Object.keys(fields) as Field[]).filter(key => draft[key] === undefined);
}

export function warehouseQuestion(draft: WarehouseDraft) {
    const values: Record<Field, string | undefined> = {
        name: draft.name,
        warehouseType: draft.warehouseType && (draft.warehouseType === 'RENT' ? 'Cho thuê' : 'Bán'),
        region: draft.region,
        address: draft.address,
        area: draft.area === undefined ? undefined : `${draft.area.toLocaleString('vi-VN')} m²`,
        price: draft.price === undefined ? undefined : `${draft.price.toLocaleString('vi-VN')} VNĐ`,
    };
    const rows = (Object.keys(fields) as Field[]).map(key => {
        const label = fields[key];
        return `${label[0].toLocaleUpperCase('vi-VN')}${label.slice(1)} = ${values[key] ?? 'null'}`;
    });
    const missing = missingWarehouseFields(draft).map(key => fields[key]);
    return ['Thông tin tạo kho hiện tại', ...rows, '', `Vui lòng nhập: ${missing.join(', ')}.`].join('\n');
}

function readNumber(value: string) {
    const text = value.trim();
    if (/^\d{1,3}(?:[.,]\d{3})+$/.test(text)) return Number(text.replace(/[.,]/g, ''));
    return /^\d+(?:[.,]\d{1,2})?$/.test(text) ? Number(text.replace(',', '.')) : NaN;
}

function assign(draft: WarehouseDraft, field: Field, value: string) {
    const clean = value.trim().replace(/^[\s:=-]+|[,;.!?\s]+$/g, '');
    if (!clean) return;
    const normalized = foldWarehouseText(clean);
    switch (field) {
        case 'warehouseType':
            if (/^(?:cho )?thue$/.test(normalized)) draft.warehouseType = 'RENT';
            if (/^(?:mua|ban|mua ban)$/.test(normalized)) draft.warehouseType = 'BUY';
            break;
        case 'area': {
            const area = readNumber(normalized.replace(/\s*m[²2]$/, ''));
            if (Number.isFinite(area) && area >= 0.01) draft.area = area;
            break;
        }
        case 'price': {
            const unit = /\s*(ty|trieu|tr|nghin|ngan|k|vnd|dong|d|₫)$/.exec(normalized);
            const multiplier = { ty: 1e9, trieu: 1e6, tr: 1e6, nghin: 1e3, ngan: 1e3, k: 1e3 }[unit?.[1] ?? ''] ?? 1;
            const price = readNumber(unit ? normalized.slice(0, unit.index) : normalized) * multiplier;
            if (Number.isFinite(price) && price >= 0 && price <= Number.MAX_SAFE_INTEGER) draft.price = price;
            break;
        }
        default:
            if (clean.length <= (field === 'address' ? 1000 : 255)) draft[field] = clean;
    }
}

export function readWarehouseDraft(input: string, previous?: WarehouseDraft): WarehouseDraft {
    const original = input.normalize('NFC').trim();
    const normalized = foldWarehouseText(original);
    const command = warehouseCommand.exec(normalized);
    const text = original.slice(command?.[0].length ?? 0).trim();
    const folded = foldWarehouseText(text);
    const draft = { ...previous };
    const markers = [...folded.matchAll(/(?:^|[\s,;])((?:ten(?: kho)?(?: la)?|dia chi(?: la)?|khu vuc(?: la)?|hinh thuc(?: la)?|dien tich(?: la)?|gia(?: la)?))(?=[\s:=])/g)];
    const fieldFor = (marker: string): Field => {
        if (marker.startsWith('ten')) return 'name';
        if (marker.startsWith('dia')) return 'address';
        if (marker.startsWith('khu')) return 'region';
        if (marker.startsWith('hinh')) return 'warehouseType';
        if (marker.startsWith('dien')) return 'area';
        return 'price';
    };
    const standalone = folded.match(/(?:^|[,;])\s*(\d[\d.,]*)\s*m[²2](?=$|[\s,;.!])/);
    for (const [index, marker] of markers.entries()) {
        const start = marker.index + marker[0].length;
        const end = markers[index + 1]?.index ?? text.length;
        const value = text.slice(start, end).replace(/[,;]\s*\d[\d.,]*\s*m[²2].*$/i, '');
        assign(draft, fieldFor(marker[1]), value);
    }
    if (standalone) assign(draft, 'area', standalone[1]);
    const type = folded.match(/(?:^|[,;])\s*(cho thue|ban|mua ban)\s*(?=$|[,;.!])/);
    if (type) assign(draft, 'warehouseType', type[1]);
    if (command && !draft.name) {
        const name = text.slice(0, markers[0]?.index ?? text.length).split(/[,;]/)[0];
        if (name && !/^\d.*m[²2]$/i.test(name) && !type) assign(draft, 'name', name);
    }
    if (!command && previous && !markers.length && !standalone && !type) {
        const missing = missingWarehouseFields(previous);
        if (missing.length === 1) assign(draft, missing[0], text);
    }
    return draft;
}
