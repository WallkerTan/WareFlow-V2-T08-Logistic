export type AssistantRole = 'admin' | 'company' | 'storehouse';
type Form = 'warehouse' | 'supplier' | 'supplierProduct' | 'employee' | 'budget' | 'transaction' | 'shipment' | 'export' | 'inventoryProduct';
type Destination = { label: string; path: string; form?: Form; purchase?: boolean };
type Action = Destination & { matches: RegExp };

const actions: Record<AssistantRole, Action[]> = {
    admin: [
        { label: 'Thêm nhà cung cấp', path: '/admin/suppliers', form: 'supplier', matches: /(?:tao|them|lap).*nha cung cap/ },
        { label: 'Thêm sản phẩm nhà cung cấp', path: '/admin/products', form: 'supplierProduct', matches: /(?:tao|them).*san pham/ },
        { label: 'Tạo kho hệ thống', path: '/admin/warehouses', form: 'warehouse', matches: /(?:tao|them).*kho/ },
        { label: 'Tài chính và ví', path: '/admin/finance', matches: /nap tien|vi kho|vi cong ty|tai chinh|bao cao|thu chi/ },
        { label: 'Duyệt yêu cầu kho', path: '/admin/approvals/warehouses', matches: /(?:duyet|phe duyet|tu choi).*kho/ },
        { label: 'Duyệt công ty', path: '/admin/approvals/companies', matches: /(?:duyet|tu choi).*cong ty/ },
        { label: 'Quản lý công ty', path: '/admin/companies', matches: /cong ty|doanh nghiep/ },
        { label: 'Danh mục nhà cung cấp', path: '/admin/suppliers', matches: /nha cung cap/ },
        { label: 'Danh mục sản phẩm', path: '/admin/products', matches: /san pham|sku/ },
        { label: 'Quản lý kho', path: '/admin/warehouses', matches: /quan ly kho|danh sach kho/ },
        { label: 'Vận đơn', path: '/admin/shipments', matches: /van don|giao hang|cod/ },
        { label: 'Tài khoản', path: '/admin/users', matches: /tai khoan|nguoi dung/ },
        { label: 'Nhật ký hệ thống', path: '/admin/logs', matches: /nhat ky|log he thong/ },
        { label: 'Thông báo', path: '/admin/notifications', matches: /thong bao/ },
        { label: 'Hồ sơ', path: '/admin/profile', matches: /ho so|doi mat khau/ },
    ],
    company: [
        { label: 'Thêm nhân viên', path: '/company/employees', form: 'employee', matches: /(?:tao|them).*nhan vien/ },
        { label: 'Lập ngân sách', path: '/company/finance', form: 'budget', matches: /lap ngan sach|tao ngan sach/ },
        { label: 'Ghi nhận thu chi', path: '/company/finance', form: 'transaction', matches: /(?:ghi|them|tao).*(?:thu chi|giao dich|khoan thu|khoan chi)/ },
        { label: 'Trung tâm phê duyệt', path: '/company/approvals', matches: /duyet|tu choi/ },
        { label: 'Điều chuyển và hoàn hàng', path: '/company/transfers', matches: /dieu chuyen|chuyen hang|hoan hang|tra hang/ },
        { label: 'Nhập hàng theo lô', path: '/company/inbound', matches: /^nhap hang$|(?:cach|lam sao|huong dan).*nhap hang|yeu cau nhap|(?:thanh toan|tu choi).*nhap/ },
        { label: 'Lô hàng mua', path: '/company/batches', matches: /(?:tao|them).*lo (?:hang|mua)|quan ly lo hang/ },
        { label: 'Quản lý nhân viên', path: '/company/employees', matches: /nhan vien/ },
        { label: 'Ngân sách và thu chi', path: '/company/finance', matches: /tai chinh|ngan sach|thu chi|chuyen tien|cap tien|so du/ },
        { label: 'Giao dịch kho', path: '/company/marketplace', matches: /mua kho|thue kho|giao dich kho/ },
        { label: 'Kho của công ty', path: '/company/warehouses', matches: /ban giao kho|tra kho|kho cua cong ty/ },
        { label: 'Hàng hóa các kho', path: '/company/inventory', matches: /danh sach hang|quan ly hang hoa/ },
        { label: 'Hồ sơ công ty', path: '/company/profile', matches: /ho so|doi mat khau/ },
    ],
    storehouse: [
        { label: 'Tạo vận đơn', path: '/storehouse/shipments', form: 'shipment', matches: /(?:tao|lap|them).*van don/ },
        { label: 'Ghi nhận khoản thu', path: '/storehouse/finance', form: 'transaction', matches: /(?:ghi|them|tao).*khoan thu/ },
        { label: 'Lập phiếu xuất bán', path: '/storehouse/outbound', form: 'export', matches: /tao lo xuat|lap phieu xuat|tao phieu xuat|(?:cach|lam sao|huong dan).*(?:xuat hang|xuat ban)/ },
        { label: 'Danh sách phiếu xuất', path: '/storehouse/outbound', matches: /gui duyet xuat|hoan tat xuat|huy phieu xuat|danh sach phieu xuat/ },
        { label: 'Thêm sản phẩm trong kho', path: '/storehouse/inventory', form: 'inventoryProduct', matches: /(?:tao|them) san pham(?: trong kho)?$/ },
        { label: 'Nhập hàng và lô mua', path: '/storehouse/inbound', matches: /^nhap hang$|(?:cach|lam sao|huong dan).*nhap hang|yeu cau nhap|(?:tao|them).*lo (?:hang|mua)|lich su nhap kho/ },
        { label: 'Giao hàng và vận đơn', path: '/storehouse/shipments', matches: /van don|giao hang|cod/ },
        { label: 'Lịch sử nhập xuất', path: '/storehouse/history', matches: /lich su|bien dong/ },
        { label: 'Ngân sách kho', path: '/storehouse/budget', matches: /ngan sach|yeu cau chi/ },
        { label: 'Thu chi kho', path: '/storehouse/finance', matches: /tai chinh|thu chi|so du/ },
        { label: 'Quản lý lô tồn', path: '/storehouse/lots', matches: /danh sach lo|quan ly lo|kiem ke/ },
        { label: 'Hàng hóa trong kho', path: '/storehouse/inventory', matches: /danh sach hang|quan ly hang hoa/ },
        { label: 'Hồ sơ kho', path: '/storehouse/profile', matches: /ho so|doi mat khau/ },
    ],
};

export function assistantActions(role: AssistantRole): Destination[] {
    return actions[role];
}

export function matchAssistantAction(role: AssistantRole, text: string): Destination | undefined {
    const normalized = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
    if (role !== 'admin' && /(?:don (?:mua|hang)|dat hang|lo mua)/.test(normalized)) {
        return { label: 'Tạo đơn mua', path: role === 'company' ? '/company/batches' : '/storehouse/inbound', purchase: true };
    }
    return actions[role].find(action => action.matches.test(normalized));
}

export type AssistantDestination = Destination;


const instructions: Record<string, string> = {
    '/admin/suppliers': 'Mở Nhà cung cấp, chọn Thêm nhà cung cấp, nhập thông tin liên hệ rồi lưu.',
    '/admin/products': 'Mở Sản phẩm, chọn Thêm sản phẩm, chọn nhà cung cấp và nhập tên, đơn vị, đơn giá. SKU được tạo khi lưu.',
    '/admin/warehouses': 'Mở Quản lý kho. Chọn Thêm kho mới để nhập tên, địa chỉ, diện tích và giá, hoặc mở một kho để chỉnh sửa.',
    '/admin/finance': 'Mở Tài chính. Để nạp tiền, chọn Nạp tiền vào ví, chọn công ty và kho nhận nếu cần, rồi kiểm tra phí trước khi xác nhận.',
    '/company/employees': 'Mở Quản lý nhân viên. Chọn Thêm nhân viên để nhập thông tin, hoặc mở một dòng để sửa, khóa hay xóa.',
    '/company/finance': 'Mở Ngân sách & thu chi. Chọn Lập ngân sách để đặt hạn mức, Ghi nhận thu/chi để ghi giao dịch, hoặc Chuyển tiền sang ví kho để cấp tiền.',
    '/company/inbound': 'Mở Nhập hàng hóa, chọn kho và lô mua, kiểm tra tiền hàng và phí rồi xác nhận thanh toán.',
    '/company/approvals': 'Mở Trung tâm phê duyệt, chọn chứng từ cần xử lý, kiểm tra nội dung rồi bấm Duyệt hoặc Từ chối.',
    '/company/transfers': 'Mở Điều chuyển hàng hóa, chọn kho xuất và kho nhận, thêm hàng, lưu phiếu rồi gửi duyệt.',
    '/storehouse/inbound': 'Mở Nhập hàng hóa. Chọn hoặc tạo lô mua, sau đó gửi yêu cầu nhập cho kho được giao để công ty duyệt.',
    '/storehouse/outbound': 'Mở Xuất hàng hóa, chọn Tạo lô xuất hàng, thêm SKU và số lượng, nhập thông tin người nhận rồi lưu nháp và gửi duyệt.',
    '/storehouse/shipments': 'Mở Giao hàng & vận đơn. Chọn phiếu xuất bán đã hoàn tất để tạo vận đơn, hoặc mở vận đơn có sẵn để cập nhật trạng thái.',
    '/storehouse/finance': 'Mở Thu chi kho để xem số dư. Chọn Ghi nhận khoản thu, nhập số tiền và kiểm tra trước khi lưu.',
};

export function guideAssistantAction(destination: AssistantDestination): string {
    if (destination.purchase) {
        return 'Bạn có thể tạo lô mua từ danh mục nhà cung cấp hoặc nhắn “Tạo đơn mua 3 SK1-01, 2 SK1-02”. Kiểm tra các dòng hàng rồi xác nhận. Lô mua có thể được chọn trong luồng nhập kho.';
    }
    return instructions[destination.path] ?? ('Mở mục ' + destination.label + ' và chọn bản ghi hoặc thao tác phù hợp.');
}
