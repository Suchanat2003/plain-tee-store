<template>
  <div class="container" style="max-width: 800px; margin: 40px auto; padding: 0 20px;">
    <h2>ตะกร้าสินค้า</h2>

    <div v-if="store.cart.length === 0" class="card" style="text-align: center; padding: 40px;">
      <p>ยังไม่มีสินค้าในตะกร้า</p>
      <router-link to="/" class="btn btn-primary" style="display: inline-block; margin-top: 10px; text-decoration: none;">ไปเลือกซื้อสินค้า</router-link>
    </div>

    <div v-else>
      <div v-for="(item, index) in store.cart" :key="item.id || item._id || index" class="card cart-item-card">
        <div class="cart-item-left">
          <!-- ดึงรูปภาพสินค้าจริง -->
          <img 
            :src="item.images?.[0] || item.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500'" 
            alt="thumb" 
            class="cart-img" 
          />
          <div>
            <h3 style="margin: 0; font-size: 1.05rem;">{{ item.name }}</h3>
            <!-- ดึงไซส์และสีจริง -->
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.85rem;">
              ไซส์: {{ item.size || item.variants?.[0]?.size || 'M' }} | สี: {{ item.color || item.variants?.[0]?.color || 'เขียวมิ้น' }}
            </p>
          </div>
        </div>

        <div class="cart-item-right">
          <!-- ปุ่ม เพิ่ม - ลด จำนวนสินค้า -->
          <div class="quantity-control">
            <button class="qty-btn" @click="updateQuantity(index, -1)">-</button>
            <span class="qty-num">{{ item.quantity || 1 }}</span>
            <button class="qty-btn" @click="updateQuantity(index, 1)">+</button>
          </div>

          <!-- ราคารวมตามจำนวน -->
          <p class="cart-price">฿{{ ((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2) }}</p>

          <!-- ปุ่มลบรายการ -->
          <button class="btn-remove" @click="removeItem(index)">ลบ</button>
        </div>
      </div>

      <div class="card" style="margin-top: 20px; background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0; font-size: 1.2rem;">ราคารวมทั้งหมด: <span style="color: #2563eb;">฿{{ Number(store.cartTotal).toFixed(2) }}</span></h3>
        
        <div style="margin-top: 18px; display: flex; gap: 12px;">
          <button class="btn btn-primary" @click="checkout">สั่งซื้อสินค้า</button>
          <button class="btn btn-danger" @click="store.clearCart()">ล้างตะกร้า</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/appStore'
import { useRouter } from 'vue-router'

const store = useAppStore()
const router = useRouter()

// ปรับจำนวนสินค้าในตะกร้า
const updateQuantity = (index, change) => {
  const item = store.cart[index]
  if (!item) return
  
  const currentQty = item.quantity || 1
  if (currentQty + change <= 0) {
    removeItem(index)
  } else {
    item.quantity = currentQty + change
    localStorage.setItem('cart', JSON.stringify(store.cart))
  }
}

// ลบรายการสินค้าเฉพาะชิ้น
const removeItem = (index) => {
  store.cart.splice(index, 1)
  localStorage.setItem('cart', JSON.stringify(store.cart))
  store.showNotification('ลบสินค้าออกจากตะกร้าแล้ว')
}

const checkout = async () => {
  if (!store.currentUser) {
    store.showNotification('กรุณาเข้าสู่ระบบหรือสมัครสมาชิกก่อนทำการสั่งซื้อ', 'error')
    router.push('/account')
    return
  }

  // บันทึกคำสั่งซื้อ
  await store.placeOrder({
    name: store.currentUser.name || 'ลูกค้าสมาชิก',
    email: store.currentUser.email,
    phone: store.currentUser.phone || '08X-XXX-XXXX'
  })

  router.push('/')
}
</script>

<style scoped>
.cart-item-card { 
  margin-bottom: 16px; 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 16px 20px; 
  background: white; 
  border-radius: 12px; 
  border: 1px solid #e2e8f0; 
}
.cart-item-left { display: flex; align-items: center; gap: 16px; }
.cart-img { width: 64px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid #f1f5f9; }

.cart-item-right { display: flex; align-items: center; gap: 20px; }

/* ปุ่มปรับจำนวน */
.quantity-control {
  display: flex;
  align-items: center;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  overflow: hidden;
  background: #ffffff;
}
.qty-btn {
  background: #f8fafc;
  border: none;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-weight: bold;
  color: #475569;
  transition: background 0.2s;
}
.qty-btn:hover { background: #e2e8f0; }
.qty-num {
  padding: 0 10px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

.cart-price { font-weight: 700; font-size: 1.05rem; color: #0f172a; margin: 0; min-width: 80px; text-align: right; }
.btn-remove {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
}
.btn-remove:hover { text-decoration: underline; }

.btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 0.95rem; }
.btn-primary { background: #2563eb; color: white; }
.btn-primary:hover { background: #1d4ed8; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
</style>