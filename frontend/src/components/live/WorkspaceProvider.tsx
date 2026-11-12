import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { allPages, object } from '../../services/api';
import type { Row } from '../../services/api';
import type { Session } from '../../services/session';
import { WorkspaceContext } from './workspaceContext';
import { useApi } from '../../hook/useApi';
export default function WorkspaceProvider({ session, children }: { session: Session; children: ReactNode }) {
    const user = useApi<Row>('core', '/users/me');
    const [state, setState] = useState<{ warehouses: Row[]; loading: boolean; error: string }>({ warehouses: [], loading: true, error: '' });
    const [revision, setRevision] = useState(0);
    const [selected, setSelected] = useState(() => localStorage.getItem(`wareflow.warehouse.${session.userId}`) || '');
    const reloadWarehouses = useCallback(() => setRevision(value => value + 1), []);
    useEffect(() => {
        const controller = new AbortController();
        const path = session.role === 'SYSTEM_ADMIN' ? '/warehouses' : '/warehouses/my-company';
        allPages<Row>('core', path, controller.signal).then(data => {
            if (controller.signal.aborted) return;
            const warehouses = session.role === 'WAREHOUSE_MANAGER' ? data.filter(w => object(w.handover).managerId === session.userId) : data;
            setState({ warehouses, loading: false, error: '' });
        }).catch(error => { if (!controller.signal.aborted) setState({ warehouses: [], loading: false, error: error instanceof Error ? error.message : 'Không tải được danh sách kho.' }); });
        return () => controller.abort();
    }, [session.role, session.userId, revision]);
    const warehouse = state.warehouses.find(w => w.id === selected) || state.warehouses[0] || null;
    const warehouseId = warehouse ? String(warehouse.id) : '';
    function selectWarehouse(id: string) { setSelected(id); localStorage.setItem(`wareflow.warehouse.${session.userId}`, id); }
    return <WorkspaceContext value={{ session, user: user.data, reloadUser: user.reload, ...state, warehouse, warehouseId, selectWarehouse, reloadWarehouses }}>{children}</WorkspaceContext>;
}
