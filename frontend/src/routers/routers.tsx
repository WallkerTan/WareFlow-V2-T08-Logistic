import { createBrowserRouter } from "react-router-dom";
import NotFound from "../page/NotFound";
import LandingPage from "../page/LandingPage";
const router_wareflow_v2 = createBrowserRouter([
    {
        path: "*",
        element: <NotFound />,
    },
    {
        path: "/",
        element: <LandingPage />,
    },
]);
export default router_wareflow_v2;
