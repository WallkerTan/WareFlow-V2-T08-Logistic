import ProfileEditor from '../../components/profile/ProfileEditor';

export default function StorehouseProfile() {
    return <ProfileEditor kind="storehouse" title="Hồ sơ kho" description="Theo dõi thông tin kho hàng, quyền sở hữu và hồ sơ bàn giao." sections={[
        { title: 'Thông tin kho hàng', description: 'Thông tin cơ bản về vị trí và quy mô kho.', fields: [
            { name: 'name', label: 'Tên kho', required: true }, { name: 'region', label: 'Khu vực', required: true },
            { name: 'area', label: 'Diện tích (m²)', type: 'number', required: true },
            { name: 'warehouse_type', label: 'Loại giao dịch', readOnly: true, hint: 'Mua / Thuê — được xác định qua giao dịch kho.' },
            { name: 'price', label: 'Giá mua / thuê (VNĐ)', readOnly: true, hint: 'Được quản lý trong giao dịch mua hoặc thuê kho.' },
            { name: 'address', label: 'Địa chỉ kho', type: 'textarea' },
        ] },
        { title: 'Sở hữu & bàn giao', description: 'Thông tin quản lý được cập nhật qua quy trình bàn giao kho.', fields: [
            { name: 'id', label: 'Mã kho', readOnly: true }, { name: 'owner_company_id', label: 'Mã công ty sở hữu', readOnly: true },
            { name: 'handover.employee', label: 'Nhân viên nhận bàn giao', readOnly: true }, { name: 'handover.time', label: 'Thời gian bàn giao', readOnly: true },
            { name: 'status', label: 'Trạng thái kho', readOnly: true, hint: 'Sẵn sàng / Chờ xử lý / Hoạt động / Đã trả.' }, { name: 'created_at', label: 'Ngày tạo', readOnly: true },
        ] },
    ]} />;
}
