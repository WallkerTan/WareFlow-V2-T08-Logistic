import { useState } from 'react';
import { mutate, query, rows, text } from '../../services/api';
import type { Row, Page, Service } from '../../services/api';
import { useApi } from '../../hook/useApi';
import Editor from './Editor';
import type { Field, Values } from './Editor';
import { Add, Heading, Loading, Notice, Pager, Refresh, SearchForm, Table } from './UI';
import { useAction } from '../../hook/useAction';
import type { Column } from './UI';
import type { ReactNode } from 'react';
export default function Resource({ title, service = 'core', path, columns, fields, payload, canCreate = false, canEdit = false, canDelete = false, actions, toolbar, description }: {
    title: string; service?: Service; path: string; columns: Column[]; fields?: Field[]; payload?: (values: Values, row?: Row) => unknown;
    canCreate?: boolean; canEdit?: boolean; canDelete?: boolean; actions?: (row: Row, reload: () => void) => ReactNode; toolbar?: ReactNode; description?: string;
}) {
    const [page, setPage] = useState(0); const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<Row | null | undefined>(() => canCreate && location.pathname.endsWith('/new') ? null : undefined);
    const separator = path.includes('?') ? '&' : '?';
    const resource = useApi<Page<Row> | Row[]>(service, `${path}${separator}${query({ page, size: 20, search }).slice(1)}`);
    const data = Array.isArray(resource.data) ? resource.data.filter(r => !search || text(r).toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))) : resource.data?.content || [];
    const action = useAction(resource.reload);
    return <><Heading title={title} description={description}><Refresh onClick={resource.reload} disabled={resource.loading} />{canCreate && fields && <Add onClick={() => setEditing(null)} />}</Heading>
        {toolbar}<SearchForm onSearch={value => { setSearch(value); setPage(0); }} />{action.notice}
        {resource.error && <Notice error>{resource.error}</Notice>}{resource.loading ? <Loading /> : !resource.error && <Table columns={columns} rows={rows(data)} actions={canEdit || canDelete || actions ? row => <>
            {canEdit && fields && <button className="adm-btn" onClick={() => setEditing(row)}>Sửa</button>}
            {canDelete && <button className="adm-btn" disabled={action.pending} onClick={() => { if (window.confirm('Xác nhận xóa / vô hiệu hóa bản ghi này?')) void action.run(() => mutate(service, `${path.split('?')[0]}/${row.id}`, 'DELETE')); }}>Xóa</button>}
            {actions?.(row, resource.reload)}</> : undefined} />}
        {resource.data && !Array.isArray(resource.data) && <Pager page={page} totalPages={resource.data.totalPages} totalElements={resource.data.totalElements} onChange={setPage} />}
        {editing !== undefined && fields && <Editor title={editing ? `Cập nhật ${title.toLowerCase()}` : `Thêm ${title.toLowerCase()}`} fields={fields} initial={editing || undefined} onClose={() => setEditing(undefined)} onSave={async values => {
            await mutate(service, editing ? `${path.split('?')[0]}/${editing.id}` : path.split('?')[0], editing ? 'PUT' : 'POST', payload ? payload(values, editing || undefined) : values); resource.reload();
        }} />}</>;
}
