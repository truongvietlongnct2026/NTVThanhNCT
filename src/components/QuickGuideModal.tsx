import React from 'react';
import { X } from 'lucide-react';

interface QuickGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({
  open,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 id="guide-title" className="text-base font-bold text-slate-900">
            Hướng dẫn nhanh — Đọc bản vẽ 3 hình chiếu (Góc chiếu thứ nhất)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            aria-label="Đóng hướng dẫn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-sm text-slate-700">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              1. Vị trí 3 hình chiếu theo chuẩn TCVN (Góc chiếu thứ nhất)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="font-semibold text-slate-900">Hình chiếu đứng (Trên - Trái)</p>
                <p className="mt-1 text-slate-600">
                  Nhìn từ trước tới (+Z). Thể hiện chiều Rộng (X) và chiều Cao (Y).
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="font-semibold text-slate-900">Hình chiếu bằng (Dưới - Trái)</p>
                <p className="mt-1 text-slate-600">
                  Nhìn từ trên xuống (+Y). Thẳng cột với Hình chiếu đứng, thể hiện Rộng (X) và Sâu (Z).
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="font-semibold text-slate-900">Hình chiếu cạnh (Trên - Phải)</p>
                <p className="mt-1 text-slate-600">
                  Nhìn từ trái sang (-X). Thẳng hàng với Hình chiếu đứng, thể hiện Sâu (Z) và Cao (Y).
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              2. Quy ước 3 loại nét vẽ kỹ thuật cơ bản
            </h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-3">
                <span className="inline-block w-12 h-0.5 bg-slate-900 shrink-0" />
                <span>
                  <strong className="text-slate-900">Nét liền đậm:</strong> Đường bao thấy, cạnh thấy của vật thể và rãnh hở.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="inline-block w-12 border-t-2 border-dashed border-blue-600 shrink-0" />
                <span>
                  <strong className="text-slate-900">Nét đứt mảnh:</strong> Cạnh khuất, lỗ rỗng hoặc rãnh nằm sau bề mặt che.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="inline-block w-12 border-t border-dashed border-red-600 shrink-0" />
                <span>
                  <strong className="text-slate-900">Đường tâm / đường trục:</strong> Trục đối xứng của rãnh chữ T và tâm của lỗ trụ tròn.
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              3. Quy trình 4 bước dựng khối 3D hiệu quả
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600">
              <li>
                Đếm ô lưới để xác định kích thước phôi hộp bao ngoài (mặc định Rộng 6 × Cao 4 × Sâu 4).
              </li>
              <li>
                Dùng thao tác <strong>Cắt bậc</strong> hoặc <strong>Vát mặt nghiêng</strong> để tạo dáng khối chính.
              </li>
              <li>
                Dùng <strong>Rãnh chữ nhật</strong>, <strong>Rãnh chữ T</strong>, <strong>Lỗ trụ tròn</strong> hoặc <strong>Lỗ chữ nhật</strong> để tạo các hốc và lỗ xuyên theo đúng trục.
              </li>
              <li>
                Bật chế độ <strong>Xuyên thấu</strong> hoặc xoay theo các hướng Đứng / Bằng / Cạnh để đối chiếu với bản vẽ 2D trước khi bấm <strong>Kiểm tra kết quả</strong>.
              </li>
            </ol>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Đã hiểu, bắt đầu luyện tập
          </button>
        </div>
      </div>
    </div>
  );
};
