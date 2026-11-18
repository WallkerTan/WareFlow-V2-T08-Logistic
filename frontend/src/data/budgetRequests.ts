import { useAdminData, saveResource } from "../services/data";
export type BudgetRequest = {
    id: string;
    warehouseId: string;
    warehouseName: string;
    company: string;
    amount: number;
    purpose: string;
    neededBy: string;
    createdAt: string;
    status: "pending" | "approved" | "rejected" | "cancelled";
    response?: string;
    resolvedAt?: string;
};

export function useBudgetRequests(): BudgetRequest[] {
    const { raw } = useAdminData("expenses");
    return raw.expenses.map((r) => ({
        id: String(r.id),
        warehouseId: String(r.warehouseId),
        warehouseName: String(
            raw.warehouses.find((w) => w.id === r.warehouseId)?.name || "",
        ),
        company: String(
            raw.companies.find((c) => c.id === r.companyId)?.name || "",
        ),
        amount: Number(r.amount),
        purpose: String(r.note || ""),
        neededBy:
            String(r.note || "").match(/Ngày cần: (\d{4}-\d{2}-\d{2})/)?.[1] ||
            "",
        createdAt: String(r.createdAt),
        status: String(r.status).toLowerCase() as BudgetRequest["status"],
        response: String(r.decisionNote || ""),
        resolvedAt: String(r.decidedAt || ""),
    }));
}
export async function createBudgetRequest(
    input: Omit<BudgetRequest, "id" | "createdAt" | "status">,
) {
    if (
        !Number.isSafeInteger(input.amount) ||
        input.amount <= 0 ||
        !input.purpose.trim() ||
        !input.warehouseId
    )
        throw new Error("Nhập đủ kho, mục đích và số tiền nguyên dương.");
    return saveResource("finance", "/expense-requests", "POST", {
        warehouseId: input.warehouseId,
        category: "OTHER",
        amount: input.amount,
        note: input.purpose.trim() + "\nNgày cần: " + input.neededBy,
    });
}
export async function resolveBudgetRequest(
    id: string,
    status: "approved" | "rejected" | "cancelled",
    response = "",
) {
    if (status === "cancelled")
        throw new Error("Liên hệ công ty để từ chối đề nghị chưa duyệt.");
    if (status === "rejected" && !response.trim())
        throw new Error("Vui lòng nhập lý do từ chối.");
    return saveResource(
        "finance",
        "/expense-requests/" +
            id +
            "/" +
            (status === "approved" ? "approve" : "reject"),
        "POST",
        { note: response },
    );
}
export const budgetStatus = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Từ chối",
    cancelled: "Đã hủy",
};
export const budgetMoney = (value: number) =>
    value.toLocaleString("vi-VN") + " ₫";
