import {
    Warehouse,
    Boxes,
    PackagePlus,
    PackageMinus,
    Truck,
    History,
    Wallet,
} from "lucide-react";
import WorkspaceShell from "../../components/workspace/WorkspaceShell";
export default function StorehouseLayout() {
    return (
        <WorkspaceShell
            config={{
                role: "storehouse",
                title: "Không gian kho",
                description: "Quản lý kho & logistics",
                navLabel: "KHÔNG GIAN LÀM VIỆC",
                home: "/storehouse/inventory",
                profile: "/storehouse/profile",
                avatar: "QL",
                topbarLabel: "Không gian kho",
                icon: Warehouse,
                links: [
                    {
                        to: "/storehouse/lots",
                        label: "Quản lí hàng hóa của kho",
                        icon: Boxes,
                    },
                    {
                        to: "/storehouse/inventory",
                        label: "Hàng hóa & thu chi",
                        icon: Boxes,
                    },
                    {
                        to: "/storehouse/budget",
                        label: "Ngân sách",
                        icon: Wallet,
                    },
                    {
                        to: "/storehouse/inbound",
                        label: "Nhập hàng hóa",
                        icon: PackagePlus,
                    },
                    {
                        to: "/storehouse/outbound",
                        label: "Xuất hàng hóa",
                        icon: PackageMinus,
                    },
                    {
                        to: "/storehouse/shipments",
                        label: "Giao hàng & vận đơn",
                        icon: Truck,
                    },
                    {
                        to: "/storehouse/history",
                        label: "Lịch sử nhập xuất",
                        icon: History,
                    },
                    {
                        to: "/storehouse/profile",
                        label: "Hồ sơ kho",
                        icon: Warehouse,
                    },
                ],
            }}
        />
    );
}
