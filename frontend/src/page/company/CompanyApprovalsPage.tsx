import BatchImportPage from '../../components/workspace/BatchImportPage';
import RecordsPage from "../../components/workspace/RecordsPage";
import BudgetRequestList from "../../components/workspace/BudgetRequestList";
import { useBudgetRequests } from "../../data/budgetRequests";
export default function CompanyApprovalsPage() {
    const requests = useBudgetRequests();
    return (
        <div className="wf-operation-stack">
            <BatchImportPage/><RecordsPage mode="approvals" />
            <BudgetRequestList requests={requests} companyView />
        </div>
    );
}
