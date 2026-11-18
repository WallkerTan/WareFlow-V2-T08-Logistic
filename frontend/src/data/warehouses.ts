import { allPages, object, request } from '../services/api';
import type { Row } from '../services/api';
import { saveResource } from '../services/data';
import { useWorkspace } from '../services/workspace';
import { useQuery } from '../services/query';
export type Status = 'available' | 'pending' | 'active' | 'returned';
export type Depot = { id: string; name: string; region: string; address: string; area: number; price: number; type: string; status: Status; company: string; image: string; ownerCompanyId?: string; handover?: Row };
export function toDepot(w: Row): Depot { const images=object(w.profile).images; return {id:String(w.id),name:String(w.name||''),region:String(w.region||''),address:String(w.address||''),area:Number(w.area)||0,price:(Number(w.price)||0)/1e6,type:w.warehouseType==='BUY'?'Mua bán':'Cho thuê',status:String(w.status).toLowerCase() as Status,company:String(w.ownerCompanyName||''),image:Array.isArray(images)?String(images[0]||''):'',ownerCompanyId:String(w.ownerCompanyId||''),handover:object(w.handover)}; }
export function useDepots(marketplace=false): Depot[] {
 const scope=useWorkspace(); const market=useQuery<Row[]>(marketplace?'marketplace':null,()=>allPages('core','/warehouses?status=AVAILABLE'));
 return (marketplace ? market.data||[] : scope.warehouses).filter(w=>w.status!=='ARCHIVED').map(toDepot);
}
export async function createDepot(input: Omit<Depot,'id'>) { return saveResource('core','/warehouses','POST',{name:input.name,address:input.address,region:input.region,warehouseType:input.type==='Mua bán'?'BUY':'RENT',area:input.area,price:Math.round(input.price*1e6)}); }
export async function updateDepotStatus(depot: Depot, status: Status, transactionId?: string) {
 const transactions=await allPages<Row>('core','/warehouse-transactions');
 const candidates=transactions.filter(t=>t.warehouseId===depot.id&&['PENDING','NEGOTIATING'].includes(String(t.status)));
 const pending=transactionId?candidates.find(t=>t.id===transactionId):candidates.length===1?candidates[0]:undefined;
 if(candidates.length>1&&!transactionId)throw new Error('Chọn đề nghị cần xử lý.');
 if(!pending) throw new Error('Kho chưa có yêu cầu mua/thuê/trả đang chờ xử lý.');
 const action=status==='active'||status==='returned'?'approve':status==='available'?'reject':null;
 if(!action) throw new Error('Trạng thái này được cập nhật khi công ty gửi yêu cầu.');
 return saveResource('core','/warehouse-transactions/'+pending.id+'/'+action,'POST',{reason:action==='reject'?'Từ chối đề nghị qua quản lý kho':undefined});
}
export function depotImage(image: string, fallback: string) { return /^https?:\/\//.test(image)?image:fallback; }
export async function uploadImage(file: File, folder='general') { if(file.size>10*1024*1024)throw new Error('Ảnh tối đa 10 MB.');const body=new FormData();body.append('file',file);body.append('folder',folder); return request<{secureUrl:string;publicId:string}>('core','/upload/image',{method:'POST',body}); }
