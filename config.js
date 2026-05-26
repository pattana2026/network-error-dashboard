// ============================================================
//  Network Error Dashboard — Configuration
//  แก้ไขที่นี่จุดเดียวเมื่อต้องการเปลี่ยน mode
// ============================================================

const DASHBOARD_CONFIG = {

  // "file"  → อ่าน timestamp จาก Excel ที่ upload
  // "api"   → ดึงข้อมูล real-time จาก API endpoint
  mode: "file",

  // --- API settings (ใช้เมื่อ mode: "api") ---
  api: {
    url: "http://localhost:5000/api/sites",   // เปลี่ยนเป็น URL จริง
    intervalSeconds: 60,                       // refresh ทุกกี่วินาที
    headers: {
      // "Authorization": "Bearer YOUR_TOKEN"
    }
  },

  // --- Network Error threshold ---
  networkErrorMinutes: 30,   // ขาดการเชื่อมต่อเกินกี่นาที = Network Error

  // --- Closeday Error ---
  // ไฟล์นี้ = สถานีที่มีปัญหาปิดวันแล้ว (pre-filtered)
  // ระบบจะตัดสถานีที่ปิดวันล่าสุด = วันปัจจุบันออกอัตโนมัติ
  closedayFilterToday: true,

  // --- Dashboard display ---
  title: "Network Error Dashboard",
  subtitle: "AMS · ATG · ic05 Monitor",
  rowsPerPage: 10,
};
