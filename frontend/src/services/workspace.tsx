import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { allPages, object } from './api';
import type { Row } from './api';
import { getAuthSession } from './authApi';
import { invalidateData, sessionScope, useDataStatus, useQuery } from './query';
import { useAppDispatch, useAppSelector } from '../store/Store';
import { workspaceSlice } from '../store/slice/workspaceSlice';
import { WFSpinner } from '../components/ui/WFSpinner';

type Scope = { warehouses: Row[]; warehouseId: string; warehouse: Row | undefined; selectWarehouse: (id: string) => void; error: string; loading: boolean };
const Context = createContext<Scope>({ warehouses: [], warehouseId: '', warehouse: undefined, selectWarehouse: () => {}, error: '', loading: true });
// Context and hook share one module so all views subscribe to the same scope.
// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspace = () => useContext(Context);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const session = getAuthSession()!;
    const source = useQuery('scope-warehouses', async () => {
        if (session.role === 'WAREHOUSE_MANAGER' && !session.companyId) return [];
        const data = await allPages<Row>('core', session.role === 'SYSTEM_ADMIN' ? '/warehouses' : '/warehouses/my-company');
        if (session.role === 'WAREHOUSE_MANAGER') {
            const mine = data.filter(w => object(w.handover).managerId === session.userId);
            return mine;
        }
        return data;
    });
    const scope = sessionScope();
    const selected = useAppSelector(state => state.workspace.warehouses[scope] ?? '');
    const dispatch = useAppDispatch();
    const setSelected = (id: string) => dispatch(workspaceSlice.actions.selectWarehouse({ session: scope, id }));
    const warehouses = source.data || [];
    const warehouse = warehouses.find(w => w.id === selected) || warehouses[0];
    const warehouseId = String(warehouse?.id || '');
    return <Context value={{ warehouses, warehouseId, warehouse, selectWarehouse: setSelected, error: source.error, loading: source.loading }}>{children}</Context>;
}
export function WarehousePicker() {
    const { warehouses, warehouseId, selectWarehouse, loading, error } = useWorkspace();
    if (loading || error) return null;
    return <label className="wf-field" style={{ maxWidth: 420, marginBottom: 20 }}><span>Kho đang làm việc</span><select aria-label="Kho đang làm việc" value={warehouseId} onChange={e => selectWarehouse(e.target.value)}>{!warehouses.length && <option value="">Chưa có kho được bàn giao</option>}{warehouses.map(w => <option key={String(w.id)} value={String(w.id)}>{String(w.name)}</option>)}</select></label>;
}
export function DataLoadingOverlay() {
    const { loading } = useDataStatus();
    return loading ? <div className="wf-loading-overlay"><WFSpinner /></div> : null;
}

export function DataStatus() {
    const status = useDataStatus();
    // Lọc bỏ lỗi trùng và chuẩn hoá thông báo thân thiện hơn
    const friendlyErrors = status.errors.map(e =>
        /không có quyền|403/i.test(e) ? 'Không tải được một số dữ liệu. Vui lòng thử lại hoặc liên hệ quản trị viên.' : e
    );
    const uniqueErrors = [...new Set(friendlyErrors)];
    return (
        <>
            {uniqueErrors.map(error => (
                <div key={error} className="wf-notice" role="alert" style={{ marginBottom: 16 }}>
                    {error} <button className="adm-btn" onClick={invalidateData}>Thử lại</button>
                </div>
            ))}
        </>
    );
}
