import { useState } from 'react';
import type { FormEvent } from 'react';
import { MessagesSquare } from 'lucide-react';
import { Badge, Card, EmptyState, Modal } from '../../components/admin/AdminUI';
import { date, mutate, normalizeCollection, request } from '../../services/api';
import { useQuery } from '../../services/query';

const endpoint = '/support-requests';
const warehouseSizes: Record<string, string> = {
    under_500: 'Dưới 500 m²',
    '500_2000': '500–2.000 m²',
    above_2000: 'Trên 2.000 m²',
    multiple: 'Chuỗi nhiều kho chi nhánh',
};

type SupportRequest = {
    id: string;
    fullName: string;
    email: string;
    companyName: string | null;
    warehouseSize: string | null;
    message: string;
    createdAt: string;
    reply: string | null;
    repliedAt: string | null;
};

export default function AdminSupportRequests() {
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<SupportRequest | null>(null);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const inbox = useQuery(`support-requests:${page}`, async () => {
        return normalizeCollection<SupportRequest>(await request('core', `${endpoint}?page=${page}`));
    });
    const rows = Array.isArray(inbox.data) ? inbox.data : inbox.data?.content ?? [];
    const totalPages = Array.isArray(inbox.data) ? 1 : inbox.data?.totalPages ?? 0;

    function open(row: SupportRequest) {
        setSelected(row);
        setReply('');
        setError('');
    }

    async function sendReply(event: FormEvent) {
        event.preventDefault();
        if (!selected || sending || selected.repliedAt || !reply.trim()) return;
        setSending(true);
        setError('');
        try {
            const updated = await mutate<SupportRequest>('core', `${endpoint}/${selected.id}/reply`, 'POST', {
                message: reply.trim(),
            });
            setSelected(updated);
            inbox.reload();
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Gửi email thất bại.');
            inbox.reload();
        } finally {
            setSending(false);
        }
    }

    return (
        <>
            <div className="admin-page-head">
                <div>
                    <h2>Yêu cầu hỗ trợ</h2>
                    <p>Xem yêu cầu từ trang giới thiệu và gửi phản hồi qua email.</p>
                </div>
                <button type="button" className="adm-btn" onClick={inbox.reload} disabled={inbox.refreshing}>
                    Tải lại
                </button>
            </div>
            <Card>
                {inbox.loading && <p role="status">Đang tải yêu cầu hỗ trợ…</p>}
                {inbox.error && <p role="alert">{inbox.error}</p>}
                {!inbox.loading && !inbox.error && rows.length === 0 && (
                    <EmptyState icon={<MessagesSquare />} title="Chưa có yêu cầu hỗ trợ" description="Yêu cầu từ form liên hệ sẽ xuất hiện tại đây." />
                )}
                {rows.length > 0 && (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr><th>Khách hàng</th><th>Email</th><th>Ngày gửi</th><th>Trạng thái</th><th>Thao tác</th></tr>
                            </thead>
                            <tbody>
                                {rows.map(row => (
                                    <tr key={row.id}>
                                        <td>{row.fullName}</td>
                                        <td>{row.email}</td>
                                        <td>{date(row.createdAt)}</td>
                                        <td><Badge label={row.repliedAt ? 'Đã trả lời' : 'Chờ trả lời'} tone={row.repliedAt ? 'success' : 'warning'} /></td>
                                        <td><button type="button" className="adm-btn" onClick={() => open(row)}>Xem yêu cầu</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="admin-page-actions">
                        <button type="button" className="adm-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>Trang trước</button>
                        <span>Trang {page + 1} / {totalPages}</span>
                        <button type="button" className="adm-btn" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Trang sau</button>
                    </div>
                )}
            </Card>
            {selected && (
                <Modal title="Chi tiết yêu cầu hỗ trợ" wide onClose={() => { if (!sending) setSelected(null); }}>
                    <dl>
                        <dt>Người gửi</dt><dd>{selected.fullName} · {selected.email}</dd>
                        <dt>Doanh nghiệp / Kho</dt><dd>{selected.companyName || '—'}</dd>
                        <dt>Quy mô kho</dt><dd>{warehouseSizes[selected.warehouseSize ?? ''] ?? '—'}</dd>
                        <dt>Nội dung yêu cầu</dt>
                        <dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selected.message}</dd>
                    </dl>
                    {selected.repliedAt ? (
                        <section aria-label="Phản hồi đã gửi">
                            <h3>Đã gửi phản hồi</h3>
                            <p>{date(selected.repliedAt)}</p>
                            <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selected.reply}</p>
                        </section>
                    ) : (
                        <form className="wf-profile-form" onSubmit={sendReply}>
                            <label className="wf-field">
                                <span>Nội dung trả lời qua email</span>
                                <textarea value={reply} onChange={event => setReply(event.target.value)} required maxLength={5000} rows={6} disabled={sending} />
                            </label>
                            {error && <p role="alert">{error}</p>}
                            <div className="admin-page-actions">
                                <button className="wf-button wf-button-primary" type="submit" disabled={sending || !reply.trim()}>
                                    {sending ? 'Đang gửi…' : 'Gửi email trả lời'}
                                </button>
                            </div>
                        </form>
                    )}
                </Modal>
            )}
        </>
    );
}
