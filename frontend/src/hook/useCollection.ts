import { useEffect, useState } from 'react';
import { allPages } from '../services/api';
import type { Row, Service } from '../services/api';
export function useCollection(service: Service, path: string | null) {
    const [state, setState] = useState<{ path: string | null; data: Row[]; error: string; loading: boolean }>({ path, data: [], error: '', loading: !!path });
    useEffect(() => {
        if (!path) return;
        const controller = new AbortController();
        allPages<Row>(service, path, controller.signal).then(data => { if (!controller.signal.aborted) setState({ path, data, error: '', loading: false }); })
            .catch(error => { if (!controller.signal.aborted) setState({ path, data: [], error: error instanceof Error ? error.message : 'Không tải được danh mục.', loading: false }); });
        return () => controller.abort();
    }, [service, path]);
    return { data: path && state.path === path ? state.data : [], error: path && state.path === path ? state.error : '', loading: !!path && (path !== state.path || state.loading) };
}
