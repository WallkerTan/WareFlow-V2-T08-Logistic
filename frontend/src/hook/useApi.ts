import { useCallback, useEffect, useState } from 'react';
import { request } from '../services/api';
import type { Service } from '../services/api';
export function useApi<T>(service: Service, path: string | null, decode?: (data: unknown) => T) {
    const key = path ? `${service}:${path}` : null;
    const [state, setState] = useState<{ data: T | null; error: string; loading: boolean; key: string | null }>({ data: null, error: '', loading: !!path, key });
    const [revision, setRevision] = useState(0);
    const reload = useCallback(() => setRevision(value => value + 1), []);
    useEffect(() => {
        if (!path) return;
        const controller = new AbortController();
        Promise.resolve().then(() => {
            controller.signal.throwIfAborted();
            setState(previous => ({ ...previous, loading: true, error: '', key, data: previous.key === key ? previous.data : null }));
            return request<T>(service, path, { signal: controller.signal });
        }).then(data => { if (!controller.signal.aborted) setState({ data: decode ? decode(data) : data, error: '', loading: false, key }); })
            .catch(error => { if (!controller.signal.aborted) setState({ data: null, error: error instanceof Error ? error.message : 'Không tải được dữ liệu.', loading: false, key }); });
        return () => controller.abort();
    }, [service, path, key, revision, decode]);
    return { data: key && state.key === key ? state.data : null, error: key && state.key === key ? state.error : '', loading: !!key && (state.key !== key || state.loading), reload };
}
