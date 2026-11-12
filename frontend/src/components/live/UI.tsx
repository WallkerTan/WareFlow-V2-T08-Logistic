import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Plus, Search } from 'lucide-react';
import { text } from '../../services/api';
import { valueAt } from './presentation';
import type { Row } from '../../services/api';
import { useWorkspace } from './workspaceContext';
export function Heading({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
    return <div className="live-heading"><div><p className="workspace-eyebrow">WAREFLOW / VẬN HÀNH</p><h1>{title}</h1>{description && <p>{description}</p>}</div><div className="live-actions">{children}</div></div>;
}
export function Notice({ error, children }: { error?: boolean; children: ReactNode }) { return <div className={`live-notice${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'}>{children}</div>; }
export function Loading() { return <p className="live-loading" role="status">Đang tải dữ liệu…</p>; }
export function Empty({ children = 'Chưa có dữ liệu.' }: { children?: ReactNode }) { return <div className="live-empty">{children}</div>; }
export function WarehousePicker({ required = false }: { required?: boolean }) {
    const { warehouses, warehouseId, selectWarehouse, loading, error, reloadWarehouses } = useWorkspace();
    return <div className="live-scope"><label>Kho làm việc<select aria-label="Kho làm việc" value={warehouseId} onChange={e => selectWarehouse(e.target.value)} disabled={loading || !warehouses.length}>
        {!warehouses.length && <option value="">{loading ? 'Đang tải kho…' : 'Chưa có kho được giao'}</option>}
        {warehouses.map(w => <option key={String(w.id)} value={String(w.id)}>{text(w.name)}</option>)}
    </select></label>{error && <Notice error>{error} <button onClick={reloadWarehouses}>Thử lại</button></Notice>}{required && !loading && !error && !warehouses.length && <Notice>Bạn chưa có kho để thực hiện nghiệp vụ.</Notice>}</div>;
}
export type Column = { key: string; label: string; render?: (row: Row) => ReactNode };
export function Table({ columns, rows, actions }: { columns: Column[]; rows: Row[]; actions?: (row: Row) => ReactNode }) {
    if (!rows.length) return <Empty />;
    return <div className="live-table-wrap"><table className="live-table"><thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}{actions && <th>Thao tác</th>}</tr></thead><tbody>
        {rows.map((row, index) => <tr key={String(row.id || row.publicId || index)}>{columns.map(c => <td key={c.key}>{c.render ? c.render(row) : text(valueAt(row, c.key))}</td>)}{actions && <td><div className="live-actions">{actions(row)}</div></td>}</tr>)}
    </tbody></table></div>;
}
export function Pager({ page, totalPages, totalElements, onChange }: { page: number; totalPages: number; totalElements: number; onChange: (page: number) => void }) {
    return <div className="live-pager"><span>{totalElements.toLocaleString('vi-VN')} bản ghi · Trang {page + 1}/{Math.max(1, totalPages)}</span><button disabled={page === 0} onClick={() => onChange(page - 1)}>Trước</button><button disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Sau</button></div>;
}
export function Refresh({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) { return <button type="button" className="adm-btn" disabled={disabled} onClick={onClick}><RefreshCw size={15} />Tải lại</button>; }
export function Add({ onClick, to, label = 'Thêm mới' }: { onClick?: () => void; to?: string; label?: string }) { return to ? <Link className="adm-btn adm-btn-primary" to={to}><Plus size={15} />{label}</Link> : <button className="adm-btn adm-btn-primary" onClick={onClick}><Plus size={15} />{label}</button>; }
export function SearchForm({ initial = '', onSearch, children }: { initial?: string; onSearch: (value: string) => void; children?: ReactNode }) {
    const [search, setSearch] = useState(initial);
    return <form className="live-toolbar" onSubmit={e => { e.preventDefault(); onSearch(search.trim()); }}><label className="live-search"><Search size={16} /><input aria-label="Tìm kiếm" placeholder="Tìm kiếm…" value={search} onChange={e => setSearch(e.target.value)} /></label>{children}<button className="adm-btn" type="submit">Tìm kiếm</button></form>;
}
export function Summary({ values }: { values: { label: string; value: ReactNode }[] }) { return <div className="live-stats">{values.map(v => <section className="wf-card" key={v.label}><span>{v.label}</span><strong>{v.value}</strong></section>)}</div>; }
