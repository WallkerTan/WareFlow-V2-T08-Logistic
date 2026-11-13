import { useEffect, useState } from 'react';
import { allPages } from '../services/api';
import type { Row, Service } from '../services/api';
export function useCollection(service: Service, path: string | null) {
    const key = path ? `${service}:${path}` : null;
    const [state, setState] = useState<{ path: string | null; data: Row[]; error: string; loading: boolean }>({ path: key, data: [], error: '', loading: !!path });
    useEffect(() => {
        if (!path) return;
        const controller = new AbortController();
        allPages<Row>(service, path, controller.signal).then(data => { if (!controller.signal.aborted) setState({ path: key, data, error: '', loading: false }); })
            .catch(error => { if (!controller.signal.aborted) setState({ path: key, data: [], error: error instanceof Error ? error.message : 'Không tải được danh mục.', loading: false }); });
        return () => controller.abort();
    }, [service, path, key]);
    return { data: key && state.path === key ? state.data : [], error: key && state.path === key ? state.error : '', loading: !!key && (key !== state.path || state.loading) };
}
