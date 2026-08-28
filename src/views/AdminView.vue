<template>
  <div class="admin-wrapper">
    <header class="admin-header">
      <div class="admin-header-content">
        <div class="admin-brand">
          <span class="shield-icon">🛡️</span>
          <div>
            <h1>Admin Control Panel</h1>
            <p class="admin-subtitle">ระบบจัดการสต็อก หมวดหมู่ และรายการสั่งซื้อ Plain Tee Store</p>
          </div>
        </div>
        <div class="header-actions">
          <router-link to="/" class="btn btn-outline-light">← กลับไปหน้าร้านค้า</router-link>
          <button @click="handleLogout" class="btn btn-danger-sm">ออกจากระบบ</button>
        </div>
      </div>
    </header>

    <main class="admin-container">
      <!-- 📌 ปุ่มสลับโหมด แสดงจำนวนออเดอร์ตามจริง -->
      <div class="tab-menu mb-4">
        <button class="tab-btn" :class="{ active: activeTab === 'products' }" @click="activeTab = 'products'">📦 จัดการสินค้า & หมวดหมู่</button>
        <button class="tab-btn" :class="{ active: activeTab === 'orders' }" @click="activeTab = 'orders'">
          📑 รายการสั่งซื้อ (Orders) [{{ store.pagination?.totalItems || store.orders.length }}]
        </button>
      </div>

      <!-- ---------------- TAB 1: จัดการสินค้า & หมวดหมู่ ---------------- -->
      <div v-if="activeTab === 'products'" class="admin-grid">
        <div class="left-col">
          <!-- CRUD Category -->
          <section class="card admin-card mb-4">
            <h2>🏷️ จัดการหมวดหมู่ (Category)</h2>
            <div class="admin-form">
              <div class="form-group row-group">
                <input type="text" v-model="newCatName" placeholder="ชื่อหมวดหมู่ใหม่..." />
                <button type="button" class="btn btn-dark" @click="handleAddCategory">เพิ่ม</button>
              </div>
              <div class="cat-tags">
                <span v-for="cat in store.categories" :key="cat.id || cat._id || cat" class="cat-chip">
                  {{ cat.name || cat }}
                  <button v-if="(cat.name || cat) !== 'ทั้งหมด'" @click="store.deleteCategory(cat)" class="cat-del">×</button>
                </span>
              </div>
            </div>
          </section>

          <!-- ฟอร์ม เพิ่ม / แก้ไข สินค้า -->
          <section class="card admin-card">
            <h2>{{ isEditing ? '✏️ แก้ไขสินค้า' : '➕ เพิ่มสินค้าใหม่' }}</h2>
            <div class="admin-form">
              <div class="form-group">
                <label>ชื่อสินค้า</label>
                <input type="text" v-model="form.name" placeholder="เช่น Plain Tee - Oversized" />
              </div>

              <div class="form-group">
                <label>หมวดหมู่สินค้า (Category ID)</label>
                <select v-model="form.categoryId" class="form-select">
                  <option value="" disabled>-- เลือกหมวดหมู่ --</option>
                  <option 
                    v-for="cat in store.categories.filter(c => (c.name || c) !== 'ทั้งหมด')" 
                    :key="cat.id || cat._id || cat" 
                    :value="cat.id || cat._id || cat"
                  >
                    {{ cat.name || cat }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>รายละเอียดสินค้า</label>
                <input type="text" v-model="form.description" placeholder="รายละเอียดสินค้า..." />
              </div>

              <div class="form-group">
                <label>URL รูปภาพสินค้า</label>
                <input type="text" v-model="form.image" placeholder="https://example.com/image.jpg" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>ราคา (บาท)</label>
                  <input type="number" v-model="form.price" placeholder="290" />
                </div>
                <div class="form-group">
                  <label>จำนวนสต็อก (Stock)</label>
                  <input type="number" v-model="form.stock" placeholder="10" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>สี (Color)</label>
                  <input type="text" v-model="form.color" placeholder="Default" />
                </div>
                <div class="form-group">
                  <label>ไซส์ (Size)</label>
                  <select v-model="form.size" class="form-select">
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="Free Size">Free Size</option>
                  </select>
                </div>
              </div>

              <button type="button" class="btn btn-dark btn-block" @click="handleSubmitProduct">
                {{ isEditing ? 'อัปเดตข้อมูลสินค้า' : 'บันทึกสินค้าลงระบบ' }}
              </button>
              <button v-if="isEditing" type="button" class="btn btn-outline btn-block" @click="resetForm" style="margin-top: 8px;">
                ยกเลิกการแก้ไข
              </button>
            </div>
          </section>
        </div>

        <!-- ตารางสินค้า -->
        <section class="card admin-card">
          <div class="section-title-row">
            <h2>📦 รายการสินค้าในระบบ</h2>
            <button class="btn btn-sm btn-outline" @click="store.fetchProducts">🔄 รีเฟรช</button>
          </div>

          <div v-if="store.products.length === 0" class="state-msg">ยังไม่มีรายการสินค้า</div>
          <div v-else class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>รูปภาพ</th>
                  <th>ชื่อสินค้า</th>
                  <th>หมวดหมู่</th>
                  <th>ไซส์</th>
                  <th>ราคา</th>
                  <th style="text-align: center;">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in store.products" :key="item.id || item._id || index">
                  <td>
                    <img v-if="item.image || (item.images && item.images[0])" :src="item.image || item.images[0]" alt="preview" class="admin-img-thumb" />
                    <div v-else class="admin-img-placeholder">ไม่มีรูป</div>
                  </td>
                  <td class="font-bold">{{ item.name }}</td>
                  <td><span class="tag cat-tag">{{ item.category || item.categoryId || 'ทั่วไป' }}</span></td>
                  <td><span class="tag">{{ item.size || item.variants?.[0]?.size || '-' }}</span></td>
                  <td class="price-text">฿{{ item.price }}</td>
                  <td style="text-align: center; gap: 6px; display: flex; justify-content: center;">
                    <button type="button" class="btn-edit" @click="startEdit(item)">แก้ไข</button>
                    <button type="button" class="btn-delete" @click="store.deleteProduct(item.id || item._id)">ลบ</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- ---------------- TAB 2: รายการสั่งซื้อจริงจากลูกค้า ---------------- -->
      <div v-else-if="activeTab === 'orders'" class="card admin-card orders-card">
        <div class="orders-header">
          <div class="orders-title-box">
            <div class="title-icon">📑</div>
            <div>
              <h2>Order Management</h2>
              <p class="subtitle-text">รายการสั่งซื้อจริงจากลูกค้า</p>
            </div>
          </div>
        </div>

        <!-- Search & Action Bar -->
        <div class="action-bar">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" v-model="searchQuery" placeholder="ค้นหา Order ID หรือชื่อลูกค้า..." />
          </div>
        </div>

        <!-- Table -->
        <div v-if="paginatedOrders.length === 0" class="state-msg">ยังไม่มีรายการสั่งซื้อเข้ามา</div>
        <div v-else class="clean-table-wrapper">
          <table class="clean-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>DATE</th>
                <th>CUSTOMER</th>
                <th>ITEMS</th>
                <th>TOTAL</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ord in paginatedOrders" :key="ord.id || ord._id">
                <td><span class="id-badge">{{ (ord.id || ord._id || '').slice(-4) }}</span></td>
                <td class="date-text">{{ ord.createdAt ? ord.createdAt.slice(0, 10) : '-' }}</td>
                <td>
                  <div class="font-bold customer-name">{{ ord.customer?.name || 'ลูกค้าทั่วไป' }}</div>
                  <div class="sub-detail">{{ ord.customer?.phone || ord.customer?.email || '-' }}</div>
                </td>
                <td>
                  <div class="items-chip-group">
                    <span v-for="(it, i) in ord.items" :key="i" class="item-chip">
                      {{ it.name || it.product?.name }} (฿{{ it.price }})
                    </span>
                  </div>
                </td>
                <td class="price-text">฿{{ ord.totalPrice || ord.total || 0 }}</td>
                <td>
                  <span class="status-pill" :class="(ord.status || 'pending').toLowerCase()">
                    {{ ord.status || 'Pending' }}
                  </span>
                </td>
                <td>
                  <select :value="ord.status || 'Pending'" @change="e => store.updateOrderStatus(ord.id || ord._id, e.target.value)" class="clean-select">
                    <option value="Pending">Pending (รอดำเนินการ)</option>
                    <option value="Processing">Processing (กำลังจัดเตรียม)</option>
                    <option value="Completed">Completed (สำเร็จ)</option>
                    <option value="Cancelled">Cancelled (ยกเลิก)</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination Footer -->
          <div class="table-footer">
            <div class="per-page">
              <span>Items per page:</span>
              <select v-model="itemsPerPage" class="footer-select">
                <option :value="5">5</option>
                <option :value="10">10</option>
                <option :value="20">20</option>
              </select>
            </div>
            <div class="pagination-info">
              {{ paginationText }}
            </div>
            <div class="pagination-controls">
              <button :disabled="currentPage === 1" @click="currentPage--" class="page-btn">‹</button>
              <button :disabled="currentPage >= maxPage" @click="currentPage++" class="page-btn">›</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()
const router = useRouter()

const activeTab = ref('products')
const newCatName = ref('')
const isEditing = ref(false)
const currentEditId = ref(null)

const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

const form = reactive({
  name: '',
  categoryId: '',
  description: '',
  image: '',
  price: '',
  color: 'Default',
  size: 'Free Size',
  stock: 10
})

const filteredOrders = computed(() => {
  if (!searchQuery.value.trim()) return store.orders
  const q = searchQuery.value.toLowerCase()
  return store.orders.filter(o => 
    (o.id || o._id || '').toLowerCase().includes(q) ||
    (o.customer?.name || '').toLowerCase().includes(q)
  )
})

const maxPage = computed(() => Math.ceil(filteredOrders.value.length / itemsPerPage.value) || 1)

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredOrders.value.slice(start, start + itemsPerPage.value)
})

const paginationText = computed(() => {
  const total = filteredOrders.value.length
  if (total === 0) return '0 - 0 of 0'
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, total)
  return `${start} – ${end} of ${total}`
})

const handleAddCategory = () => {
  if (!newCatName.value.trim()) return
  store.addCategory(newCatName.value.trim())
  newCatName.value = ''
}

const startEdit = (item) => {
  isEditing.value = true
  currentEditId.value = item.id || item._id
  form.name = item.name
  form.categoryId = item.categoryId || ''
  form.description = item.description || ''
  form.image = item.image || item.images?.[0] || ''
  form.price = item.price
  form.color = item.variants?.[0]?.color || 'Default'
  form.size = item.size || item.variants?.[0]?.size || 'Free Size'
  form.stock = item.variants?.[0]?.stock || 10
}

const resetForm = () => {
  isEditing.value = false
  currentEditId.value = null
  form.name = ''
  form.categoryId = ''
  form.description = ''
  form.image = ''
  form.price = ''
  form.color = 'Default'
  form.size = 'Free Size'
  form.stock = 10
}

const handleSubmitProduct = async () => {
  if (!form.name || !form.price) {
    alert('กรุณากรอกชื่อสินค้าและราคาให้ครบถ้วน')
    return
  }

  const productPayload = {
    categoryId: form.categoryId || store.categories[0]?.id || store.categories[0]?._id || "65c1a823e4b0a1a2b3c4d5e6",
    name: form.name,
    description: form.description || `${form.name} คุณภาพดี`,
    price: Number(form.price),
    images: [form.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500'],
    variants: [
      {
        color: form.color || "Default",
        size: form.size || "Free Size",
        stock: Number(form.stock) || 10
      }
    ]
  }

  if (isEditing.value) {
    await store.updateProduct(currentEditId.value, productPayload)
    resetForm()
  } else {
    await store.addProduct(productPayload)
    resetForm()
  }
}

const handleLogout = async () => {
  await store.logout()
  router.push('/')
}

onMounted(() => {
  store.fetchProducts()
  store.fetchCategories()
  store.fetchOrders({ page: 1, limit: 50, admin: true })
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');

.admin-wrapper {
  min-height: 100vh;
  background-color: #f8fafc;
  font-family: 'Kanit', sans-serif;
  color: #334155;
  padding-bottom: 60px;
}

.admin-header {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #ffffff;
  padding: 24px 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}
.admin-header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.admin-brand {
  display: flex;
  align-items: center;
  gap: 16px;
}
.shield-icon {
  font-size: 2rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 12px;
}
.admin-header h1 {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
}
.admin-subtitle {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 4px 0 0 0;
  font-weight: 300;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-container {
  max-width: 1200px;
  margin: 28px auto 0;
  padding: 0 24px;
}

.tab-menu {
  display: flex;
  gap: 12px;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 12px;
}
.tab-btn {
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: #f1f5f9;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  color: #64748b;
  transition: all 0.2s ease;
}
.tab-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}
.tab-btn.active {
  background: #0f172a;
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

.admin-grid {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
  align-items: start;
}
.left-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.mb-4 {
  margin-bottom: 20px;
}

.admin-card {
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}
.admin-card h2 {
  font-size: 1.1rem;
  margin-top: 0;
  margin-bottom: 18px;
  color: #0f172a;
  font-weight: 600;
}

.form-group {
  margin-bottom: 14px;
}
.row-group {
  display: flex;
  gap: 10px;
}
.row-group input {
  flex: 1;
}
.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: #475569;
  margin-bottom: 6px;
}
.form-group input, .form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.875rem;
  box-sizing: border-box;
  background-color: #f8fafc;
  transition: all 0.2s ease;
  font-family: inherit;
}
.form-group input:focus, .form-select:focus {
  outline: none;
  border-color: #2563eb;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.btn {
  font-family: inherit;
  transition: all 0.2s ease;
}
.btn-dark {
  background: #0f172a;
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}
.btn-dark:hover {
  background: #1e293b;
}
.btn-block {
  width: 100%;
  margin-top: 10px;
  cursor: pointer;
  padding: 12px;
  font-weight: 600;
  font-size: 0.9rem;
  background: #0f172a;
  color: white;
  border: none;
  border-radius: 8px;
}
.btn-block:hover {
  background: #1e293b;
}
.btn-outline {
  border: 1px solid #cbd5e1;
  background: white;
  color: #475569;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}
.btn-outline:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.btn-outline-light {
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 0.85rem;
}
.btn-outline-light:hover {
  background: rgba(255, 255, 255, 0.15);
}
.btn-danger-sm {
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
}
.btn-danger-sm:hover {
  background: #dc2626;
}

.cat-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
.cat-chip {
  background: #e2e8f0;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.8rem;
  color: #334155;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}
.cat-del {
  border: none;
  background: none;
  color: #94a3b8;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  font-size: 1rem;
}
.cat-del:hover {
  color: #ef4444;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.table-responsive {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}
.admin-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.875rem;
}
.admin-table th {
  padding: 12px 14px;
  background: #f8fafc;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
}
.admin-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: middle;
}
.admin-table tbody tr:hover {
  background-color: #f8fafc;
}
.font-bold {
  font-weight: 600;
  color: #0f172a;
}
.price-text {
  font-weight: 600;
  color: #2563eb;
}
.tag {
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.775rem;
  color: #475569;
}
.cat-tag {
  background: #e0f2fe;
  color: #0369a1;
}
.btn-edit {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.775rem;
  font-weight: 500;
  font-family: inherit;
}
.btn-edit:hover {
  background: #dbeafe;
}
.btn-delete {
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fecaca;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.775rem;
  font-weight: 500;
  font-family: inherit;
}
.btn-delete:hover {
  background: #fee2e2;
}
.state-msg {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
  font-size: 0.9rem;
}
.admin-img-thumb {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}
.admin-img-placeholder {
  width: 44px;
  height: 44px;
  background: #f1f5f9;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: #94a3b8;
}

.orders-card { background: #ffffff; border-radius: 20px; border: none; box-shadow: 0 10px 30px rgba(0, 140, 255, 0.05); padding: 32px; }
.orders-header { margin-bottom: 24px; }
.orders-title-box { display: flex; align-items: center; gap: 16px; }
.title-icon { width: 48px; height: 48px; background: #e0f2fe; color: #0284c7; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
.orders-title-box h2 { font-size: 1.35rem; color: #0f172a; margin: 0; font-weight: 700; }
.subtitle-text { font-size: 0.875rem; color: #94a3b8; margin: 2px 0 0 0; }

.action-bar { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.search-box { position: relative; flex: 1; max-width: 480px; }
.search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 0.9rem; color: #94a3b8; }
.search-box input { width: 100%; padding: 12px 16px 12px 42px; border: 1.5px solid #e2e8f0; border-radius: 14px; font-size: 0.9rem; background: #f8fafc; transition: all 0.2s; font-family: inherit; }
.search-box input:focus { border-color: #38bdf8; background: #fff; box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.15); outline: none; }

.clean-table-wrapper { border: 1px solid #f1f5f9; border-radius: 16px; overflow-x: auto; }
.clean-table { width: 100%; border-collapse: collapse; text-align: left; }
.clean-table th { padding: 16px 20px; font-size: 0.75rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9; background: #ffffff; }
.clean-table td { padding: 16px 20px; border-bottom: 1px solid #f8fafc; font-size: 0.875rem; vertical-align: middle; }
.id-badge { width: 36px; height: 36px; background: #f0f9ff; color: #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; }
.customer-name { color: #1e293b; font-weight: 600; }
.sub-detail { font-size: 0.775rem; color: #94a3b8; }
.items-chip-group { display: flex; flex-wrap: wrap; gap: 4px; }
.item-chip { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-size: 0.775rem; display: inline-block; }

.status-pill { padding: 6px 14px; border-radius: 20px; font-size: 0.775rem; font-weight: 700; display: inline-block; text-align: center; }
.status-pill.pending { background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }
.status-pill.processing { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
.status-pill.completed { background: #f0f9ff; color: #0284c7; border: 1px solid #e0f2fe; }
.status-pill.cancelled { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }

.clean-select { padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.8rem; background: #ffffff; color: #475569; font-family: inherit; }

.table-footer { display: flex; justify-content: flex-end; align-items: center; gap: 24px; padding: 16px 20px; font-size: 0.85rem; color: #64748b; border-top: 1px solid #f1f5f9; background: #ffffff; }
.footer-select { padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 8px; margin-left: 8px; font-family: inherit; }
.page-btn { border: 1px solid #e2e8f0; background: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 992px) {
  .admin-grid {
    grid-template-columns: 1fr;
  }
}
</style>