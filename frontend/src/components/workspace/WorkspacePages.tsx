import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Boxes,
    Warehouse,
    Wallet,
    TrendingUp,
    Search,
    Plus,
    ArrowUpRight,
    AlertTriangle,
    ShieldAlert,
    Trash2,
    Database,
    Info,
    Check,
    X,
} from "lucide-react";
import {
    AreaChart,
    Area,
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import { Card, StatCard, Badge, Modal } from "../../components/admin/AdminUI";
export function Heading({
    title,
    action,
}: {
    title: string;
    action?: {
        to: string;
        label: string;
    };
}) {
    return (
        <div className="admin-page-head">
            <div>
                <span className="workspace-eyebrow">WAREFLOW / VẬN HÀNH</span>
                <h2>{title}</h2>
                <p>
                    Theo dõi và quản lý tập trung mọi hoạt động. Dữ liệu minh
                    họa giao diện.
                </p>
            </div>
            {action && (
                <Link className="adm-btn adm-btn-primary" to={action.to}>
                    <Plus size={16} />
                    {action.label}
                </Link>
            )}
        </div>
    );
}
function Stats() {
    return (
        <div className="adm-stats">
            <StatCard
                label="Tổng sản phẩm"
                value="2.688"
                icon={<Boxes size={20} />}
                trend="12,8%"
                footnote="so với tháng trước"
            />
            <StatCard
                label="Kho đang hoạt động"
                value="03"
                icon={<Warehouse size={20} />}
                footnote="Trong mạng lưới công ty"
            />
            <StatCard
                label="Tổng thu tháng này"
                value="860 triệu ₫"
                icon={<TrendingUp size={20} />}
                tone="success"
                trend="8,2%"
            />
            <StatCard
                label="Tổng chi tháng này"
                value="552 triệu ₫"
                icon={<Wallet size={20} />}
                tone="warning"
                footnote="308 triệu ₫ chênh lệch thu chi"
            />
        </div>
    );
}
export function DataPage({
    title,
    columns,
    rows,
    embedded = false,
    action,
}: {
    title: string;
    columns: string[];
    rows: string[][];
    embedded?: boolean;
    action?: {
        to: string;
        label: string;
    };
}) {
    const [query, setQuery] = useState("");
    const [tableRows, setTableRows] = useState<string[][]>(rows);
    const [selectedRow, setSelectedRow] = useState<string[] | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const [editForm, setEditForm] = useState<Record<number, string>>({});
    const [notification, setNotification] = useState<{ text: string; tone: "success" | "danger" | "info" } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        setTableRows(rows);
    }, [rows]);

    const filtered = tableRows.filter((r) =>
        r
            .join(" ")
            .toLocaleLowerCase("vi")
            .includes(query.toLocaleLowerCase("vi")),
    );

    // Entity & Relation Analysis based on WareFlow CSDL schema
    const titleLower = title.toLowerCase();
    let serviceInfo = {
        service: "core-service",
        table: "records",
        desc: "Dữ liệu vận hành hệ thống WareFlow",
        isReadOnly: false,
        canDelete: true,
        deleteWarning: "Hành động này sẽ xóa dữ liệu khỏi hệ thống.",
    };

    if (titleLower.includes("lịch sử") || titleLower.includes("nhật ký") || titleLower.includes("biến động")) {
        serviceInfo = {
            service: "inventory-service",
            table: "stock_movements (Sổ biến động kho)",
            desc: "Nhật ký biến động kho là bản ghi bất biến (Append-only). Không được sửa hoặc xóa theo quy định truy vết kho.",
            isReadOnly: true,
            canDelete: false,
            deleteWarning: "Ràng buộc bảo mật & kiểm toán: Không thể xóa sổ nhật ký biến động kho đã ghi nhận.",
        };
    } else if (titleLower.includes("giao dịch") || titleLower.includes("ngân sách") || titleLower.includes("thu chi")) {
        serviceInfo = {
            service: "finance-service",
            table: "transactions / budgets",
            desc: "Dữ liệu tài chính & ngân sách đã hạch toán. Bất biến để phục vụ đối soát và kiểm toán.",
            isReadOnly: true,
            canDelete: false,
            deleteWarning: "Ràng buộc tài chính: Giao dịch tài chính đã ghi sổ cái không thể xóa hoặc chỉnh sửa số tiền.",
        };
    } else if (titleLower.includes("điều chuyển")) {
        serviceInfo = {
            service: "inventory-service",
            table: "stock_documents (Loại: export_transfer)",
            desc: "Phiếu điều chuyển kho hàng hóa giữa các kho trong mạng lưới doanh nghiệp.",
            isReadOnly: false,
            canDelete: true,
            deleteWarning: "Nếu phiếu đã 'Hoàn tất' hoặc 'Đang vận chuyển', không nên xóa để tránh chênh lệch tồn giữa 2 kho.",
        };
    } else if (titleLower.includes("nhập hàng")) {
        serviceInfo = {
            service: "inventory-service",
            table: "stock_documents (Loại: PO / receipt)",
            desc: "Phiếu nhập hàng từ nhà cung cấp hoặc điều chuyển đến kho.",
            isReadOnly: false,
            canDelete: true,
            deleteWarning: "Phiếu nhập đã duyệt/hoàn tất không thể xóa trực tiếp vì đã tạo các lô hàng tương ứng.",
        };
    } else if (titleLower.includes("xuất hàng")) {
        serviceInfo = {
            service: "inventory-service",
            table: "stock_documents (Loại: export_sale / export_transfer)",
            desc: "Phiếu xuất kho cho đơn bán hoặc điều chuyển.",
            isReadOnly: false,
            canDelete: true,
            deleteWarning: "Phiếu xuất đã giao hoặc xuất kho thực tế sẽ trừ tồn hàng; không thể xóa trực tiếp.",
        };
    } else if (titleLower.includes("vận đơn") || titleLower.includes("giao hàng")) {
        serviceInfo = {
            service: "delivery-service",
            table: "shipments (Vận đơn giao hàng)",
            desc: "Theo dõi hành trình giao nhận, đơn vị vận chuyển và tiền COD.",
            isReadOnly: false,
            canDelete: true,
            deleteWarning: "Vận đơn đã bàn giao cho ĐVVC hoặc đã giao thành công không thể xóa.",
        };
    } else if (titleLower.includes("phê duyệt")) {
        serviceInfo = {
            service: "core-service",
            table: "warehouse_transactions / approvals",
            desc: "Yêu cầu mua/thuê kho, cấp ngân sách hoặc điều chuyển chờ ban lãnh đạo phê duyệt.",
            isReadOnly: false,
            canDelete: true,
            deleteWarning: "Xóa yêu cầu sẽ hủy quy trình duyệt của tài liệu này.",
        };
    } else if (titleLower.includes("nhân viên")) {
        serviceInfo = {
            service: "core-service",
            table: "users (Tài khoản người dùng)",
            desc: "Nhân sự thuộc doanh nghiệp và kho quản lý.",
            isReadOnly: false,
            canDelete: false,
            deleteWarning: "Ràng buộc khóa ngoại: Nhân viên đã phát sinh lịch sử thao tác kho không được xóa; hãy chuyển Trạng thái thành 'Khóa'.",
        };
    } else if (titleLower.includes("hàng hóa") || titleLower.includes("sản phẩm")) {
        serviceInfo = {
            service: "inventory-service",
            table: "products (Danh mục hàng hóa)",
            desc: "Thông tin mã hàng, đơn giá, số lượng tồn và trạng thái sản phẩm.",
            isReadOnly: false,
            canDelete: true,
            deleteWarning: "Sản phẩm còn tồn kho hoặc có lô hàng (stock_lots) liên kết không thể xóa.",
        };
    } else if (titleLower.includes("hiệu suất") || titleLower.includes("kho")) {
        serviceInfo = {
            service: "core-service",
            table: "warehouses (Kho hàng)",
            desc: "Hạ tầng kho bãi và sức chứa lưu trữ.",
            isReadOnly: false,
            canDelete: false,
            deleteWarning: "Kho đang hoạt động chứa hàng hóa không thể xóa trực tiếp.",
        };
    }

    const openRowDetail = (row: string[], index: number) => {
        setSelectedRow(row);
        setSelectedIndex(index);
        const initialForm: Record<number, string> = {};
        row.forEach((val, idx) => {
            initialForm[idx] = val;
        });
        setEditForm(initialForm);
        setConfirmDelete(false);
    };

    const handleFieldChange = (idx: number, value: string) => {
        setEditForm((prev) => ({ ...prev, [idx]: value }));
    };

    const handleSave = () => {
        if (!selectedRow || selectedIndex === -1) return;
        const updatedRow = columns.map((_, idx) => editForm[idx] ?? selectedRow[idx]);
        const updatedTable = [...tableRows];
        // find index in original table
        const originalIdx = tableRows.findIndex(
            (r) => r[0] === selectedRow[0] && r[1] === selectedRow[1]
        );
        if (originalIdx !== -1) {
            updatedTable[originalIdx] = updatedRow;
            setTableRows(updatedTable);
        }
        setSelectedRow(null);
        setNotification({
            text: `Đã cập nhật thông tin "${updatedRow[0]}" thành công.`,
            tone: "success",
        });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleQuickAction = (newStatus: string) => {
        if (!selectedRow) return;
        const statusIdx = columns.length - 1;
        const updatedRow = [...selectedRow];
        updatedRow[statusIdx] = newStatus;
        const updatedTable = [...tableRows];
        const originalIdx = tableRows.findIndex((r) => r[0] === selectedRow[0]);
        if (originalIdx !== -1) {
            updatedTable[originalIdx] = updatedRow;
            setTableRows(updatedTable);
        }
        setSelectedRow(null);
        setNotification({
            text: `Đã chuyển trạng thái "${updatedRow[0]}" thành "${newStatus}".`,
            tone: "success",
        });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleDelete = () => {
        if (!selectedRow) return;
        const idToDelete = selectedRow[0];
        setTableRows((prev) => prev.filter((r) => r[0] !== idToDelete));
        setSelectedRow(null);
        setNotification({
            text: `Đã xóa bản ghi "${idToDelete}" khỏi hệ thống.`,
            tone: "danger",
        });
        setTimeout(() => setNotification(null), 4000);
    };

    return (
        <>
            {!embedded && <Heading title={title} action={action} />}
            <Card title={embedded ? title : undefined}>
                {notification && (
                    <div
                        style={{
                            margin: "0 0 16px",
                            padding: "10px 16px",
                            borderRadius: 8,
                            fontSize: 13,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background:
                                notification.tone === "success"
                                    ? "#eaf8f1"
                                    : notification.tone === "danger"
                                      ? "#fdeded"
                                      : "#eef4fd",
                            color:
                                notification.tone === "success"
                                    ? "#137359"
                                    : notification.tone === "danger"
                                      ? "#b42318"
                                      : "#175cd3",
                            border: `1px solid ${
                                notification.tone === "success"
                                    ? "#a3e2c3"
                                    : notification.tone === "danger"
                                      ? "#fecdca"
                                      : "#b2ccff"
                            }`,
                        }}
                    >
                        <span>
                            <strong>Thông báo:</strong> {notification.text}
                        </span>
                        <button
                            onClick={() => setNotification(null)}
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "inherit",
                                fontWeight: "bold",
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}
                <div className="workspace-toolbar">
                    <label>
                        <Search size={16} />
                        <input
                            aria-label={"Tìm kiếm " + title}
                            placeholder="Tìm kiếm theo mã, tên hoặc nội dung…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </label>
                    <span>{filtered.length} bản ghi (Nhấp vào dòng để xem chi tiết)</span>
                </div>
                <div className="workspace-table">
                    <table>
                        <thead>
                            <tr>
                                {columns.map((c) => (
                                    <th key={c}>{c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r, i) => (
                                <tr
                                    key={i}
                                    onClick={() => openRowDetail(r, i)}
                                    title="Nhấp để xem & cập nhật chi tiết"
                                >
                                    {r.map((v, j) => (
                                        <td key={j}>
                                            {j === r.length - 1 ? (
                                                <Badge
                                                    label={v}
                                                    tone={
                                                        /Chờ|Sắp|Khóa/.test(v)
                                                            ? "warning"
                                                            : /Đang|Xử lý/.test(v)
                                                              ? "info"
                                                              : /Hủy|Lỗi/.test(v)
                                                                ? "danger"
                                                                : "success"
                                                    }
                                                />
                                            ) : (
                                                v
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!filtered.length && (
                        <p className="workspace-empty">
                            Không có bản ghi phù hợp.
                        </p>
                    )}
                </div>
                <div className="workspace-table-footer">
                    <span>
                        Hiển thị {filtered.length} bản ghi · Nhấp trực tiếp vào dòng để mở chi tiết & chỉnh sửa
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Database size={12} /> {serviceInfo.service}
                    </span>
                </div>
            </Card>

            {selectedRow && (
                <Modal
                    title={`Chi tiết: ${selectedRow[0]} - ${selectedRow[1] || ""}`}
                    description={`Bản ghi thuộc bảng ${serviceInfo.table}`}
                    onClose={() => setSelectedRow(null)}
                    footer={
                        <div
                            style={{
                                display: "flex",
                                width: "100%",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <div>
                                {serviceInfo.canDelete ? (
                                    confirmDelete ? (
                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                            <span style={{ fontSize: 12, color: "#d92d20" }}>Xác nhận xóa?</span>
                                            <button
                                                className="adm-btn adm-btn-danger adm-btn-sm"
                                                onClick={handleDelete}
                                            >
                                                Xóa vĩnh viễn
                                            </button>
                                            <button
                                                className="adm-btn adm-btn-sm"
                                                onClick={() => setConfirmDelete(false)}
                                            >
                                                Hủy
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className="adm-btn adm-btn-danger adm-btn-sm"
                                            onClick={() => setConfirmDelete(true)}
                                            title={serviceInfo.deleteWarning}
                                        >
                                            <Trash2 size={14} /> Xóa bản ghi
                                        </button>
                                    )
                                ) : (
                                    <span
                                        style={{
                                            fontSize: 11,
                                            color: "#667085",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                        }}
                                        title={serviceInfo.deleteWarning}
                                    >
                                        <ShieldAlert size={14} color="#f79009" /> Không thể xóa (ràng buộc quan hệ CSDL)
                                    </span>
                                )}
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                                <button className="adm-btn" onClick={() => setSelectedRow(null)}>
                                    Đóng
                                </button>
                                {!serviceInfo.isReadOnly && (
                                    <button className="adm-btn adm-btn-primary" onClick={handleSave}>
                                        <Check size={14} /> Lưu thay đổi
                                    </button>
                                )}
                            </div>
                        </div>
                    }
                >
                    {/* Relationship constraint notice banner */}
                    <div
                        style={{
                            padding: "12px 14px",
                            borderRadius: 8,
                            marginBottom: 18,
                            fontSize: 12.5,
                            lineHeight: 1.5,
                            background: serviceInfo.isReadOnly ? "#f8f9fc" : "#fefbf3",
                            border: `1px solid ${serviceInfo.isReadOnly ? "#dbe1ed" : "#fbe09c"}`,
                            color: serviceInfo.isReadOnly ? "#344054" : "#934e00",
                        }}
                    >
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            {serviceInfo.isReadOnly ? (
                                <Info size={16} color="#4567ed" style={{ flexShrink: 0, marginTop: 2 }} />
                            ) : (
                                <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                            )}
                            <div>
                                <strong>Ràng buộc quan hệ CSDL ({serviceInfo.service}):</strong>
                                <p style={{ margin: "4px 0 0" }}>{serviceInfo.desc}</p>
                                <p style={{ margin: "4px 0 0", fontSize: 11.5, opacity: 0.9 }}>
                                    {serviceInfo.deleteWarning}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick approval action if status is pending */}
                    {selectedRow[selectedRow.length - 1] === "Chờ duyệt" && (
                        <div
                            style={{
                                padding: "12px 14px",
                                borderRadius: 8,
                                marginBottom: 18,
                                background: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <div>
                                <strong style={{ color: "#166534", fontSize: 13 }}>Thao tác phê duyệt nhanh:</strong>
                                <p style={{ margin: 0, fontSize: 12, color: "#15803d" }}>
                                    Yêu cầu đang chờ quản trị viên xử lý.
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                                <button
                                    className="adm-btn adm-btn-sm"
                                    style={{ background: "#16a34a", color: "#fff", borderColor: "#16a34a" }}
                                    onClick={() => handleQuickAction("Đã duyệt")}
                                >
                                    <Check size={13} /> Duyệt yêu cầu
                                </button>
                                <button
                                    className="adm-btn adm-btn-sm adm-btn-danger"
                                    onClick={() => handleQuickAction("Từ chối")}
                                >
                                    <X size={13} /> Từ chối
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Edit Form Fields */}
                    <div className="adm-form">
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 14,
                            }}
                        >
                            {columns.map((col, idx) => {
                                const val = editForm[idx] ?? selectedRow[idx] ?? "";
                                const isKey = idx === 0;
                                const isStatus = idx === columns.length - 1;
                                const isNumber = /Số lượng|Tồn kho|Đơn giá|Số tiền|Công suất/.test(col);

                                return (
                                    <div
                                        className="adm-field"
                                        key={col}
                                        style={
                                            col.includes("Nội dung") || col.includes("Địa chỉ") || col.includes("Ghi chú")
                                                ? { gridColumn: "span 2" }
                                                : undefined
                                        }
                                    >
                                        <label>
                                            {col} {isKey && <span style={{ color: "#667085" }}>(Mã định danh)</span>}
                                        </label>
                                        {isKey || serviceInfo.isReadOnly ? (
                                            <input
                                                className="adm-input"
                                                value={val}
                                                disabled
                                                style={{ background: "#f8f9fb", cursor: "not-allowed" }}
                                            />
                                        ) : isStatus ? (
                                            <select
                                                className="adm-select"
                                                value={val}
                                                onChange={(e) => handleFieldChange(idx, e.target.value)}
                                            >
                                                <option value={val}>{val} (Hiện tại)</option>
                                                {["Hoạt động", "Khóa", "Chờ duyệt", "Đã duyệt", "Hoàn tất", "Đang xử lý", "Đang giao", "Đã giao", "Sẵn sàng", "Sắp hết", "Đã hủy"]
                                                    .filter((opt) => opt !== val)
                                                    .map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                            </select>
                                        ) : (
                                            <input
                                                className="adm-input"
                                                type={isNumber ? "text" : "text"}
                                                value={val}
                                                onChange={(e) => handleFieldChange(idx, e.target.value)}
                                                placeholder={`Nhập ${col.toLowerCase()}…`}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
const goods = [
    [
        "SP-001",
        "Gạo ST25 túi 5kg",
        "Thực phẩm",
        "Bình Dương",
        "1.240",
        "125.000 ₫",
        "Sẵn sàng",
    ],
    [
        "SP-002",
        "Dầu hướng dương 1L",
        "Thực phẩm",
        "Thủ Đức",
        "860",
        "58.000 ₫",
        "Sẵn sàng",
    ],
    [
        "SP-003",
        "Áo polo cotton",
        "Thời trang",
        "Long An",
        "48",
        "189.000 ₫",
        "Sắp hết",
    ],
    [
        "SP-004",
        "Tai nghe Bluetooth",
        "Điện tử",
        "Bình Dương",
        "325",
        "450.000 ₫",
        "Sẵn sàng",
    ],
    [
        "SP-005",
        "Bình giữ nhiệt 500ml",
        "Gia dụng",
        "Thủ Đức",
        "215",
        "235.000 ₫",
        "Sẵn sàng",
    ],
];
export function InventoryPage({
    storehouse = false,
}: {
    storehouse?: boolean;
}) {
    return (
        <>
            <Heading
                title={
                    storehouse
                        ? "Hàng hóa & thu chi của kho"
                        : "Hàng hóa các kho"
                }
                action={
                    storehouse
                        ? {
                              to: "/storehouse/inbound/new",
                              label: "Tạo phiếu nhập",
                          }
                        : undefined
                }
            />
            {storehouse ? (
                <div className="adm-stats">
                    <StatCard
                        label="Số mặt hàng"
                        value="02"
                        icon={<Boxes size={20} />}
                    />
                    <StatCard
                        label="Số lượng tồn"
                        value="1.565"
                        icon={<Warehouse size={20} />}
                    />
                    <StatCard
                        label="Thu trong tháng"
                        value="180 triệu ₫"
                        tone="success"
                        icon={<TrendingUp size={20} />}
                    />
                    <StatCard
                        label="Chi trong tháng"
                        value="115 triệu ₫"
                        tone="warning"
                        icon={<Wallet size={20} />}
                    />
                </div>
            ) : (
                <Stats />
            )}
            <DataPage
                embedded
                title="Danh sách hàng hóa"
                columns={[
                    "Mã sản phẩm",
                    "Tên sản phẩm",
                    "Danh mục",
                    "Kho",
                    "Tồn kho",
                    "Đơn giá",
                    "Trạng thái",
                ]}
                rows={
                    storehouse
                        ? goods.filter((r) => r[3] === "Bình Dương")
                        : goods
                }
            />
            {storehouse && (
                <div className="workspace-quick">
                    <Link to="/storehouse/finance">
                        Xem chi tiết thu chi <ArrowUpRight size={16} />
                    </Link>
                    <Link to="/storehouse/outbound/new">
                        Tạo phiếu xuất <ArrowUpRight size={16} />
                    </Link>
                </div>
            )}
        </>
    );
}
export function CompanyDashboard() {
    return (
        <>
            <Heading title="Tổng quan công ty" />
            <Stats />
            <div className="workspace-welcome">
                <div>
                    <Badge label="MẠNG LƯỚI ĐANG HOẠT ĐỘNG" tone="success" />
                    <h2>Mọi kho hàng. Một góc nhìn.</h2>
                    <p>
                        Kiểm soát hàng hóa, ngân sách và tiến độ vận hành trong
                        toàn doanh nghiệp.
                    </p>
                    <Link
                        className="adm-btn adm-btn-primary"
                        to="/company/inventory"
                    >
                        Quản lý hàng hóa <ArrowUpRight size={16} />
                    </Link>
                </div>
                <Warehouse size={110} strokeWidth={1} />
            </div>
            <DataPage
                embedded
                title="Hiệu suất các kho"
                columns={[
                    "Kho hàng",
                    "Khu vực",
                    "Số lượng tồn",
                    "Công suất",
                    "Trạng thái",
                ]}
                rows={[
                    [
                        "Kho Bình Dương",
                        "Bình Dương",
                        "1.565",
                        "78%",
                        "Hoạt động",
                    ],
                    [
                        "Kho Thủ Đức",
                        "TP. Hồ Chí Minh",
                        "1.075",
                        "64%",
                        "Hoạt động",
                    ],
                    ["Kho Long An", "Long An", "48", "32%", "Hoạt động"],
                ]}
            />
        </>
    );
}
const trend = [32, 45, 38, 61, 52, 78, 86].map((v, i) => ({
    name: "T" + (i + 5),
    thu: v,
    chi: Math.round(v * 0.64),
}));
export function FinancePage({ storehouse = false }: { storehouse?: boolean }) {
    const strokeColor = storehouse ? "#7955c1" : "#17846b";
    const fillColor = storehouse ? "#f3edfc" : "#eaf6f1";
    return (
        <>
            <Heading
                title={
                    storehouse
                        ? "Thu chi kho Bình Dương"
                        : "Ngân sách & thu chi"
                }
                action={
                    storehouse
                        ? undefined
                        : { to: "/company/budget/new", label: "Cấp ngân sách" }
                }
            />
            {!storehouse && <Stats />}
            <div className="workspace-columns">
                <Card
                    title="Biến động thu chi"
                    subtitle="Đơn vị: triệu đồng · Dữ liệu minh họa"
                >
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trend}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Area
                                    dataKey="thu"
                                    name="Thu"
                                    stroke={strokeColor}
                                    fill={fillColor}
                                />
                                <Area
                                    dataKey="chi"
                                    name="Chi"
                                    stroke="#22a88a"
                                    fill="#e7f7f2"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card
                    title={
                        storehouse ? "Ngân sách của kho" : "Phân bổ ngân sách"
                    }
                    subtitle="Kỳ ngân sách tháng 11"
                >
                    <div className="workspace-budgets">
                        {(storehouse
                            ? ["Bình Dương"]
                            : ["Bình Dương", "Thủ Đức", "Long An"]
                        ).map((n, i) => (
                            <div key={n}>
                                <strong>Kho {n}</strong>
                                <span>
                                    Đã dùng {[180, 120, 80][i]} / 250 triệu ₫
                                </span>
                                <progress value={[72, 48, 32][i]} max="100" />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
            <DataPage
                embedded
                title="Giao dịch gần đây"
                columns={[
                    "Mã giao dịch",
                    "Nội dung",
                    "Kho",
                    "Số tiền",
                    "Trạng thái",
                ]}
                rows={[
                    [
                        "GD-1024",
                        "Thu bán hàng",
                        "Bình Dương",
                        "+ 28.500.000 ₫",
                        "Hoàn tất",
                    ],
                    [
                        "GD-1023",
                        "Thanh toán nhà cung cấp",
                        "Bình Dương",
                        "− 12.800.000 ₫",
                        "Hoàn tất",
                    ],
                ]}
            />
        </>
    );
}
export function PreviewForm({
    title,
    fields,
    back,
}: {
    title: string;
    fields: string[];
    back: string;
}) {
    return (
        <>
            <Heading title={title} />
            <section className="wf-card">
                <form onSubmit={(e) => e.preventDefault()}>
                    <div className="wf-fields">
                        {fields.map((f) => (
                            <label className="wf-field" key={f}>
                                <span>{f}</span>
                                {/Ghi chú|Mô tả|Địa chỉ/.test(f) ? (
                                    <textarea
                                        placeholder={"Nhập " + f.toLowerCase()}
                                    />
                                ) : (
                                    <input
                                        type={
                                            /Số lượng|Số tiền|Đơn giá|Ngân sách/.test(
                                                f,
                                            )
                                                ? "number"
                                                : /Ngày/.test(f)
                                                  ? "date"
                                                  : "text"
                                        }
                                        placeholder={"Nhập " + f.toLowerCase()}
                                    />
                                )}
                            </label>
                        ))}
                    </div>
                    <p className="workspace-form-note">
                        Bản mẫu giao diện. Thông tin không được lưu vào hệ
                        thống.
                    </p>
                    <div className="wf-form-actions">
                        <Link className="adm-btn" to={back}>
                            Quay lại
                        </Link>
                        <button
                            className="adm-btn adm-btn-primary"
                            type="button"
                            disabled
                        >
                            Lưu (bản mẫu)
                        </button>
                    </div>
                </form>
            </section>
        </>
    );
}
