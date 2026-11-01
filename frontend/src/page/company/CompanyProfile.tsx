import ProfileEditor from '../../components/profile/ProfileEditor';

export default function CompanyProfile() {
    return <ProfileEditor kind="company" title="Hồ sơ công ty" description="Quản lý thông tin doanh nghiệp và hồ sơ pháp lý của công ty." sections={[
        { title: 'Thông tin doanh nghiệp', description: 'Thông tin nhận diện và lĩnh vực hoạt động.', fields: [
            { name: 'name', label: 'Tên công ty', required: true },
            { name: 'business_model', label: 'Mô hình kinh doanh', type: 'select', required: true, options: [{ value: 'food', label: 'Thực phẩm' }, { value: 'tech', label: 'Công nghệ' }, { value: 'appliance', label: 'Đồ gia dụng' }, { value: 'fashion', label: 'Thời trang' }] },
            { name: 'profile.tax_code', label: 'Mã số thuế', hint: 'Thông tin pháp lý trong hồ sơ doanh nghiệp.' },
            { name: 'profile.logo', label: 'Đường dẫn logo', type: 'url', placeholder: 'https://…' },
            { name: 'profile.address', label: 'Địa chỉ trụ sở', type: 'textarea' },
            { name: 'profile.description', label: 'Giới thiệu công ty', type: 'textarea' },
        ] },
        { title: 'Thông tin quản lý', description: 'Thông tin được hệ thống cấp khi công ty đăng ký.', fields: [
            { name: 'id', label: 'Mã công ty', readOnly: true }, { name: 'status', label: 'Trạng thái', readOnly: true, hint: 'Chờ duyệt / Đang hoạt động / Đã khóa.' }, { name: 'created_at', label: 'Ngày tạo', readOnly: true },
        ] },
    ]} />;
}
