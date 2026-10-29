export const initialData = {
  agent: {
    id: "agent-001",
    name: "Savdo Agenti",
    role: "Savdo Agenti",
    company: "Hilol Kolbasalari",
    phone: "+998 90 123-45-67",
    avatar: "👨‍💼",
    status: "Online",
    territory: "Toshkent shahar hududi",
    planDaily: 15000000,
    planMonthly: 450000000,
    achievedDaily: 0,
    achievedMonthly: 280000000,
    cashCollectedDaily: 0,
    completedVisitsDaily: 0,
    totalVisitsDaily: 0,
    dailyPercent: 0,
    monthlyPercent: 62,
  },

  companies: [
    { id: "comp-01", name: "Hilol Kolbasalari", industry: "Oziq-ovqat ishlab chiqarish", city: "Toshkent", phone: "+998 71 200-55-44" },
    { id: "comp-02", name: "Baraka Savdo", industry: "Distribyutsiya va Savdo", city: "Toshkent", phone: "+998 71 123-00-11" },
    { id: "comp-03", name: "Najot Trade", industry: "Distribyutsiya va Savdo", city: "Samarqand", phone: "+998 66 200-11-22" },
    { id: "comp-04", name: "Global Food", industry: "Oziq-ovqat", city: "Toshkent", phone: "+998 71 300-44-55" },
    { id: "comp-05", name: "Saodat Savdo", industry: "Chakana Savdo", city: "Namangan", phone: "+998 69 200-33-44" },
    { id: "comp-06", name: "Premium Meat", industry: "Go'sht mahsulotlari", city: "Toshkent", phone: "+998 71 400-22-33" },
    { id: "comp-07", name: "Anhor Distribusiya", industry: "Distribyutsiya", city: "Toshkent", phone: "+998 71 500-66-77" },
    { id: "comp-08", name: "Hamkor Savdo", industry: "Ulgurji Savdo", city: "Fergana", phone: "+998 73 200-88-99" },
  ],

  categories: [
    { id: "cat-all", name: "Barchasi", icon: "🛒" },
    { id: "cat-kol", name: "Kolbasalar", icon: "🌭" },
    { id: "cat-sos", name: "Sosiskalar", icon: "🥩" },
    { id: "cat-vetch", name: "Vetchina", icon: "🥓" },
    { id: "cat-pashtет", name: "Pashtет", icon: "🫙" },
    { id: "cat-other", name: "Boshqa", icon: "📦" },
  ],

  products: [
    { id: "prod-01", sku: "HK-001", barcode: "4870000100011", name: "Kolbasa Doktorskaya 500g", category: "Kolbasalar", categoryId: "cat-kol", price: 45000, unit: "dona", stock: 500, minStock: 50, isPopular: true },
    { id: "prod-02", sku: "HK-002", barcode: "4870000100022", name: "Kolbasa Lyubitelskaya 500g", category: "Kolbasalar", categoryId: "cat-kol", price: 42000, unit: "dona", stock: 380, minStock: 50, isPopular: true },
    { id: "prod-03", sku: "HK-003", barcode: "4870000100033", name: "Sosiska Molochnaya 400g", category: "Sosiskalar", categoryId: "cat-sos", price: 38000, unit: "dona", stock: 650, minStock: 100, isPopular: true },
    { id: "prod-04", sku: "HK-004", barcode: "4870000100044", name: "Sosiska Slivochnaya 400g", category: "Sosiskalar", categoryId: "cat-sos", price: 40000, unit: "dona", stock: 420, minStock: 100, isPopular: false },
    { id: "prod-05", sku: "HK-005", barcode: "4870000100055", name: "Vetchina Klassik 300g", category: "Vetchina", categoryId: "cat-vetch", price: 55000, unit: "dona", stock: 200, minStock: 30, isPopular: true },
    { id: "prod-06", sku: "HK-006", barcode: "4870000100066", name: "Pashtет Pechenochniy 200g", category: "Pashtет", categoryId: "cat-pashtет", price: 22000, unit: "dona", stock: 300, minStock: 50, isPopular: false },
    { id: "prod-07", sku: "HK-007", barcode: "4870000100077", name: "Kolbasa Servelat 300g", category: "Kolbasalar", categoryId: "cat-kol", price: 68000, unit: "dona", stock: 150, minStock: 30, isPopular: true },
    { id: "prod-08", sku: "HK-008", barcode: "4870000100088", name: "Sosiska Frankfurt 500g", category: "Sosiskalar", categoryId: "cat-sos", price: 52000, unit: "dona", stock: 280, minStock: 50, isPopular: false },
  ],

  outlets: [
    {
      id: "out-01", name: "Supermarket Makro Yunusobod", type: "A-Kategoriya (Supermarket)",
      contactPerson: "Aziz Karimov", phone: "+998 90 111-22-33",
      address: "Yunusobod tumani, 7-mavze, 15-uy", landmark: "Metro yaqinida",
      debt: 2500000, creditLimit: 50000000, status: "planned",
      lastVisit: "Hali tashrif buyurilmagan", routeOrder: 1, todayOrderTotal: 0,
      coords: { lat: 41.3405, lng: 69.3010 }, photo: "🏬"
    },
    {
      id: "out-02", name: "Do'kon Baxt Chilonzor", type: "B-Kategoriya (Do'kon)",
      contactPerson: "Malika Yusupova", phone: "+998 90 222-33-44",
      address: "Chilonzor tumani, 9-mavze, 22-uy", landmark: "Chilonzor metro",
      debt: 1200000, creditLimit: 20000000, status: "planned",
      lastVisit: "Hali tashrif buyurilmagan", routeOrder: 2, todayOrderTotal: 0,
      coords: { lat: 41.2854, lng: 69.2043 }, photo: "🏪"
    },
    {
      id: "out-03", name: "Minimarket Oltin Yashnobod", type: "B-Kategoriya (Do'kon)",
      contactPerson: "Bobur Toshmatov", phone: "+998 90 333-44-55",
      address: "Yashnobod tumani, Mustakillik ko'ch, 5-uy", landmark: "Bozor yaqinida",
      debt: 0, creditLimit: 15000000, status: "planned",
      lastVisit: "Hali tashrif buyurilmagan", routeOrder: 3, todayOrderTotal: 0,
      coords: { lat: 41.3150, lng: 69.3200 }, photo: "🏪"
    },
    {
      id: "out-04", name: "Kiosk Sarvar Mirzo Ulugbek", type: "C-Kategoriya (Kiosk)",
      contactPerson: "Sarvar Mirzayev", phone: "+998 90 444-55-66",
      address: "Mirzo Ulugbek tumani, 14-mavze", landmark: "Avtobus bekati",
      debt: 800000, creditLimit: 8000000, status: "planned",
      lastVisit: "Hali tashrif buyurilmagan", routeOrder: 4, todayOrderTotal: 0,
      coords: { lat: 41.3300, lng: 69.2800 }, photo: "🏪"
    },
    {
      id: "out-05", name: "Supermarket Korzinka Sergeli", type: "A-Kategoriya (Supermarket)",
      contactPerson: "Dilnoza Hasanova", phone: "+998 90 555-66-77",
      address: "Sergeli tumani, Yangi hayot ko'ch, 8-uy", landmark: "Markaziy maydon",
      debt: 5600000, creditLimit: 80000000, status: "planned",
      lastVisit: "Hali tashrif buyurilmagan", routeOrder: 5, todayOrderTotal: 0,
      coords: { lat: 41.2300, lng: 69.2500 }, photo: "🏬"
    },
  ],

  orders: [],
  payments: [],
  visits: [],
  users: [],
  sessions: [],
  loginRequests: [],
}
