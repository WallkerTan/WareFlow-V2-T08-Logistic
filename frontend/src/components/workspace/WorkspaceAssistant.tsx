import BatchImportPage from './BatchImportPage';
import { getAuthSession } from '../../services/authApi';
import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { assistantActions, guideAssistantAction, matchAssistantAction, type AssistantDestination, type AssistantRole } from './assistantActions';
import './assistantPane.css';
import { matchAssistantExecution, type AssistantExecution } from './assistantExecutions';
import { Modal } from 'antd';
import AssistantChatCard from './AssistantChatCard';
import AssistantLoader from './AssistantLoader';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../services/workspace';
import { request, mutate, money, number, object, type Row } from '../../services/api';
import { saveResource } from '../../services/data';
import { invalidateData } from '../../services/query';
import OperationForm from './OperationForm';
import { randomUUID } from '../../utils/format';
import { missingWarehouseFields, readWarehouseDraft, warehouseCommand, warehouseQuestion, type WarehouseDraft } from './assistantWarehouse';

type Action = 'SEARCH'|'LOTS'|'MARKET'|'EDIT'|'SALE'|'PURCHASE'|'ADJUST'|'HELP'|'CHAT';
type Intent = {action: Action; quantity?: number; price?: number; newName?: string; newSku?: string; unit?: string; barcode?: string; minStock?: number};
type Match = {warehouseId: string; warehouseName: string; product?: Row; lot?: Row; listing?: Row};
type Answer = {message: string; intent: Intent; matches: Match[]; destination?: AssistantDestination; execution?: AssistantExecution; operationCharged?: boolean};
type Turn = {question: string; answer: Answer};
const str = (v: unknown) => v == null ? '' : String(v);
const label = (m: Match) => [m.warehouseName, m.product?.sku, m.product?.name, m.lot?.lotCode].filter(Boolean).join(' · ');
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
const orderExample = 'Tạo đơn mua 3 SK1-01, 2 SK1-02';
const consumeLocalTurn = (operation: boolean) => mutate('core', '/assistant/local-turn', 'POST', {
    kind: operation ? 'OPERATION' : 'CONVERSATION',
});
function purchaseCommand(message: string) {
    const original = message.normalize('NFC').trim();
    const command = /^(?:(?:hay|vui long|giup toi|toi muon|toi can|tu dong|tu)\s+)?(?:tao|lap|dat|them)\s+(?:(?:giup|cho) toi\s+)?(?:mot\s+)?don(?: hang)?(?: mua)?(?:\s*:\s*|\s+|$)/i.exec(fold(original));
    const direct = /^(?:hay |vui long |tu dong |tu )?(?:dat|mua)(?: (?:giup|cho) toi)?\s+(?=\d)/i.exec(fold(original));
    if ((!command && !direct) || message.includes('?')) return;
    const lines = [];
    const details = original.slice((command ?? direct)![0].length).replace(/[.!]$/, '').trim();
    const source = /\s+(?:tu|cua)\s+(?:nha cung cap|ncc)\s+/i.exec(fold(details));
    const supplier = source && details.slice(source.index + source[0].length).trim();
    const items = source ? details.slice(0,source.index) : details;
    for (const item of items.split(/,\s+|\s+(?:và|va)\s+(?=\d)/i)) {
        const match = /^(\d{1,10}(?:[.,]\d{1,2})?)\s+(?:(?:san pham|ma sku|sku)\s+)?/i.exec(fold(item.trim()));
        if (!match || Number(match[1].replace(',', '.')) <= 0) return [];
        const product = item.trim().slice(match[0].length).trim();
        if (!product) return [];
        lines.push({product, supplier, quantity:Number(match[1].replace(',', '.'))});
    }
    return lines;
}

export default function WorkspaceAssistant({role}: {role: AssistantRole}) {
    const {warehouseId} = useWorkspace();
    return <Chat role={role} key={JSON.stringify([getAuthSession()?.userId, role, warehouseId])} warehouseId={role === 'storehouse' ? warehouseId : undefined}/>;
}

function Chat({role, warehouseId}: {role: AssistantRole; warehouseId?: string}) {
    const navigate = useNavigate();
    const { warehouseId: workingWarehouse, warehouse } = useWorkspace();
    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [turns, setTurns] = useState<Turn[]>([]);
    const [selected, select] = useState<Match>();
    const [active, setActive] = useState<{match: Match; intent: Intent}>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [delta, setDelta] = useState('');
    const [pendingQuestion, setPendingQuestion] = useState('');
    const [purchase, setPurchase] = useState<{ lines: NonNullable<ReturnType<typeof purchaseCommand>>; id: string }>();
    const [operation, setOperation] = useState<AssistantDestination>();
    const [operationBusy, setOperationBusy] = useState(false);
    const [confirmedOffer, setConfirmedOffer] = useState<number>();
    const [execution, setExecution] = useState<{ action: AssistantExecution; warehouse: string; warehouseName: string; status: string; total?: number }>();
    const [showActions, setShowActions] = useState(false);
    const [needsOrderLines, setNeedsOrderLines] = useState(false);
    const [warehouseDraft, setWarehouseDraft] = useState<WarehouseDraft>();
    const [pendingDocumentCommand, setPendingDocumentCommand] = useState<string>();
    const term = question.trim();
    async function ask(e: React.FormEvent) {
        e.preventDefault();
        if (busy || !term) return;
        const message = fold(term).replace(/[.!?]+$/, '').trim();
        const offered = turns.at(-1)?.answer;
        if (offered && confirmedOffer !== turns.length - 1
                && (offered.destination || offered.execution) && /^(co|dong y|lam di|thuc hien di)$/.test(message)) {
            await confirmOffer(offered, turns.length - 1);
            return;
        }
        setPendingQuestion(term);
        setBusy(true); setError('');
        const minimumWait = new Promise<void>(resolve => window.setTimeout(resolve, 1500));
        try {
            const startsWarehouse = role === 'admin' && warehouseCommand.test(message) && !term.includes('?');
            if (startsWarehouse || warehouseDraft) {
                let reply: string;
                if (/^(huy|huy tao kho|bo qua|dung lai)$/.test(message)) {
                    setWarehouseDraft(undefined);
                    reply = 'Đã hủy yêu cầu tạo kho.';
                } else {
                    if (startsWarehouse) await consumeLocalTurn(true);
                    const draft = readWarehouseDraft(term, startsWarehouse ? undefined : warehouseDraft);
                    const missing = missingWarehouseFields(draft);
                    setWarehouseDraft(draft);
                    if (missing.length) {
                        reply = warehouseQuestion(draft);
                    } else if (!startsWarehouse && warehouseDraft
                        && Object.keys(draft).every(key => draft[key as keyof WarehouseDraft] === warehouseDraft[key as keyof WarehouseDraft])
                        && !/^(thu lai|tao di|dong y)$/.test(message)) {
                        reply = 'Bạn có thể sửa thông tin kho hoặc nhắn “thử lại” để gửi lại yêu cầu.';
                    } else {
                        const created = object(await saveResource('core', '/warehouses', 'POST', draft));
                        setWarehouseDraft(undefined);
                        reply = 'Đã tạo kho ' + str(created.name ?? draft.name) + '.';
                    }
                }
                await minimumWait;
                setTurns(previous => [...previous, { question: term, answer: { message: reply, intent: { action: 'CHAT' }, matches: [] } }]);
                setQuestion('');
                return;
            }
            const continuation = needsOrderLines && /^\d/.test(term);
            const lines = role === 'admin' ? undefined : purchaseCommand(continuation ? 'Tạo đơn mua ' + term : term);
            const bareDocumentId = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(term);
            const documentCommand = pendingDocumentCommand && bareDocumentId ? pendingDocumentCommand + ' ' + term : term;
            const execution = lines ? undefined : matchAssistantExecution(role, documentCommand);
            const missingDocument = !lines && !execution && !term.includes('?')
                && !/[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}/i.test(term)
                ? matchAssistantExecution(role, term + ' 00000000-0000-0000-0000-000000000000') : undefined;
            const destination = lines || execution ? undefined : matchAssistantAction(role, term);
            const restricted = role === 'storehouse' && /^(?:duyet|phe duyet) (?:yeu cau |phieu |lo )?(?:nhap|xuat)/.test(message);
            const guidance = /^(?:cach|lam (?:sao|the nao)|huong dan|vi sao|tai sao)\b|\bla gi$/.test(message);
            const operation = !!(restricted || lines || execution || missingDocument || (destination && !guidance));
            if (restricted || lines || execution || missingDocument || destination || role === 'admin') {
                await consumeLocalTurn(operation);
            }
            setPendingDocumentCommand(missingDocument && !restricted ? term : undefined);
            setNeedsOrderLines(lines?.length === 0);
            let answer: Answer;
            if (restricted) {
                answer = { message: 'Quản lý kho có thể gửi yêu cầu. Quản trị công ty có quyền duyệt chứng từ này.',
                    intent: { action: 'CHAT' }, matches: [] };
            } else if (lines) {
                let result: string | undefined;
                if (lines.length) {
                    const order = { lines, id: randomUUID() };
                    try {
                        result = await submitPurchase(order);
                    } catch (failure) {
                        await minimumWait;
                        setPurchase(order);
                        result = failure instanceof Error ? failure.message : 'Không tạo được đơn mua.';
                    }
                }
                answer = {
                    message: result ?? 'Ghi số lượng và SKU cho từng sản phẩm. Ví dụ: ' + orderExample,
                    intent: { action: 'CHAT' }, matches: [],
                };
            } else if (missingDocument) {
                answer = { message: `Thao tác = ${missingDocument.label}\nMã chứng từ = null\n\nVui lòng nhập mã chứng từ (UUID).`,
                    intent: { action: 'CHAT' }, matches: [] };
            } else if (execution) {
                answer = {
                    message: 'Mình có thể ' + execution.label.toLowerCase() + ' cho chứng từ ' + execution.id + '. Bạn có muốn mình thực hiện không?',
                    intent: { action: 'CHAT' }, matches: [], execution, operationCharged: true,
                };
            } else if (destination || role === 'admin') {
                answer = {
                    message: destination ? guideAssistantAction(destination) + ' Bạn có muốn mình thực hiện không?'
                        : 'Chọn một nghiệp vụ trong danh sách thao tác của quản trị viên.',
                    intent: { action: 'CHAT' }, matches: [], destination, operationCharged: operation,
                };
                if (!destination) setShowActions(true);
            } else answer = await mutate<Answer>('core','/assistant/chat','POST',{
                message: term, warehouseId, history: turns.slice(-5).flatMap(turn => [
                    {role:'user',content:turn.question},
                    {role:'assistant',content:[turn.answer.message,...turn.answer.matches.map(label)].join('\n').slice(0,1500)}
                ]), selected: selected && {
                    warehouseId: selected.warehouseId, productId: selected.product?.id, lotId: selected.lot?.id
                }
            });
            await minimumWait;
            setTurns(t => [...t,{question:term,answer}]); setQuestion('');
            if (answer.intent.action !== 'CHAT' && answer.intent.action !== 'HELP') select(answer.matches.length === 1 ? answer.matches[0] : undefined);
        } catch (e) {
            await minimumWait;
            setError(e instanceof Error ? e.message : 'Không kết nối được trợ lý.');
        }
        finally { setPendingQuestion(''); setBusy(false); }
    }

    async function confirmOffer(answer: Answer, index: number) {
        if (busy || confirmedOffer === index) return;
        if (!answer.operationCharged) {
            setBusy(true);
            setError('');
            try {
                await consumeLocalTurn(true);
            } catch (failure) {
                setError(failure instanceof Error ? failure.message : 'Không kiểm tra được lượt trợ lý.');
                return;
            } finally {
                setBusy(false);
            }
        }
        setConfirmedOffer(index);
        setQuestion('');
        if (answer.execution) void prepareExecution(answer.execution);
        else if (answer.destination) openAction(answer.destination);
    }
    function openAction(destination: AssistantDestination) {
        if (destination.purchase) {
            setNeedsOrderLines(true);
            setQuestion('Tạo đơn mua ');
        } else if (destination.form) {
            setOperation(destination);
        } else {
            setOpen(false);
            navigate(destination.path);
        }
    }

    async function prepareExecution(action: AssistantExecution) {
        if (busy) return;
        if (!workingWarehouse) {
            setError('Chọn kho đang làm việc trước khi thực hiện thao tác.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const path = '/warehouses/' + workingWarehouse + '/' + action.collection + '/' + action.id;
            const record = await request<Row>(action.service, path);
            if (record.id !== action.id) throw new Error('Không xác minh được chứng từ trong kho đang chọn.');
            setExecution({ action, warehouse: workingWarehouse,
                warehouseName: str(warehouse?.name) || workingWarehouse, status: str(record.status),
                total: action.collection === 'batch-imports' && action.step === 'approve' && record.total != null ? number(record.total) : undefined });
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Không đọc được chứng từ.');
        } finally {
            setBusy(false);
        }
    }

    async function executeConfirmed() {
        if (!execution || busy) return;
        const { action, warehouse } = execution;
        setBusy(true);
        setError('');
        try {
            await saveResource(action.service, '/warehouses/' + warehouse + '/' + action.collection + '/' + action.id + '/' + action.step,
                action.method, action.body);
            setExecution(undefined);
            setTurns(previous => [...previous, { question: action.label,
                answer: { message: 'Đã thực hiện cho chứng từ ' + action.id + '.', intent: { action: 'CHAT' }, matches: [] } }]);
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Không thực hiện được thao tác.');
        } finally {
            setBusy(false);
        }
    }

    async function submitPurchase(order: NonNullable<typeof purchase>) {
        const created = await mutate<{code: string; total: number}>('core', '/purchase-batches/from-chat', 'POST',
            { requestId: order.id, lines: order.lines });
        if (!created?.code) throw new Error('API chưa trả về mã đơn mua. Thử lại để kiểm tra kết quả.');
        invalidateData();
        return 'Đã tạo đơn mua ' + created.code + ' · ' + money(created.total);
    }

    async function createPurchase() {
        if (!purchase || busy) return;
        setBusy(true);
        setError('');
        try {
            const message = await submitPurchase(purchase);
            setPurchase(undefined);
            setTurns(previous => previous.map((turn, index) => index === previous.length - 1
                ? { ...turn, answer: { ...turn.answer, message } }
                : turn));
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Không tạo được đơn mua.');
        } finally {
            setBusy(false);
        }
    }

    async function inspect(match: Match,intent: Intent) {
        setBusy(true); setError('');
        try {
            if (match.product) {
                const path = '/warehouses/'+match.warehouseId+'/products/'+match.product.id;
                const product = await request<Row>('inventory',path);
                const lot = match.lot ? await request<Row>('inventory',path+'/lots/'+match.lot.id) : undefined;
                match = {...match,product,lot};
            }
            select(match); setActive({match,intent}); setDelta(str(intent.quantity));
        } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.'); }
        finally { setBusy(false); }
    }
    async function adjust(e: React.FormEvent) {
        e.preventDefault();
        if (!active?.match.lot || busy) return;
        setBusy(true); setError('');
        try {
            await saveResource('inventory','/warehouses/'+active.match.warehouseId+'/adjustments','POST',{
                lines:[{lotId:active.match.lot.id,delta:Number(delta)}]
            });
            setActive(undefined);
        } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được phiếu.'); }
        finally { setBusy(false); }
    }
    const m = active?.match;
    const i = active?.intent;
    const close = () => setActive(undefined);
    const mode = i?.action === 'EDIT' ? 'inventoryProduct' : i?.action === 'PURCHASE' ? 'po' : i?.action === 'SALE' ? 'export' : undefined;
    return <>
        <button type="button" className="tltl-launcher" aria-label={open ? 'Đóng TLTN AI' : 'Mở TLTN AI'}
            aria-expanded={open} onClick={() => setOpen(value => !value)}>
            {open ? <X size={24} aria-hidden="true" /> : <MessageCircle size={25} aria-hidden="true" />}
        </button>
        <AssistantChatCard open={open} onClose={() => setOpen(false)} question={question}
            onQuestionChange={setQuestion} onSubmit={ask} busy={busy}
            scrollKey={JSON.stringify([turns.length, pendingQuestion, error, selected && label(selected)])}>
            {!turns.length && <p className="m-0 max-w-xs self-start rounded-lg bg-zinc-500 px-3 py-1.5 text-sm text-white">
                {role === 'admin' ? 'Mô tả việc bạn muốn làm, hoặc chọn trong danh sách thao tác.'
                    : <>Hỏi về kho hoặc yêu cầu tạo đơn mua. Ví dụ: “{orderExample}”.</>}
            </p>}
            {turns.map(({ question: text, answer }, index) => <div key={index} className="flex flex-col gap-2">
                <p className="m-0 max-w-xs self-end rounded-lg bg-blue-500 px-3 py-1.5 text-sm break-words text-white">
                    <span className="sr-only">Bạn: </span>{text}
                </p>
                <div className="flex max-w-xs flex-col gap-2 self-start rounded-lg bg-zinc-500 px-3 py-1.5 text-sm text-white">
                    <p className="m-0 whitespace-pre-wrap break-words"><span className="sr-only">TLTN AI: </span>{answer.message}</p>
                    {answer.destination && <button type="button" className="adm-btn"
                        onClick={() => void confirmOffer(answer, index)}>
                        {answer.destination.purchase ? 'Tạo đơn trong chat' : answer.destination.label}
                    </button>}
                    {answer.execution && <button type="button" className="adm-btn" disabled={busy}
                        onClick={() => void confirmOffer(answer, index)}>
                        Kiểm tra và thực hiện
                    </button>}
                    {answer.matches.map(match => <div key={[match.warehouseId, match.product?.id, match.lot?.id].join('/')}
                        className="rounded-md bg-white/15 p-2">
                        <button type="button" disabled={busy} onClick={() => inspect(match, answer.intent)}
                            className="w-full rounded-md bg-white px-2 py-1 text-left text-sm font-semibold break-words text-zinc-800 hover:bg-zinc-100 disabled:opacity-60">
                            {label(match)}
                        </button>
                        {match.product && <p className="m-0 mt-1">Khả dụng {str((match.lot ?? match.product).available)} {str(match.product.unit)}</p>}
                        {match.lot && <p className="m-0">Hạn dùng {str(match.lot.expiryDate) || 'chưa ghi nhận'} · {str(match.lot.status)}</p>}
                        {match.listing && <p className="m-0 mt-1">{str(match.listing.region)} · {money(match.listing.price)}</p>}
                    </div>)}
                </div>
            </div>)}
            {pendingQuestion && <>
                <p className="m-0 max-w-xs self-end rounded-lg bg-blue-500 px-3 py-1.5 text-sm break-words text-white">{pendingQuestion}</p>
                <div role="status" className="flex items-center gap-2 self-start">
                    <AssistantLoader />
                    <p className="m-0 max-w-xs rounded-lg bg-zinc-500 px-3 py-1.5 text-sm text-white">TLTN AI đang trả lời…</p>
                </div>
            </>}
            {selected && <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 p-2 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                <span className="min-w-0 break-words">Đang chọn <strong>{label(selected)}</strong></span>
                <button type="button" className="rounded px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-zinc-700"
                    onClick={() => select(undefined)}>Bỏ chọn</button>
            </div>}
            <button type="button" className="adm-btn self-start" aria-expanded={showActions}
                onClick={() => setShowActions(value => !value)}>Thao tác theo quyền</button>
            {showActions && <div className="flex flex-wrap gap-2">
                {assistantActions(role).map(destination => <button key={destination.label} type="button"
                    className="adm-btn" onClick={() => openAction(destination)}>{destination.label}</button>)}
            </div>}
            {error && !active && !purchase && !execution && <p role="alert" className="m-0 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
        </AssistantChatCard>
        <Modal open={!!execution} destroyOnHidden title={execution?.action.label} okText="Xác nhận thực hiện" cancelText="Hủy"
            confirmLoading={busy} onCancel={() => { if (!busy) setExecution(undefined); }} onOk={executeConfirmed}>
            {execution && <div className="wf-operation-stack">
                <p>Kho {execution.warehouseName}</p>
                <p>Mã chứng từ {execution.action.id}</p>
                {execution.status && <p>Trạng thái hiện tại {execution.status}</p>}
                {execution.total !== undefined && <p>Tổng thanh toán dự kiến {money(execution.total + Math.round(execution.total * 5) / 100)}, gồm phí 5%.</p>}
                {error && <p role="alert">{error}</p>}
            </div>}
        </Modal>
        <Modal open={!!operation} title={operation?.label} footer={null} destroyOnHidden width={720}
            onCancel={() => { if (!operationBusy) setOperation(undefined); }}>
            {operation?.form && <OperationForm mode={operation.form} back={operation.path}
                initial={operation.form === 'export' ? { type: 'EXPORT_SALE', lines: [] } : undefined}
                onCancel={() => setOperation(undefined)} onSaved={() => setOperation(undefined)} onBusyChange={setOperationBusy} />}
        </Modal>
        <Modal open={!!purchase} destroyOnHidden title="Xác nhận tạo đơn mua" okText="Tạo đơn mua" cancelText="Hủy"
            confirmLoading={busy} onCancel={() => { if (!busy) setPurchase(undefined); }} onOk={createPurchase}>
            {purchase && <ul className="list-disc pl-5">{purchase.lines.map((line, index) => <li key={index}>
                {line.quantity} × {line.product}{line.supplier ? ' · ' + line.supplier : ''}
            </li>)}</ul>}
            {error && purchase && <p role="alert">{error}</p>}
        </Modal>
        <Modal open={!!active} title={m && label(m)} onCancel={close} footer={null} destroyOnHidden width={720}>
            {m && i && <>
                {error && <p role="alert">{error}</p>}
                {m.product && <p>Tồn thực tế {str((m.lot ?? m.product).quantity)} · Khả dụng {str((m.lot ?? m.product).available)} {str(m.product.unit)}</p>}
                {m.lot && <p>Hạn dùng {str(m.lot.expiryDate) || 'chưa ghi nhận'} · Tình trạng {str(m.lot.status)}</p>}
                {mode==='po' ? <BatchImportPage/> : mode && <OperationForm mode={mode} back="." onCancel={close} onSaved={close}
                    initial={mode==='inventoryProduct' ? {...m.product, warehouseId:m.warehouseId,
                        name:i.newName ?? m.product?.name, sku:i.newSku ?? m.product?.sku, unit:i.unit ?? m.product?.unit,
                        minStock:i.minStock ?? m.product?.minStock, barcode:i.barcode ?? m.product?.barcode} : {warehouseId:m.warehouseId, ...(mode==='export' ? {type:'EXPORT_SALE'} : {})}}
                    draftLine={{productId:str(m.product?.id),lotId:str(m.lot?.id),qty:str(i.quantity),price:str(i.price)}}/>}
                {i.action==='ADJUST' && <form onSubmit={adjust} className="wf-field"><label>Số lượng tăng <input type="number" min="0.01" step="0.01" required value={delta} onChange={e=>setDelta(e.target.value)}/></label><button className="adm-btn" disabled={busy}>Lưu phiếu điều chỉnh</button></form>}
                {m.listing && <><p>{str(m.listing.address)} · {money(m.listing.price)}</p><button className="adm-btn" onClick={()=>{
                    close(); setOpen(false); navigate('/company/marketplace',{state:{warehouseOffer:{id:m.warehouseId,price:i.price}}});
                }}>Mở đề nghị giao dịch</button></>}
            </>}
        </Modal>
    </>;
}
