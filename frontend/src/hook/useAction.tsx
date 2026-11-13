import { useState } from 'react';
import { Notice } from '../components/live/UI';
export function useAction(after?: () => void) {
    const [pending, setPending] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState(false);
    async function run(action: () => Promise<unknown>, success = 'Đã lưu thay đổi.') {
        if (pending) return false;
        setPending(true); setMessage(''); setError(false);
        try { await action(); setMessage(success); after?.(); return true; }
        catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : 'Thao tác thất bại.'); return false; }
        finally { setPending(false); }
    }
    return { run, pending, notice: message ? <Notice error={error}>{message}</Notice> : null };
}
