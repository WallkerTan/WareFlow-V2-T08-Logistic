import { createBrowserRouter } from "react-router-dom";
import NotFound from "../page/NotFound";
const router_wareflow_v2 = createBrowserRouter([
    {
        path: "*",
        element: <NotFound />
    }
]);
export default router_wareflow_v2;
