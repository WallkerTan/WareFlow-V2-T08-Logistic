import { useState } from 'react';
import { mutate, query, rows, text, normalizeCollection } from '../../services/api';
import type { Row, Page, Service } from '../../services/api';
import { useApi } from '../../hook/useApi';
import Editor from './Editor';
import type { Field, Values } from './Editor';
import { Add, Heading, Loading, Notice, Pager, Refresh, SearchForm, Table } from './UI';
import { Modal } from '../admin/AdminUI';
import { ConfirmDialog, Details } from './Details';
import type { Column } from './UI';
import type { ReactNode } from 'react';
export default function Resource({ title, service = 'core', path, columns, fields, payload, canCreate = false, canEdit = false, canDelete = false, actions, toolbar, description, details, searchMode = 'server', showDetails = true }: {
    title: string; service?: Service; path: string; columns: Column[]; fields?: Field[]; payload?: (values: Values, row?: Row) => unknown;
    canCreate?: boolean; canEdit?: boolean; canDelete?: boolean; actions?: (row: Row, reload: () => void) => ReactNode; toolbar?: ReactNode; description?: string; details?: (row: Row) => ReactNode; searchMode?: 'server' | 'page' | 'none'; showDetails?: boolean;
}) {
    const [pagination, setPagination] = useState({path,page:0}); const page=pagination.path===path?pagination.page:0; const setPage=(page:number)=>setPagination({path,page});
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<Row | null | undefined>(() => canCreate && location.pathname.endsWith('/new') ? null : undefined);
    const [view,setView]=useState<Row|null>(null); const [removing,setRemoving]=useState<Row|null>(null); const [notice,setNotice]=useState('');
    const separator = path.includes('?') ? '&' : '?';
    const resource = useApi<Page<Row> | Row[]>(service, `${path}${separator}${query({ page, size: 20, search: searchMode==='server'?search:undefined }).slice(1)}`, normalizeCollection<Row>);
    const pageData = Array.isArray(resource.data) ? resource.data : resource.data?.content || [];
    const data = (Array.isArray(resource.data)||searchMode==='page') && search ? pageData.filter(r=>text(r).toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))) : pageData;
    return <><Heading title={title} description={description}><Refresh onClick={resource.reload} disabled={resource.loading} />{canCreate && fields && <Add onClick={() => setEditing(null)} />}</Heading>
        {toolbar}{searchMode!=='none'&&<SearchForm placeholder={searchMode==='page'?'Tìm trong trang hiện tại…':'Tìm kiếm…'} onSearch={value => { setSearch(value); if(searchMode==='server')setPage(0); }} />}{notice&&<Notice>{notice}</Notice>}
        {resource.error && <Notice error>{resource.error}</Notice>}{resource.loading ? <Loading /> : !resource.error && <Table columns={columns} rows={rows(data)} actions={row => <>
            {showDetails&&<button className="adm-btn" onClick={()=>setView(row)}>Xem chi tiết</button>}
            {canEdit && fields && <button className="adm-btn" onClick={() => setEditing(row)}>Sửa</button>}
            {canDelete && <button className="adm-btn adm-btn-danger-text" onClick={() => setRemoving(row)}>Xóa</button>}
            {actions?.(row, resource.reload)}</>} />}
        {resource.data && !Array.isArray(resource.data) && <Pager page={page} totalPages={resource.data.totalPages} totalElements={resource.data.totalElements} onChange={setPage} />}
        {view&&<Modal title={`Chi tiết ${title.toLowerCase()}`} onClose={()=>setView(null)}>{details?details(view):<Details items={columns.map(column=>({label:column.label,value:column.render?column.render(view):text(column.key.split('.').reduce<unknown>((v,key)=>v&&typeof v==='object'?(v as Row)[key]:undefined,view))}))}/>}</Modal>}
        {removing&&<ConfirmDialog title="Xác nhận xóa / vô hiệu hóa" confirmLabel="Xác nhận xóa" onClose={()=>setRemoving(null)} onConfirm={async()=>{await mutate(service,`${path.split('?')[0]}/${removing.id}`,'DELETE');if(data.length===1&&page>0)setPage(page-1);resource.reload();setNotice('Đã xóa / vô hiệu hóa bản ghi.');}}><p>Bản ghi: <strong>{text(removing.name||removing.sku||removing.id)}</strong></p><p>Dữ liệu có liên quan vẫn được kiểm tra trước khi thực hiện.</p></ConfirmDialog>}
        {editing !== undefined && fields && <Editor title={editing ? `Cập nhật ${title.toLowerCase()}` : `Thêm ${title.toLowerCase()}`} fields={fields} initial={editing || undefined} onClose={() => setEditing(undefined)} onSave={async values => {
            await mutate(service, editing ? `${path.split('?')[0]}/${editing.id}` : path.split('?')[0], editing ? 'PUT' : 'POST', payload ? payload(values, editing || undefined) : values); resource.reload(); setNotice(editing?'Đã cập nhật dữ liệu.':'Đã tạo bản ghi mới.');
        }} />}</>;
}
