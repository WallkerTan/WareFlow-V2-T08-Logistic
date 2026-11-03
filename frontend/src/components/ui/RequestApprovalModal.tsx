import { Modal } from 'antd';
import Button from './Button';

export type ApprovalRequest = { id: string; title: string; description: string; status: 'pending' | 'approved' | 'rejected' };
type Props = {
    request: ApprovalRequest | null;
    onDecision: (requestId: string, decision: 'approved' | 'rejected') => void;
    onClose: () => void;
    busy?: boolean;
};

// Chỉ mở khi người dùng xem một yêu cầu đang chờ phê duyệt.
// Đóng modal không đồng nghĩa từ chối yêu cầu.
export default function RequestApprovalModal({ request, onDecision, onClose, busy = false }: Props) {
    const canDecide = request?.status === 'pending';
    return <Modal open={!!request && canDecide} title={request?.title} onCancel={onClose}
        closable={!busy} keyboard={!busy} maskClosable={!busy} centered
        footer={<div className="wf-modal-actions">
            <Button variant="danger" disabled={busy || !canDecide} onClick={() => request && onDecision(request.id, 'rejected')}>Từ chối</Button>
            <Button disabled={busy || !canDecide} onClick={() => request && onDecision(request.id, 'approved')}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</Button>
        </div>}>
        <p className="wf-modal-description">{request?.description}</p>
    </Modal>;
}
