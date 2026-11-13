import { useState } from 'react';
export default function PeriodPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const [kind, setKind] = useState(value.startsWith('Q') ? 'quarter' : value.length === 4 ? 'year' : 'month');
    const [year, setYear] = useState(value.match(/\d{4}/)?.[0] || String(new Date().getFullYear()));
    const [month, setMonth] = useState(/^\d{4}-\d{2}$/.test(value) ? value : `${year}-01`);
    const [quarter, setQuarter] = useState(value.startsWith('Q') ? value[1] : '1');
    return <form className="live-toolbar" aria-label="Chọn kỳ báo cáo" onSubmit={e => { e.preventDefault(); onChange(kind === 'month' ? month : kind === 'quarter' ? `Q${quarter}-${year}` : year); }}><label>Loại kỳ<select value={kind} onChange={e => setKind(e.target.value)}><option value="month">Theo tháng</option><option value="quarter">Theo quý</option><option value="year">Theo năm</option></select></label>{kind === 'month' ? <label>Tháng<input type="month" value={month} required onChange={e => setMonth(e.target.value)} /></label> : <><label>Năm<input type="number" min="2000" max="9999" step="1" required value={year} onChange={e => setYear(e.target.value)} /></label>{kind === 'quarter' && <label>Quý<select value={quarter} onChange={e => setQuarter(e.target.value)}>{[1, 2, 3, 4].map(q => <option key={q} value={q}>Quý {q}</option>)}</select></label>}</>}<button className="adm-btn" type="submit">Xem kỳ</button></form>;
}
