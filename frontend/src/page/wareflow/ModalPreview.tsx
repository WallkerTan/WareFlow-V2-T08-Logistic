import { useState } from 'react';
import RequestApprovalModal from '../../components/ui/RequestApprovalModal';
import Button from '../../components/ui/Button';

export default function ModalPreview() {
    const [open, setOpen] = useState(true);
    const [message, setMessage] = useState('');
    return <section className="wf-card">
        <h1>Xem thử modal phê duyệt</h1>
        <p>Chỉ xem giao diện, không gửi yêu cầu hoặc lưu dữ liệu.</p>
        <Button onClick={() => { setMessage(''); setOpen(true); }}>Mở lại modal</Button>
        {message && <p role="status">{message}</p>}
        <RequestApprovalModal request={open ? {
            id: 'ui-preview', status: 'pending', title: 'Xác nhận yêu cầu',
            description: 'Bạn có đồng ý phê duyệt yêu cầu này? Đây là bản xem thử giao diện, không có yêu cầu thực tế.',
        } : null} onClose={() => { setOpen(false); setMessage('Đã đóng modal, chưa đưa ra quyết định.'); }}
            onDecision={(_, decision) => { setOpen(false); setMessage(decision === 'approved' ? 'Bạn đã chọn Xác nhận (xem thử).' : 'Bạn đã chọn Từ chối (xem thử).'); }} />
    </section>;
}
