import type { Service } from '../../services/api';
import type { AssistantRole } from './assistantActions';

export type AssistantExecution = {
    label: string;
    service: Service;
    collection: 'batch-imports' | 'exports' | 'shipments';
    id: string;
    step: string;
    method: 'POST' | 'PATCH';
    body?: { status: string };
};

const uuidPattern = /\b[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}\b/gi;

export function matchAssistantExecution(role: AssistantRole, text: string): AssistantExecution | undefined {
    if (role === 'admin') return;
    const message = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
    // Only a single, explicit record may be changed by a chat command.
    const ids = message.match(uuidPattern);
    if (!ids || ids.length !== 1) return;
    const id = ids[0];
    if (role === 'company' && /^(?:duyet|phe duyet) (?:yeu cau )?nhap/.test(message)) {
        return { label: 'Duyệt và thanh toán yêu cầu nhập', service: 'inventory', collection: 'batch-imports', id, step: 'approve', method: 'POST' };
    }
    if (/^huy (?:yeu cau )?nhap/.test(message)) {
        return { label: 'Hủy yêu cầu nhập', service: 'inventory', collection: 'batch-imports', id, step: 'cancel', method: 'POST' };
    }
    if (/^gui duyet (?:phieu |lo )?xuat/.test(message)) {
        return { label: 'Gửi duyệt phiếu xuất', service: 'inventory', collection: 'exports', id, step: 'submit', method: 'POST' };
    }
    if (role === 'company' && /^(?:duyet|phe duyet) (?:phieu |lo )?xuat/.test(message)) {
        return { label: 'Duyệt phiếu xuất', service: 'inventory', collection: 'exports', id, step: 'approve', method: 'POST' };
    }
    if (/^huy (?:phieu |lo )?xuat/.test(message)) {
        return { label: 'Hủy phiếu xuất', service: 'inventory', collection: 'exports', id, step: 'cancel', method: 'POST' };
    }
    if (role === 'storehouse' && /^van don .*dang giao/.test(message)) {
        return { label: 'Đánh dấu vận đơn đang giao', service: 'delivery', collection: 'shipments', id, step: 'status', method: 'PATCH', body: { status: 'IN_TRANSIT' } };
    }
}
