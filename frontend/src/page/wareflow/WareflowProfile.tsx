import ProfileEditor from '../../components/profile/ProfileEditor';

export default function WareflowProfile() {
    return <ProfileEditor kind="wareflow" title="Hồ sơ hệ thống WareFlow" description="Quản lý hồ sơ tài khoản quản trị trung tâm hệ thống." sections={[
        { title: 'Thông tin quản trị viên', description: 'Hồ sơ tài khoản quản trị hệ thống WareFlow.', fields: [
            { name: 'full_name', label: 'Họ và tên', required: true }, { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'avatar', label: 'Đường dẫn ảnh đại diện', type: 'url', placeholder: 'https://…' }, { name: 'profile.phone', label: 'Số điện thoại', type: 'tel' },
            { name: 'profile.address', label: 'Địa chỉ liên hệ', type: 'textarea' },
        ] },
        { title: 'Thông tin tài khoản hệ thống', description: 'Quyền quản trị và thông tin do hệ thống quản lý.', fields: [
            { name: 'id', label: 'Mã tài khoản', readOnly: true }, { name: 'role', label: 'Vai trò', readOnly: true, hint: 'Quản trị hệ thống (system_admin).' },
            { name: 'status', label: 'Trạng thái tài khoản', readOnly: true, hint: 'Đang hoạt động / Đã khóa.' }, { name: 'created_at', label: 'Ngày tạo', readOnly: true },
        ] },
    ]} />;
}
