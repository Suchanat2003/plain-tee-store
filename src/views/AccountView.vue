<template>
  <div class="container" style="max-width: 600px; margin: 40px auto; padding: 0 20px;">
    
    <!-- 🟢 1. กรณีที่เข้าสู่ระบบแล้ว: แสดงประวัติคำสั่งซื้อและการติดตามพัสดุ -->
    <div v-if="store.isAuthenticated" class="card" style="padding: 24px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #0f172a; font-size: 1.25rem;">บัญชีของฉัน & ประวัติคำสั่งซื้อ</h2>
        <button @click="store.logout()" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
          ออกจากระบบ
        </button>
      </div>

      <div style="margin-bottom: 16px; font-size: 0.9rem; color: #475569;">
        ยินดีต้อนรับ, <strong>{{ store.currentUser?.name || store.currentUser?.email }}</strong>
      </div>

      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 16px 0;" />

      <!-- ตัวเลือกจำนวนต่อหน้า (Items per page) -->
      <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; font-size: 1rem; color: #1e293b;">รายการคำสั่งซื้อ</h3>
        <div style="font-size: 0.85rem; color: #64748b;">
          แสดงต่อหน้า:
          <select :value="limit" @change="handleLimitChange" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
          </select>
        </div>
      </div>

      <!-- รายการออเดอร์ -->
      <div v-if="store.orders && store.orders.length > 0">
        <div v-for="order in store.orders" :key="order.id || order._id" style="border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 12px; background: #fafafa;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong>หมายเลข: #{{ order.id || order._id }}</strong>
            <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; background: #e0f2fe; color: #0369a1; font-weight: 600;">
              {{ order.status || 'pending' }}
            </span>
          </div>

          <div style="font-size: 0.9rem; color: #475569; margin-bottom: 8px;">
            ยอดรวมทั้งสิ้น: <strong style="color: #0f172a;">฿{{ order.totalPrice || order.total || 0 }}</strong>
          </div>

          <!-- 🚚 ส่วนติดตามพัสดุ (แสดงเมื่อมีเลขพัสดุแล้ว) -->
          <div v-if="order.trackingNumber" style="margin-top: 10px; padding: 10px; background: #ffffff; border-radius: 6px; border: 1px dashed #cbd5e1;">
            <div style="font-size: 0.85rem; color: #334155;">
              🚚 <strong>ขนส่ง:</strong> {{ order.courier || 'Flash Express' }}
            </div>
            <div style="font-size: 0.85rem; color: #334155; margin-top: 2px;">
              📦 <strong>เลขพัสดุ:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">{{ order.trackingNumber }}</code>
            </div>
            
            <a 
              :href="getTrackingUrl(order.courier, order.trackingNumber)" 
              target="_blank" 
              style="display: inline-block; margin-top: 8px; padding: 6px 12px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 0.8rem; font-weight: 500;"
            >
              🔗 กดติดตามพัสดุที่นี่
            </a>
          </div>

          <div v-else style="margin-top: 8px; font-size: 0.8rem; color: #94a3b8; font-style: italic;">
            ⏳ กำลังจัดเตรียมสินค้า (ยังไม่มีเลขพัสดุ)
          </div>
        </div>

        <!-- 📌 ปุ่มควบคุม Pagination -->
        <div style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #64748b;">
          <div>
            {{ firstItem }} - {{ lastItem }} จาก {{ store.pagination?.totalItems || store.orders.length }} รายการ
          </div>
          <div style="display: flex; gap: 8px;">
            <button 
              :disabled="page <= 1" 
              @click="page--"
              style="padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; cursor: pointer; background: white;"
            >
              Previous
            </button>
            <button 
              :disabled="page >= (store.pagination?.totalPages || 1)" 
              @click="page++"
              style="padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; cursor: pointer; background: white;"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div v-else style="text-align: center; padding: 30px; color: #94a3b8; font-size: 0.9rem;">
        ยังไม่มีประวัติการสั่งซื้อ
      </div>
    </div>

    <!-- 🔴 2. กรณีที่ยังไม่ล็อกอิน: แสดงฟอร์ม เข้าสู่ระบบ / สมัครสมาชิก -->
    <div v-else class="card" style="padding: 30px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <h2 style="text-align: center; margin-top: 0; margin-bottom: 24px; color: #0f172a;">
        {{ isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก' }}
      </h2>

      <form @submit.prevent="handleSubmit">
        <div v-if="!isLogin" class="form-group" style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 600; margin-bottom: 6px; color: #475569; font-size: 0.9rem;">ชื่อ-นามสกุล</label>
          <input type="text" v-model="form.name" required placeholder="เช่น สมใจ ใจดี" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box;">
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 600; margin-bottom: 6px; color: #475569; font-size: 0.9rem;">อีเมล</label>
          <input type="email" v-model="form.email" required placeholder="name@example.com" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box;">
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 600; margin-bottom: 6px; color: #475569; font-size: 0.9rem;">รหัสผ่าน</label>
          <input type="password" v-model="form.password" required placeholder="••••••••" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box;">
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 600; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem;">
          {{ isLogin ? 'เข้าสู่ระบบ' : 'ยืนยันลงทะเบียน' }}
        </button>
      </form>

      <div style="text-align: center; margin-top: 20px;">
        <a href="#" @click.prevent="isLogin = !isLogin" style="color: #2563eb; text-decoration: none; font-size: 0.88rem;">
          {{ isLogin ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' }}
        </a>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()
const router = useRouter()

const isLogin = ref(true)
const form = reactive({
  name: '',
  email: '',
  password: ''
})

// 📌 Pagination State
const page = ref(1)
const limit = ref(5)

// 📌 บังคับส่ง admin: false เพื่อให้ยิงไปที่ /api/orders เสมอสำหรับฝั่งลูกค้า
watch([page, limit, () => store.isAuthenticated], () => {
  if (store.isAuthenticated) {
    store.fetchOrders({ page: page.value, limit: limit.value, admin: false })
  }
}, { immediate: true })

// 📌 คำนวณช่วงรายการที่จะแสดง
const firstItem = computed(() => {
  const total = store.pagination?.totalItems || 0
  if (total === 0) return 0
  return (page.value - 1) * limit.value + 1
})

const lastItem = computed(() => {
  const total = store.pagination?.totalItems || 0
  return Math.min(page.value * limit.value, total)
})

const handleLimitChange = (event) => {
  limit.value = Number(event.target.value)
  page.value = 1
}

// 📌 Helper สร้างลิงก์เช็กพัสดุ
const getTrackingUrl = (courier, trackingNumber) => {
  if (!trackingNumber) return '#'
  const courierMap = {
    'Flash Express': `https://www.flashexpress.co.th/tracking/?se=${trackingNumber}`,
    'Kerry Express': `https://th.kex-express.com/th/track/?q=${trackingNumber}`,
    'J&T Express': `https://www.jtexpress.co.th/index/query/gzquery.html?bills=${trackingNumber}`,
    'Postal': `https://track.thailandpost.co.th/?trackNumber=${trackingNumber}`
  }
  return courierMap[courier] || `https://www.google.com/search?q=เช็กพัสดุ+${trackingNumber}`
}

const handleSubmit = async () => {
  if (isLogin.value) {
    const res = await store.login(form.email, form.password)
    if (res.success) {
      if (res.role === 'admin') {
        router.push('/admin')
      } else {
        // 📌 บังคับยิงเส้น /api/orders สำหรับลูกค้า
        store.fetchOrders({ page: 1, limit: limit.value, admin: false })
      }
    }
  } else {
    const res = await store.register(form)
    if (res.success) {
      isLogin.value = true
    }
  }
}
</script>