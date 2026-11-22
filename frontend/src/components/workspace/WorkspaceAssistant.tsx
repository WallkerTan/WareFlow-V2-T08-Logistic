import BatchImportPage from './BatchImportPage';
import { getAuthSession } from '../../services/authApi';
import { useState } from 'react';
import { Button, Drawer, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../services/workspace';
import { request, mutate, money, type Row } from '../../services/api';
import { saveResource } from '../../services/data';
import { invalidateData } from '../../services/query';
import OperationForm from './OperationForm';

type Action = 'SEARCH'|'LOTS'|'MARKET'|'EDIT'|'SALE'|'PURCHASE'|'ADJUST'|'HELP'|'CHAT';
type Intent = {action: Action; quantity?: number; price?: number; newName?: string; newSku?: string; unit?: string; barcode?: string; minStock?: number};
type Match = {warehouseId: string; warehouseName: string; product?: Row; lot?: Row; listing?: Row};
type Answer = {message: string; intent: Intent; matches: Match[]};
type Turn = {question: string; answer: Answer};
const str = (v: unknown) => v == null ? '' : String(v);
const label = (m: Match) => [m.warehouseName, m.product?.sku, m.product?.name, m.lot?.lotCode].filter(Boolean).join(' · ');
const orderExample = 'Tạo đơn mua 3 SK1-01, 2 SK1-02';
function purchaseCommand(message: string) {
    const original = message.normalize('NFC').trim();
    const fold = (s:string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd');
    const command = /^(?:(?:hay|vui long|giup toi|toi muon|toi can)\s+)?(?:tao|lap|dat|them)\s+(?:(?:giup|cho) toi\s+)?(?:mot\s+)?don(?: hang)?(?: mua)?(?:\s*:\s*|\s+|$)/i.exec(fold(original));
    if (!command || message.includes('?')) return;
    const lines = [];
    const details = original.slice(command[0].length).replace(/[.!]$/, '').trim();
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

export default function WorkspaceAssistant({role}: {role: string}) {
    const {warehouseId} = useWorkspace();
    if (role === 'admin') return null;
    return <Chat key={JSON.stringify([getAuthSession()?.userId, role, warehouseId])} warehouseId={role === 'storehouse' ? warehouseId : undefined}/>;
}

function Chat({warehouseId}: {warehouseId?: string}) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [turns, setTurns] = useState<Turn[]>([]);
    const [selected, select] = useState<Match>();
    const [active, setActive] = useState<{match: Match; intent: Intent}>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [delta, setDelta] = useState('');
    const [pendingQuestion, setPendingQuestion] = useState('');
    const [attempt, setAttempt] = useState<{message:string; id:string}>();
    const [needsOrderLines, setNeedsOrderLines] = useState(false);
    const term = question.trim();
    async function ask(e: React.FormEvent) {
        e.preventDefault();
        if (busy || !term) return;
        setPendingQuestion(term);
        setBusy(true); setError('');
        try {
            const continuation = needsOrderLines && /^\d/.test(term);
            const lines = purchaseCommand(continuation ? 'Tạo đơn mua ' + term : term);
            setNeedsOrderLines(lines?.length === 0 || continuation);
            let answer: Answer;
            if (lines) {
                let message = 'Để tạo đơn mua, hãy ghi số lượng và mã SKU của từng sản phẩm. Ví dụ: ' + orderExample;
                if (lines.length) {
                    const id = attempt?.message === term ? attempt.id : crypto.randomUUID();
                    setAttempt({message:term,id});
                    const order = await mutate<{code:string;total:number}>('core','/purchase-batches/from-chat','POST',{requestId:id,lines});
                    invalidateData();
                    setNeedsOrderLines(false);
                    message = 'Đã tạo đơn mua ' + order.code + ' · Tổng tiền ' + money(order.total) + '. Bạn có thể xem trong mục Lô hàng.';
                    setAttempt(undefined);
                }
                answer = {message,intent:{action:'CHAT'},matches:[]};
            } else answer = await mutate<Answer>('core','/assistant/chat','POST',{
                message: term, warehouseId, history: turns.slice(-5).flatMap(turn => [
                    {role:'user',content:turn.question},
                    {role:'assistant',content:[turn.answer.message,...turn.answer.matches.map(label)].join('\n').slice(0,1500)}
                ]), selected: selected && {
                    warehouseId: selected.warehouseId, productId: selected.product?.id, lotId: selected.lot?.id
                }
            });
            setTurns(t => [...t,{question:term,answer}]); setQuestion('');
            if (answer.intent.action !== 'CHAT' && answer.intent.action !== 'HELP') select(answer.matches.length === 1 ? answer.matches[0] : undefined);
        } catch (e) { setError(e instanceof Error ? e.message : 'Không kết nối được trợ lý.'); }
        finally { setPendingQuestion(''); setBusy(false); }
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
        <button type="button" className="adm-btn" onClick={()=>setOpen(true)}>Trợ lý AI</button>
        <Drawer title="Trợ lý AI" open={open} onClose={()=>setOpen(false)} size={440}>
            {!turns.length && <p>Bạn có thể hỏi về kho, đặt câu hỏi kiến thức hoặc yêu cầu tạo đơn mua. Ví dụ: “{orderExample}”.</p>}
            {turns.map(({question:q,answer},index)=><section key={index} className="wf-card">
                <strong>Bạn</strong><p>{q}</p><strong>Trợ lý</strong><p style={{whiteSpace:'pre-wrap'}}>{answer.message}</p>
                {answer.matches.map(match=><div key={[match.warehouseId,match.product?.id,match.lot?.id].join('/')}>
                    <button disabled={busy} className="adm-btn" onClick={()=>inspect(match,answer.intent)}>{label(match)}</button>
                    {match.product && <p>Khả dụng {str((match.lot ?? match.product).available)} {str(match.product.unit)}</p>}
                    {match.lot && <p>Hạn dùng {str(match.lot.expiryDate) || 'chưa ghi nhận'} · {str(match.lot.status)}</p>}
                    {match.listing && <p>{str(match.listing.region)} · {money(match.listing.price)}</p>}
                </div>)}
            </section>)}
            {pendingQuestion && <section aria-live="polite" className="wf-card"><strong>Bạn</strong><p>{pendingQuestion}</p><p>Trợ lý đang trả lời…</p></section>}
            {selected && <p>Đang chọn <strong>{label(selected)}</strong> <button className="adm-btn" onClick={()=>select(undefined)}>Bỏ chọn</button></p>}
            {error && !active && <p role="alert">{error}</p>}
            <form onSubmit={ask} className="wf-field">
                <label htmlFor="assistant-question">Câu hỏi hoặc yêu cầu</label>
                <textarea id="assistant-question" value={question} maxLength={1500} onChange={e=>setQuestion(e.target.value)} disabled={busy}/>
                <Button type="primary" htmlType="submit" loading={busy} disabled={busy || !term}>Gửi</Button>
            </form>
        </Drawer>
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
