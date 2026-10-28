import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "antd/dist/reset.css";
import { RouterProvider } from "react-router-dom";
import router_wareflow_v2 from "./routers/routers";
import { Store } from "./store/Store";
import { Provider } from "react-redux";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Provider store={Store}>
            <RouterProvider router={router_wareflow_v2} />
        </Provider>
    </StrictMode>,
);
