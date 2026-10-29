# SD Agent (Sales Doctor 2.0) — To'liq Clone

O'zbekistondagi savdo agentlari va distribyutsiya kompaniyalari uchun mo'ljallangan **Sales Doctor (SD Agent)** tizimining to'liq full-stack (Backend + Frontend) kloni.

---

## 🚀 Ishga Tushirish

Loyiha papkasida bitta buyruq bilan Backend va Frontend bir vaqtda ishga tushadi:

```bash
npm run dev
```

* **Frontend (React 19 + Vite):** `http://localhost:5173`
* **Backend (Node.js + Express API):** `http://localhost:5000`

---

## 🌟 Funksiyalar va Modullar

1. **📊 Bosh Sahifa (Dashboard):**
   * Agent ma'lumotlari va faol statusi (Online)
   * Bugungi savdo tushumi va kunlik reja foizi
   * Qabul qilingan naqd pullar (inkassatsiya)
   * Tashrif qilingan savdo nuqtalari soni
   * Do'konlarning umumiy qarzdorligi
   * Tezkor amallar va so'nggi buyurtmalar ro'yxati

2. **📍 Savdo Nuqtalari & Marshrut (Outlets):**
   * Ro'yxat ko'rinishi va **🗺️ Interaktiv GPS Xarita** (Toshkent xaritasidagi nuqtalar)
   * Do'konga kirishda **Check-in** qayd etish
   * Yangi savdo nuqtasi qo'shish modali (manzil, kontakt, kredit limiti)
   * Do'kondan to'g'ridan-to'g'ri buyurtma olish yoki kassaga o'tish

3. **🛒 Yangi Buyurtma Olish (Order Create):**
   * Do'konni tanlash va kredit limitini ko'rish
   * Mahsulotlar katalogi (Ichimliklar, Shirinliklar, Sut, Baqqollik, Choy...)
   * **📷 Shtrix-kod skaner (Kamera simulyatsiyasi va tezkor namunalar)**
   * Blok va dona bo'yicha miqdorni oshirish/kamaytirish
   * Savatcha, chegirma kiritish, to'lov turini tanlash
   * **Elektron chek (kvitansiya) shakllantirish va chop etish (Print)**

4. **📜 Buyurtmalar Tarixi (Orders):**
   * Barcha olingan buyurtmalar arxivi
   * Qidiruv va batafsil kvitansiyani ko'rish

5. **💵 Inkassatsiya & Kassa (Payments):**
   * Qarzlar monitoringi va kassa tushumi
   * Do'kondan qarzni so'ndirish uchun naqd pul/terminal qabul qilish
   * Kvitansiya raqami va to'lovlar tarixi

6. **📦 Markaziy Ombor (Warehouse):**
   * Mahsulotlar qoldig'i (dona va blokda)
   * Umumiy ombor tovar qiymati (so'mda)
   * Kam qolgan tovarlar haqida qizil ogohlantirish (Alert)

7. **📈 Hisobotlar & Tahlil (Reports):**
   * Oylik reja va progress grafigi
   * Eng ko'p sotilgan tovarlar (Top-5)
   * To'lov turlari taqsimoti
   * **Excel / CSV formatida hisobotni yuklab olish**

8. **⚙️ Sozlamalar & Sinxronizatsiya (Settings):**
   * Server holati (Online yashil belgi)
   * Ma'lumotlarni server bilan bir zumda sinxronlash
   * Interfeys tili va agent profili
   * Ovozli bildirishnomalar (Web Audio API orqali kassa va buyurtma tasdiqlash ovozi)

---

## 📁 Texnologiyalar
* **Frontend:** React 19, Vite, React Router 7, React Icons, Context API
* **Backend:** Node.js, Express.js, CORS, JSON file database (`server/db.json`)

---

## 🔐 Kirish tizimi: administrator tasdig'i

Hech kim o'zi kira olmaydi. Jarayon:

1. Foydalanuvchi login va parolni kiritadi (yoki ro'yxatdan o'tadi, kompaniya nomini yozganda ro'yxat o'zi chiqadi).
2. Parol to'g'ri bo'lsa, **sizga so'rov boradi** (admin panelda, ovoz bilan; Telegram yoqilgan bo'lsa telefoningizga ham).
3. Foydalanuvchi "Ruxsat kutilmoqda" oynasida turadi.
4. Siz **Ruxsat berish** bosasiz → foydalanuvchi o'zi tizimga kiradi. **Rad etish** bosasiz → kira olmaydi.

Server tomonida ham himoya bor: ruxsatsiz hech qanday `/api/...` (buyurtma, mahsulot, do'kon va h.k.) ishlamaydi, brauzerdagi ma'lumotni qo'lda o'zgartirib kirib bo'lmaydi.

### Admin panel
* Dev rejimda: `http://localhost:5173/admin` (build qilingan bo'lsa: `http://localhost:5000/admin`)
* **Admin kaliti** server ishga tushganda terminalda ko'rsatiladi (`ADMIN KALITI`) va `server/admin.json` faylida saqlanadi. O'zingiz belgilash uchun: `ADMIN_KEY` muhit o'zgaruvchisi.
* Panelda: kutayotgan so'rovlar, tizimdagi foydalanuvchilar (chiqarib yuborish), barcha foydalanuvchilar (bloklash), kompaniyalar, so'rovlar tarixi.

### Sozlamalar (ixtiyoriy, muhit o'zgaruvchilari)
| O'zgaruvchi | Ma'nosi | Standart |
|---|---|---|
| `ADMIN_KEY` | Admin paneli kaliti | avtomatik yaratiladi |
| `SESSION_HOURS` | Ruxsat necha soat amal qiladi | `24` |
| `REQUEST_MINUTES` | So'rov necha daqiqa kutadi | `10` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Telegramga xabar + tugmalar | o'chiq |

### Telegram orqali ruxsat berish (ixtiyoriy)
1. Telegramda **@BotFather** orqali yangi bot yarating va tokenini oling.
2. O'sha botga `/start` yozing.
3. Brauzerda `https://api.telegram.org/bot<TOKEN>/getUpdates` ni oching va `"chat":{"id": ...}` raqamini oling.
4. Serverni shunday ishga tushiring (Windows PowerShell):
   ```powershell
   $env:TELEGRAM_BOT_TOKEN="123456:ABC..."; $env:TELEGRAM_CHAT_ID="123456789"; npm run dev
   ```
Har bir so'rov telefoningizga **✅ Ruxsat berish / ❌ Rad etish** tugmalari bilan keladi. Faqat sizning chatingizdagi bosishlar qabul qilinadi. Server Telegramga o'zi ulanadi, shuning uchun port ochish shart emas.

### Ishga tushirish (bitta port bilan)
```bash
npm run build     # frontendni yig'ish
npm run server    # http://localhost:5000  (ilova + admin panel + API)
```

### Xavfsizlik bo'yicha eslatma
* Parollar xeshlanib (scrypt) saqlanadi. Eski ochiq parollar birinchi ishga tushishda avtomatik xeshlanadi (parollar o'sha-o'sha ishlaydi).
* Ro'yxatdan o'tgan foydalanuvchi har doim "Savdo Agenti" bo'ladi; rolni o'zi tanlay olmaydi.
* 5 ta noto'g'ri parol / 10 ta noto'g'ri admin kalit urinishidan keyin vaqtincha bloklanadi.
* Standart hisoblar (`admin / admin123`, `agent1 / 123456` va h.k.) `server/db.json` da bor. Haqiqiy ishlatishdan oldin ularning parolini almashtiring yoki panelda bloklang.
