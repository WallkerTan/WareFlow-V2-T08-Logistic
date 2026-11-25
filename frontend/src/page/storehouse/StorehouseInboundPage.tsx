import { useState } from 'react';
import RecordsPage from "../../components/workspace/RecordsPage";
import BatchImportPage from "../../components/workspace/BatchImportPage";
import PurchaseBatches from "../../components/workspace/PurchaseBatches";
import { Layers, PackagePlus, FileText } from 'lucide-react';

export default function StorehouseInboundPage() {
    const [tab, setTab] = useState<'batch' | 'catalog' | 'records'>('batch');

    return (
        <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
                <button
                    className={`adm-btn ${tab === 'batch' ? 'adm-btn-primary' : ''}`}
                    onClick={() => setTab('batch')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    <PackagePlus size={16} /> Nhập hàng hóa theo lô
                </button>
                <button
                    type="button"
                    className={`adm-btn ${tab === 'catalog' ? 'adm-btn-primary' : ''}`}
                    onClick={() => setTab('catalog')}
                >
                    <Layers size={16} /> Lô hàng mua
                </button>
                <button
                    className={`adm-btn ${tab === 'records' ? 'adm-btn-primary' : ''}`}
                    onClick={() => setTab('records')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    <FileText size={16} /> Phiếu nhập kho & PO
                </button>
            </div>

            {tab === 'batch' ? (
                <BatchImportPage />
            ) : tab === 'catalog' ? (
                <PurchaseBatches />
            ) : (
                <RecordsPage mode="inbound" />
            )}
        </div>
    );
}
