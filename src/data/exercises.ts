import { Exercise } from '../types/cad';

export const EXERCISES: Exercise[] = [
  {
    id: 'ex-1',
    number: 1,
    title: 'Khối hộp có rãnh bậc ngang',
    difficulty: 'Cơ bản',
    summary:
      'Làm quen với mối liên hệ giữa cạnh thấy (nét liền đậm) và cạnh khuất (nét đứt mảnh) khi có rãnh cắt ngang suốt chiều rộng.',
    target: {
      base: { w: 6, h: 4, d: 4 },
      features: [
        {
          id: 't1-slot',
          type: 'slot',
          enabled: true,
          label: 'Rãnh ngang mặt trên',
          axis: 'x',
          face: 'top',
          center: 2,
          width: 2,
          depth: 1,
        },
      ],
    },
    hints: [
      {
        title: 'Bước 1: Đọc kích thước bao ngoài trên 3 hình chiếu',
        explanation:
          'Hình chiếu đứng rộng 6 ô, cao 4 ô. Hình chiếu bằng rộng 6 ô, sâu 4 ô. Điều này xác định phôi ban đầu là khối hộp chữ nhật 6 × 4 × 4.',
        highlights: [
          { view: 'front', u0: 0, v0: 0, u1: 6, v1: 4, caption: 'Rộng 6 × Cao 4' },
          { view: 'top', u0: 0, v0: 0, u1: 6, v1: 4, caption: 'Rộng 6 × Sâu 4' },
        ],
      },
      {
        title: 'Bước 2: Giải mã nét đứt mảnh trên Hình chiếu đứng',
        explanation:
          'Ở độ cao y = 3 có một đường nét đứt mảnh nằm ngang suốt chiều rộng (0 → 6). Khi dóng sang Hình chiếu cạnh, ta thấy ngay rãnh lõm chữ U ở giữa mặt trên (sâu xuống 1 ô, rộng 2 ô theo chiều sâu Z).',
        highlights: [
          { view: 'front', u0: 0, v0: 2.75, u1: 6, v1: 3.25, caption: 'Đáy rãnh bị che khuất' },
          { view: 'left', u0: 1, v0: 3, u1: 3, v1: 4, caption: 'Biên dạng rãnh chữ U' },
        ],
      },
    ],
    completionExplanation:
      'Vì rãnh chạy ngang theo trục X ở chính giữa mặt trên (Z từ 1 đến 3), thành trước cao 4 đã che khuất đáy rãnh (cao 3) khi nhìn từ trước tới -> tạo ra nét đứt mảnh trên Hình chiếu đứng và rãnh lõm chữ U rõ ràng trên Hình chiếu cạnh.',
    projectionRelations: [
      'Hình chiếu đứng: Nét đứt ngang tại y = 3 thể hiện đáy rãnh bị thành trước che.',
      'Hình chiếu bằng: Hai nét liền đậm ngang tại z = 1 và z = 3 chia mặt trên thành 3 dải.',
      'Hình chiếu cạnh: Thấy trực diện mặt cắt chữ U của rãnh ngang.',
    ],
  },
  {
    id: 'ex-2',
    number: 2,
    title: 'Khối chữ L có rãnh dọc',
    difficulty: 'Cơ bản',
    summary:
      'Đọc cấu trúc khối chữ L không đối xứng kết hợp rãnh dọc khoét trên phần đế.',
    target: {
      base: { w: 6, h: 4, d: 4 },
      features: [
        {
          id: 't2-step',
          type: 'step_cut',
          enabled: true,
          label: 'Cắt bậc trên-phải tạo chữ L',
          corner: 'top-right',
          width: 4,
          height: 2,
        },
        {
          id: 't2-slot',
          type: 'slot',
          enabled: true,
          label: 'Rãnh dọc phần đế',
          axis: 'z',
          face: 'top',
          center: 4,
          width: 2,
          depth: 3,
          spanStart: 0,
          spanEnd: 4,
        },
      ],
    },
    hints: [
      {
        title: 'Bước 1: Nhận diện dáng chữ L ở Hình chiếu đứng',
        explanation:
          'Hình chiếu đứng có phần vai đứng bên trái cao 4 ô (x: 0→2) và phần đế bên phải cao 2 ô (x: 2→6). Đây là phép cắt bậc góc Trên-Phải (rộng 4, cao 2).',
        highlights: [
          { view: 'front', u0: 2, v0: 2, u1: 6, v1: 4, caption: 'Vùng cắt bậc trên-phải' },
        ],
      },
      {
        title: 'Bước 2: Đọc rãnh dọc ở phần đế',
        explanation:
          'Trên Hình chiếu đứng, tại phần đế bên phải (x: 3→5) có vết lõm sâu xuống đến y = 1. Dóng xuống Hình chiếu bằng thấy hai đường dọc chạy suốt từ sau ra trước, còn Hình chiếu cạnh xuất hiện nét đứt ngang tại y = 1.',
        highlights: [
          { view: 'front', u0: 3, v0: 1, u1: 5, v1: 2, caption: 'Rãnh lõm sâu 1 ô từ mặt đế' },
          { view: 'left', u0: 0, v0: 0.8, u1: 4, v1: 1.2, caption: 'Đáy rãnh bị vai trái che' },
        ],
      },
    ],
    completionExplanation:
      'Khối chữ L được tạo từ phôi 6×4×4 cắt bậc góc Trên-Phải (rộng 4, cao 2). Rãnh dọc chạy suốt theo trục Z ở chính giữa phần đế (X tâm = 4, rộng 2, đáy tại y = 1 tức cắt từ đỉnh xuống 3 ô).',
    projectionRelations: [
      'Hình chiếu đứng: Thấy trực tiếp dáng chữ L và hốc rãnh lõm xuống mặt đế.',
      'Hình chiếu bằng: Thấy 3 phân vùng rõ rệt (vai trái và hai gờ đế hai bên rãnh).',
      'Hình chiếu cạnh: Thành vai trái cao 4 che khuất rãnh đế nên đáy rãnh (y = 1) biểu diễn bằng nét đứt mảnh.',
    ],
  },
  {
    id: 'ex-3',
    number: 3,
    title: 'Khối bậc thang có lỗ trụ xuyên đứng',
    difficulty: 'Khá',
    summary:
      'Phân biệt lỗ trụ tròn qua đường tâm và hình chiếu tròn, kết hợp với khối bậc thang.',
    target: {
      base: { w: 6, h: 4, d: 4 },
      features: [
        {
          id: 't3-step',
          type: 'step_cut',
          enabled: true,
          label: 'Cắt bậc trên-phải',
          corner: 'top-right',
          width: 2,
          height: 2,
        },
        {
          id: 't3-cyl',
          type: 'hole_cyl',
          enabled: true,
          label: 'Lỗ trụ tròn xuyên đứng',
          axis: 'y',
          uCenter: 2,
          vCenter: 2,
          radius: 1,
        },
      ],
    },
    hints: [
      {
        title: 'Bước 1: Đọc bậc thang trên Hình chiếu đứng',
        explanation:
          'Phần cao bên trái rộng 4 ô (cao 4), phần bậc thấp bên phải rộng 2 ô (cao 2). Đây là thao tác cắt bậc góc Trên-Phải với rộng = 2, cao = 2.',
        highlights: [
          { view: 'front', u0: 4, v0: 2, u1: 6, v1: 4, caption: 'Cắt bậc rộng 2, cao 2' },
        ],
      },
      {
        title: 'Bước 2: Nhận diện lỗ trụ tròn từ Hình chiếu bằng',
        explanation:
          'Trên Hình chiếu bằng có một đường tròn tâm (X = 2, Z = 2) bán kính R = 1 kèm hai đường tâm vuông góc. Dóng lên Hình chiếu đứng và Hình chiếu cạnh thấy hai nét đứt song song + đường trục thẳng đứng xuyên từ đỉnh xuống đáy.',
        highlights: [
          { view: 'top', u0: 1, v0: 1, u1: 3, v1: 3, caption: 'Đường tròn R = 1, tâm (2, 2)' },
          { view: 'front', u0: 1, v0: 0, u1: 3, v1: 4, caption: 'Nét đứt thành lỗ trụ xuyên Y' },
        ],
      },
    ],
    completionExplanation:
      'Nhờ kết hợp Hình chiếu bằng (thấy hình tròn + 2 đường tâm) với Hình chiếu đứng và cạnh (thấy nét đứt + trục đứng), ta khẳng định đây là lỗ trụ tròn xuyên thẳng đứng theo trục Y chứ không phải lỗ vuông.',
    projectionRelations: [
      'Hình chiếu bằng: Biểu diễn hình thật của lỗ trụ bằng đường tròn nét liền đậm.',
      'Hình chiếu đứng & Hình chiếu cạnh: Mỗi hình chiếu có 2 nét đứt mảnh song song cách nhau 2R = 2 và 1 đường tâm ở giữa.',
    ],
  },
  {
    id: 'ex-4',
    number: 4,
    title: 'Rãnh bậc kết hợp lỗ khoét ngang',
    difficulty: 'Khá',
    summary:
      'Đọc đồng thời các nét khuất ở cả Hình chiếu đứng và Hình chiếu cạnh do rãnh ngang và lỗ khoét trước-sau tạo nên.',
    target: {
      base: { w: 6, h: 4, d: 4 },
      features: [
        {
          id: 't4-slot',
          type: 'slot',
          enabled: true,
          label: 'Rãnh bậc ngang phía trên',
          axis: 'x',
          face: 'top',
          center: 2,
          width: 2,
          depth: 1,
        },
        {
          id: 't4-hole',
          type: 'hole_rect',
          enabled: true,
          label: 'Lỗ vuông xuyên trước-sau',
          axis: 'z',
          uCenter: 3,
          vCenter: 1.5,
          uSize: 2,
          vSize: 1,
        },
      ],
    },
    hints: [
      {
        title: 'Bước 1: Đọc rãnh ngang phía trên',
        explanation:
          'Hình chiếu đứng có nét đứt ngang tại y = 3, còn Hình chiếu cạnh cho thấy rõ rãnh chữ U rộng 2, sâu 1 ở chính giữa đỉnh (Z = 2).',
        highlights: [
          { view: 'front', u0: 0, v0: 2.8, u1: 6, v1: 3.2, caption: 'Nét khuất rãnh ngang trên HCĐ' },
          { view: 'left', u0: 1, v0: 3, u1: 3, v1: 4, caption: 'Mặt cắt rãnh ngang trên HCC' },
        ],
      },
      {
        title: 'Bước 2: Đọc lỗ khoét ngang xuyên trước-sau',
        explanation:
          'Ở chính giữa Hình chiếu đứng (X từ 2→4, Y từ 1→2) có hình chữ nhật nét liền đậm — tức là nhìn xuyên qua theo trục Z. Dóng sang Hình chiếu cạnh và Hình chiếu bằng đều thấy cặp nét đứt mảnh của thành lỗ.',
        highlights: [
          { view: 'front', u0: 2, v0: 1, u1: 4, v1: 2, caption: 'Lỗ chữ nhật 2 × 1 xuyên Z' },
          { view: 'left', u0: 0, v0: 1, u1: 4, v1: 2, caption: 'Nét khuất lỗ trên HCC' },
        ],
      },
    ],
    completionExplanation:
      'Vật thể gồm rãnh ngang (trục X) ở mặt trên và lỗ chữ nhật xuyên trước-sau (trục Z) ở thân dưới. Vì hai hướng cắt vuông góc nhau, mỗi hình chiếu đều chứa một phần nét thấy và một phần nét khuất tương ứng.',
    projectionRelations: [
      'Hình chiếu đứng: Lỗ xuyên Z hiện bằng nét liền đậm; rãnh ngang X hiện bằng nét đứt mảnh.',
      'Hình chiếu cạnh: Rãnh ngang X hiện bằng nét liền đậm; lỗ xuyên Z hiện bằng 2 nét đứt mảnh.',
      'Hình chiếu bằng: Hai dải rãnh là nét liền đậm; thành lỗ xuyên Z là hai nét đứt mảnh.',
    ],
  },
  {
    id: 'ex-5',
    number: 5,
    title: 'Khối có mặt vát nghiêng và rãnh khoét',
    difficulty: 'Nâng cao',
    summary:
      'Đọc mặt phẳng nghiêng (hình chiếu biến dạng trên Hình chiếu bằng và cạnh) kết hợp rãnh khoét cục bộ ở phần đỉnh cao.',
    target: {
      base: { w: 6, h: 4, d: 4 },
      features: [
        {
          id: 't5-chamfer',
          type: 'chamfer',
          enabled: true,
          label: 'Mặt vát nghiêng trên-phải',
          edge: 'top-right',
          run: 3,
          drop: 3,
        },
        {
          id: 't5-slot',
          type: 'slot',
          enabled: true,
          label: 'Rãnh ngang phần đỉnh trái',
          axis: 'x',
          face: 'top',
          center: 2,
          width: 2,
          depth: 1,
          spanStart: 0,
          spanEnd: 3,
        },
      ],
    },
    hints: [
      {
        title: 'Bước 1: Xác định mặt vát nghiêng bên phải',
        explanation:
          'Trên Hình chiếu đứng, cạnh trên vát chéo từ điểm (X=3, Y=4) xuống (X=6, Y=1) — tức vát cạnh Trên-Phải với độ rộng ngang = 3 và chiều cao vát = 3.',
        highlights: [
          { view: 'front', u0: 3, v0: 1, u1: 6, v1: 4, caption: 'Đoạn xiên của mặt vát nghiêng' },
          { view: 'left', u0: 0, v0: 1, u1: 4, v1: 4, caption: 'Hình chiếu cạnh của mặt nghiêng' },
        ],
      },
      {
        title: 'Bước 2: Đọc rãnh khoét giới hạn ở nửa bên trái',
        explanation:
          'Rãnh ngang tại Z tâm = 2 (rộng 2, sâu 1) chỉ chạy ở phần đỉnh phẳng bên trái (X từ 0 đến 3) chứ không xuyên sang phần vát bên phải. Hãy quan sát nét đứt dừng lại đúng tại X = 3 trên Hình chiếu đứng!',
        highlights: [
          { view: 'front', u0: 0, v0: 2.8, u1: 3, v1: 3.2, caption: 'Nét đứt dừng đúng tại mép vát X=3' },
          { view: 'top', u0: 0, v0: 1, u1: 3, v1: 3, caption: 'Rãnh chỉ nằm ở X: 0 → 3' },
        ],
      },
    ],
    completionExplanation:
      'Mặt vát nghiêng trên-phải tạo đường xiên trên Hình chiếu đứng và biến thành hình chữ nhật thu hẹp trên cả Hình chiếu bằng (X: 3→6) lẫn Hình chiếu cạnh (Y: 1→4). Rãnh ngang ở phần đỉnh trái giao đúng vào đỉnh của mặt vát tại X = 3.',
    projectionRelations: [
      'Hình chiếu đứng: Đường chéo nối (3, 4) → (6, 1) thể hiện độ dốc thật của mặt nghiêng.',
      'Hình chiếu bằng: Mặt vát xuất hiện như một hình chữ nhật từ X = 3 đến X = 6.',
      'Hình chiếu cạnh: Thấy rãnh chữ U ở đỉnh (Y: 3→4) và đường ngang chân mặt vát tại Y = 1.',
    ],
  },
  {
    id: 'ex-6',
    number: 6,
    title: 'Khối rãnh chữ T, bậc kép và lỗ khoét ngang',
    difficulty: 'Nâng cao',
    summary:
      'Bài tổng hợp đòi hỏi đối chiếu chặt chẽ cả 3 hình chiếu để dựng đồng thời rãnh chữ T, hai bậc vai và lỗ trụ ngang.',
    target: {
      base: { w: 6, h: 4, d: 4 },
      features: [
        {
          id: 't6-step-l',
          type: 'step_cut',
          enabled: true,
          label: 'Bậc cắt vai trái',
          corner: 'top-left',
          width: 1,
          height: 1,
        },
        {
          id: 't6-step-r',
          type: 'step_cut',
          enabled: true,
          label: 'Bậc cắt vai phải',
          corner: 'top-right',
          width: 1,
          height: 1,
        },
        {
          id: 't6-tslot',
          type: 't_slot',
          enabled: true,
          label: 'Rãnh chữ T giữa đỉnh',
          axis: 'z',
          center: 3,
          neckWidth: 1,
          neckDepth: 1,
          headWidth: 2,
          headDepth: 1,
        },
        {
          id: 't6-hole',
          type: 'hole_cyl',
          enabled: true,
          label: 'Lỗ trụ tròn ngang trục X',
          axis: 'x',
          uCenter: 2,
          vCenter: 1,
          radius: 0.5,
        },
      ],
    },
    hints: [
      {
        title: 'Bước 1: Đọc bậc kép hai bên vai và rãnh chữ T ở giữa',
        explanation:
          'Trên Hình chiếu đứng, hai mép ngoài (X: 0→1 và X: 5→6) bị cắt thấp xuống 1 ô (còn cao 3). Ở chính giữa (tâm X = 3) có biên dạng chữ T ngược: cổ rộng 1, sâu 1; phần bụng rộng 2, sâu thêm 1 (đến Y = 2).',
        highlights: [
          { view: 'front', u0: 2, v0: 2, u1: 4, v1: 4, caption: 'Biên dạng rãnh chữ T' },
          { view: 'top', u0: 2, v0: 0, u1: 4, v1: 4, caption: 'Cổ nét liền, bụng nét đứt' },
        ],
      },
      {
        title: 'Bước 2: Phát hiện lỗ trụ tròn xuyên ngang theo trục X',
        explanation:
          'Nhìn sang Hình chiếu cạnh: ở vùng dưới (Z = 2, Y = 1) có một đường tròn nhỏ R = 0.5 kèm đường tâm chéo! Dóng sang Hình chiếu đứng và Hình chiếu bằng đều thấy cặp nét đứt ngang + đường trục xuyên suốt chiều rộng X.',
        highlights: [
          { view: 'left', u0: 1.5, v0: 0.5, u1: 2.5, v1: 1.5, caption: 'Lỗ trụ R = 0.5 tâm (Z=2, Y=1)' },
          { view: 'front', u0: 0, v0: 0.5, u1: 6, v1: 1.5, caption: 'Nét khuất lỗ xuyên trục X' },
        ],
      },
    ],
    completionExplanation:
      'Tuyệt vời! Bạn đã tổng hợp thành công cả 3 hình chiếu: Hình chiếu đứng cho thấy biên dạng rãnh chữ T và hai bậc vai; Hình chiếu bằng phân biệt bề rộng cổ (nét liền) và bụng rãnh T (nét đứt); Hình chiếu cạnh xác nhận lỗ trụ tròn nhỏ R = 0.5 xuyên suốt theo trục X.',
    projectionRelations: [
      'Hình chiếu đứng: Biên dạng thật của rãnh chữ T, bậc vai kép và nét đứt của lỗ trụ ngang.',
      'Hình chiếu bằng: Nét liền của cổ rãnh T (rộng 1), nét đứt của bụng rãnh T (rộng 2) và nét đứt lỗ ngang.',
      'Hình chiếu cạnh: Đường tròn nét liền R = 0.5 của lỗ trụ ngang, cùng các nét đứt nằm ngang của rãnh T và bậc vai.',
    ],
  },
];
