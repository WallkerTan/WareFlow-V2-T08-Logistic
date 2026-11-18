import RecordsPage from "../../components/workspace/RecordsPage";
import BudgetRequestList from "../../components/workspace/BudgetRequestList";
import { useBudgetRequests } from "../../data/budgetRequests";
export default function CompanyApprovalsPage() {
    const requests = useBudgetRequests();
    return (
        <>
            <RecordsPage mode="approvals" />
            <BudgetRequestList requests={requests} companyView />
        </>
    );
}
