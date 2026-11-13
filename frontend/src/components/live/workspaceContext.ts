import { createContext, useContext } from 'react';
import type { Row } from '../../services/api';
import type { Session } from '../../services/session';
export type WorkspaceState = { session: Session; user: Row | null; reloadUser: () => void; warehouses: Row[]; warehouse: Row | null; warehouseId: string; selectWarehouse: (id: string) => void; reloadWarehouses: () => void; loading: boolean; error: string };
export const WorkspaceContext = createContext<WorkspaceState | null>(null);
export function useWorkspace() { const value = useContext(WorkspaceContext); if (!value) throw new Error('Thiếu không gian làm việc.'); return value; }
