# ⚡ Network Error Dashboard

> Dashboard สำหรับติดตาม Network Error และ Closeday Error ของระบบ AMS-ATG  
> Created by Pattana Chancheam

---

## 📋 คุณสมบัติหลัก

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| 📡 Network Error | แสดงสถานีที่ AMS ขาดการเชื่อมต่อกับ ATG |
| 📋 Closeday Error | แสดงสถานีที่ไม่มีข้อมูล ic05 ปิดวัน |
| 🚨 วิกฤติ >1 วัน | ไฮไลต์สถานีที่ค้างเกินเกณฑ์ พร้อมกระพริบเตือน |
| 🔍 Analysis Tab | วิเคราะห์สาเหตุ / Root Cause / Daily Trend |
| 💾 localStorage | จำข้อมูลข้ามวัน ไม่ต้อง Upload ซ้ำ |
| ✅ Mark Resolved | บันทึก Note การแก้ไขพร้อมประวัติ |
| ⬇ Export CSV | Export รายการ Error และประวัติ Resolve |
| 🔄 API Ready | รองรับ mode: "api" เปลี่ยนได้ใน config.js |

---

## 🗂️ โครงสร้างไฟล์

```
Network Error Dashboard/
├── index.html       ← Dashboard หลัก (เปิดด้วย Browser)
├── config.js        ← ตั้งค่า mode / API URL / threshold
├── atg_site.xlsx    ← ไฟล์ข้อมูลประจำวัน (ไม่ commit ขึ้น git)
└── README.md        ← ไฟล์นี้
```

---

## 🚀 วิธีใช้งาน

### เปิด Dashboard
1. เปิด `index.html` ด้วย **Chrome** หรือ **Edge**
2. ครั้งแรก: กด **Upload Excel** และเลือก `atg_site.xlsx`
3. ครั้งต่อไป: กด **OK** เมื่อ Browser ถามโหลดข้อมูลเดิม

### ตั้งค่า `config.js`
```js
const DASHBOARD_CONFIG = {
  mode: "file",              // "file" หรือ "api"
  networkErrorMinutes: 30,   // threshold Network Error (นาที)
  closedayFilterToday: true, // ตัดสถานีที่ปิดวันวันนี้ออก
  rowsPerPage: 10,
  api: {
    url: "http://localhost:5000/api/sites",
    intervalSeconds: 60,
  }
};
```

### เปลี่ยนเป็น API Mode
แก้ `config.js` บรรทัดเดียว:
```js
mode: "api",
```

---

## 📊 Logic การตรวจสอบ

```
Network Error  = ทุก Row ในไฟล์ (pre-filtered โดย AMS)
Closeday Error = Row ที่ปิดวันล่าสุด ≠ วันปัจจุบัน
วิกฤติ        = ค้างมากกว่า 1 วัน
```

---

## 🔧 Tech Stack

- **Vanilla HTML/CSS/JS** — ไม่ต้องติดตั้ง dependencies
- **SheetJS (xlsx)** — อ่านไฟล์ Excel
- **localStorage** — บันทึกข้อมูลในเบราว์เซอร์
- **ไม่ต้องการ Server** — เปิดไฟล์ตรงได้เลย

---

## 📅 Changelog

| Version | วันที่ | รายการ |
|---------|--------|--------|
| v1.0 | 25/05/2026 | Initial release |

---

*Network Error Dashboard — by Pattana Chancheam*
