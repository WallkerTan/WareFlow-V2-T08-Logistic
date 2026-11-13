import { useCallback, useEffect, useState } from 'react';
import { request } from '../services/api';
import type { Service } from '../services/api';
export function useApi<T>(service: Service, path: string | null) {
    const [state, setState] = useState<{ data: T | null; error: string; loading: boolean; key: string | null }>({ data: null, error: '', loading: !!path, key: path });
    const [revision, setRevision] = useState(0);
    const reload = useCallback(() => setRevision(value => value + 1), []);
    useEffect(() => {
        if (!path) return;
        const controller = new AbortController();
        Promise.resolve().then(() => {
            if (!controller.signal.aborted) setState(previous => ({ ...previous, loading: true, error: '', key: path, data: previous.key === path ? previous.data : null }));
            return request<T>(service, path, { signal: controller.signal });
        }).then(data => { if (!controller.signal.aborted) setState({ data, error: '', loading: false, key: path }); })
            .catch(error => { if (!controller.signal.aborted) setState({ data: null, error: error instanceof Error ? error.message : 'Không tải được dữ liệu.', loading: false, key: path }); });
        return () => controller.abort();
    }, [service, path, revision]);
    return { data: path && state.key === path ? state.data : null, error: path && state.key === path ? state.error : '', loading: !!path && (state.key !== path || state.loading), reload };
}
