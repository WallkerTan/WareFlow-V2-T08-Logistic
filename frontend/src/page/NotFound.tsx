import { useNavigate } from "react-router-dom";

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="bg-white p-8 rounded-2xl shadow-md text-center max-w-md">
                <div className="text-6xl mb-4">-.-</div>
                <h1 className="text-xl font-semibold text-gray-800 mb-2">
                    Trang bạn tìm không tồn tại.
                </h1>
                <p className="text-gray-500 text-sm mb-6">
                    Có thể đường dẫn bạn nhập sai hoặc trang đã được di chuyển.
                </p>

                <div className="flex justify-center gap-3 mb-6">
                    <button
                        onClick={() => navigate("/")}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg transition"
                    >
                        Quay về trang chủ
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="border border-gray-300 px-5 py-2 rounded-lg hover:bg-gray-100 transition"
                    >
                        Quay lại
                    </button>
                </div>

                <p className="text-xs text-gray-400">
                    Nếu vấn đề tiếp tục, kiểm tra URL hoặc liên hệ quản trị
                    viên.
                </p>
            </div>
        </div>
    );
}
