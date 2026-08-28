import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const API_BASE = 'https://clothing-store-icuz.onrender.com/api'

// 🛠️ Helper function สำหรับจัดการ API Request
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }

  const response = await fetch(`${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`, {
    ...options,
    headers
  })

  if (!response.ok) {
    let errorMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorData.error || errorMessage
    } catch {
      const text = await response.text()
      if (text) errorMessage = text
    }
    const err = new Error(errorMessage)
    err.status = response.status
    throw err
  }

  try {
    return await response.json()
  } catch {
    return null
  }
}

function getErrorMessage(error, defaultMsg = 'เกิดข้อผิดพลาด') {
  return error?.message || defaultMsg
}

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-ก-๙]/g, '')
}

export const useAppStore = defineStore('app', () => {
  const token = ref(localStorage.getItem('token') || null)
  const guestCart = ref(readStorage('cart', []))
  const cart = ref([])
  const currentUser = ref(readStorage('currentUser', null))
  const products = ref([])
  const categories = ref([])
  const selectedCategory = ref('all')
  const orders = ref(readStorage('store_orders', []))

  // 📌 1. เพิ่ม State Pagination สำหรับ Orders
  const pagination = ref({
    page: 1,
    limit: 5,
    totalItems: 0,
    totalPages: 0
  })

  const toastMessage = ref('')
  const toastType = ref('success')
  const isToastVisible = ref(false)
  const isAuthRestored = ref(false)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => Boolean(token.value && currentUser.value))
  const isAdmin = computed(() => currentUser.value?.role === 'admin' || currentUser.value?.isAdmin === true)
  const cartTotal = computed(() => cart.value.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0))
  const cartCount = computed(() => cart.value.reduce((sum, item) => sum + Number(item.quantity || 1), 0))
  const filteredProducts = computed(() => {
    if (selectedCategory.value === 'all' || selectedCategory.value === 'ทั้งหมด') return products.value
    return products.value.filter(product => product.categoryId === selectedCategory.value || product.category === selectedCategory.value)
  })

  function showNotification(message, type = 'success') {
    toastMessage.value = message; toastType.value = type; isToastVisible.value = true
    window.setTimeout(() => { isToastVisible.value = false }, 3000)
  }

  // 🛍️ ดึงรายการสินค้า
  async function fetchProducts() {
    try { 
      const res = await apiRequest('/products/')
      products.value = res?.products || (Array.isArray(res) ? res : []) 
    } catch (error) { 
      console.warn('Fetch products fallback:', error)
      products.value = readStorage('store_products', [])
    }
  }

  // 🏷️ ดึงหมวดหมู่สินค้า
  async function fetchCategories() {
    try { 
      const res = await apiRequest('/categories/')
      categories.value = res?.categories || (Array.isArray(res) ? res : []) 
    } catch (error) { 
      console.warn('Fetch categories fallback:', error)
    }
  }

  async function addProduct(product) {
    try { 
      await apiRequest('/products/', { method: 'POST', body: JSON.stringify(product) })
      await fetchProducts()
      showNotification('เพิ่มสินค้าเรียบร้อยแล้ว') 
    } catch (error) { 
      showNotification(getErrorMessage(error, 'เพิ่มสินค้าไม่สำเร็จ'), 'error')
      throw error 
    }
  }

// 🛠️ แก้ไขฟังก์ชัน updateProduct ใน appStore.js
async function updateProduct(idOrProduct, payload) {
  try {
    let productId = idOrProduct
    let bodyData = payload

    if (typeof idOrProduct === 'object' && idOrProduct !== null) {
      productId = idOrProduct.id || idOrProduct._id
      bodyData = payload || idOrProduct
    }

    if (!productId) {
      throw new Error('ไม่พบ Product ID สำหรับแก้ไขสินค้า')
    }

    // 1. ยิง API แก้ไขไปยัง Backend
    const updatedRes = await apiRequest(`/products/${productId}`, { 
      method: 'PUT', 
      body: JSON.stringify(bodyData) 
    })

    // 2. อัปเดตข้อมูลใน State เฉพาะชิ้นที่ถูกแก้ไขโดยตรง (ไม่ต้องดึงใหม่ทั้งหมด)
    const index = products.value.findIndex(p => (p.id || p._id) === productId)
    if (index !== -1) {
      const updatedItem = updatedRes?.product || updatedRes || bodyData
      products.value[index] = {
        ...products.value[index],
        ...updatedItem,
        id: productId,
        _id: productId
      }
    }

    showNotification('อัปเดตสินค้าเรียบร้อยแล้ว') 
  } catch (error) { 
    showNotification(getErrorMessage(error, 'อัปเดตสินค้าไม่สำเร็จ'), 'error')
    throw error 
  }
}

  async function deleteProduct(id) {
    try { 
      await apiRequest(`/products/${id}`, { method: 'DELETE' })
      await fetchProducts()
      showNotification('ลบสินค้าเรียบร้อยแล้ว') 
    } catch (error) { 
      showNotification(getErrorMessage(error, 'ลบสินค้าไม่สำเร็จ'), 'error') 
    }
  }

  async function addCategory(name) {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('กรุณาระบุชื่อหมวดหมู่')
    try {
      await apiRequest('/categories/', { method: 'POST', body: JSON.stringify({ name: trimmed, slug: slugify(trimmed) }) })
      await fetchCategories()
      showNotification('เพิ่มหมวดหมู่เรียบร้อยแล้ว')
    } catch (error) { 
      showNotification(getErrorMessage(error, 'เพิ่มหมวดหมู่ไม่สำเร็จ'), 'error')
      throw error 
    }
  }

  async function deleteCategory(category) {
    try {
      const catId = category.id || category._id
      await apiRequest(`/categories/${catId}`, { method: 'DELETE' })
      if (selectedCategory.value === catId) selectedCategory.value = 'all'
      await fetchCategories()
      showNotification('ลบหมวดหมู่เรียบร้อยแล้ว')
    } catch (error) { 
      showNotification(getErrorMessage(error, 'ลบหมวดหมู่ไม่สำเร็จ'), 'error') 
    }
  }

  function normalizeCartItem(item) {
    const product = products.value.find(candidate => (candidate.id || candidate._id) === item.productId)
    const variant = product?.variants?.find(candidate => (candidate.id || candidate._id) === item.variantId)
    
    return {
      ...item,
      id: item.productId,
      _id: item.productId,
      product,
      name: item.name || product?.name || 'เสื้อยืด',
      price: Number(item.price || product?.price || 0),
      image: item.image || product?.images?.[0] || '',
      color: item.color || variant?.color || 'Free Size',
      size: item.size || variant?.size || 'Default'
    }
  }

  async function loadCart() {
    if (!isAuthenticated.value) { 
      cart.value = [...guestCart.value].map(normalizeCartItem)
      return 
    }
    try { 
      const response = await apiRequest('/cart/')
      const remoteItems = response?.cart?.items || response?.items || []
      cart.value = remoteItems.map(normalizeCartItem).filter(Boolean)
    } catch (error) { 
      if (error.status === 401) clearAuth()
      cart.value = [...guestCart.value].map(normalizeCartItem)
    }
  }

  async function addToCart(product, variant = product.variants?.[0]) {
    const pId = product.id || product._id
    const vId = variant?.id || variant?._id || 'default'

    const item = { 
      productId: pId, 
      variantId: vId, 
      quantity: 1, 
      price: Number(product.price), 
      name: product.name, 
      image: product.image || product.images?.[0], 
      color: variant?.color || 'Default', 
      size: variant?.size || 'Free Size' 
    }

    if (!isAuthenticated.value) {
      const existing = guestCart.value.find(c => c.productId === item.productId && c.variantId === item.variantId)
      if (existing) existing.quantity += 1; else guestCart.value.push(item)
      persistGuestCart()
      cart.value = [...guestCart.value].map(normalizeCartItem)
      showNotification('เพิ่มสินค้าลงตะกร้าเรียบร้อยแล้ว')
      return
    }

    try { 
      await apiRequest('/cart/items', { method: 'POST', body: JSON.stringify({ productId: pId, variantId: vId, quantity: 1 }) })
      await loadCart()
      showNotification('เพิ่มสินค้าลงตะกร้าเรียบร้อยแล้ว') 
    } catch (error) { 
      const message = error.status === 409 ? 'สินค้าตัวเลือกนี้หมดหรือมีจำนวนไม่เพียงพอ' : getErrorMessage(error, 'เพิ่มสินค้าลงตะกร้าไม่สำเร็จ')
      showNotification(message, 'error')
      if (error.status === 401) clearAuth()
    }
  }

  async function updateCartItem(item, quantity) {
    if (quantity < 1) return removeCartItem(item)
    if (!isAuthenticated.value) { 
      const target = guestCart.value.find(c => c.productId === item.productId)
      if (target) target.quantity = quantity
      persistGuestCart()
      cart.value = [...guestCart.value].map(normalizeCartItem)
      return 
    }
    try { 
      await apiRequest(`/cart/items/${item.productId}/${item.variantId}`, { method: 'PUT', body: JSON.stringify({ quantity }) })
      await loadCart() 
    } catch (error) { 
      showNotification(getErrorMessage(error, 'อัปเดตตะกร้าไม่สำเร็จ'), 'error')
      if (error.status === 401) clearAuth()
    }
  }

  async function removeCartItem(item) {
    if (!isAuthenticated.value) {
      guestCart.value = guestCart.value.filter(c => !(c.productId === item.productId && c.variantId === item.variantId))
      persistGuestCart()
      cart.value = [...guestCart.value].map(normalizeCartItem)
      return
    }
    try { 
      await apiRequest(`/cart/items/${item.productId}/${item.variantId}`, { method: 'DELETE' })
      await loadCart() 
    } catch (error) { 
      showNotification(getErrorMessage(error, 'ลบสินค้าออกจากตะกร้าไม่สำเร็จ'), 'error')
      if (error.status === 401) clearAuth()
    }
  }

  async function clearCart() {
    if (isAuthenticated.value) {
      for (const item of [...cart.value]) {
        try { await apiRequest(`/cart/items/${item.productId}/${item.variantId}`, { method: 'DELETE' }) } catch {}
      }
      await loadCart()
    }
    guestCart.value = []; persistGuestCart(); cart.value = []
  }

  async function placeOrder(customerInfo) {
    return checkout(customerInfo)
  }

  // 📜 สั่งซื้อสินค้า
  async function checkout(customerInfo) {
    const localOrder = {
      id: 'ORD-' + Date.now(),
      customer: customerInfo || currentUser.value,
      items: [...cart.value],
      totalPrice: cartTotal.value,
      status: 'pending',
      trackingNumber: '',
      courier: '',
      createdAt: new Date().toISOString()
    }

    try { 
      const response = await apiRequest('/orders/', { method: 'POST' })
      showNotification('สั่งซื้อสินค้าเรียบร้อยแล้ว')
      await loadCart()
      await fetchOrders()
      return response?.order 
    } catch (error) { 
      orders.value = [localOrder, ...orders.value]
      localStorage.setItem('store_orders', JSON.stringify(orders.value))
      showNotification('สั่งซื้อสินค้าเรียบร้อยแล้ว!')
      clearCart()
      return localOrder
    }
  }

  // 📥 📌 2. ดึงรายการสั่งซื้อ แบบต่อ Query String (?page=...&limit=...)
  async function fetchOrders({ page = 1, limit = 5, admin = false } = {}) {
    const basePath = (admin || isAdmin.value) ? '/admin/orders' : '/orders'
    const endpoint = `${basePath}?page=${page}&limit=${limit}`

    try { 
      const response = await apiRequest(endpoint)
      const fetchedOrders = response?.orders || (Array.isArray(response) ? response : [])
      
      orders.value = fetchedOrders
      localStorage.setItem('store_orders', JSON.stringify(fetchedOrders))

      // อัปเดตข้อมูล Pagination
      if (response?.pagination) {
        pagination.value = response.pagination
      } else {
        pagination.value = {
          page,
          limit,
          totalItems: fetchedOrders.length,
          totalPages: Math.ceil(fetchedOrders.length / limit) || 1
        }
      }
      return orders.value 
    } catch (error) { 
      console.warn('Fetch orders fallback:', error)
      return orders.value 
    }
  }

  // 🔄 อัปเดตสถานะคำสั่งซื้อ
  async function updateOrderStatus(orderId, status) {
    try {
      await apiRequest(`/admin/orders/${orderId}/status`, { 
        method: 'PUT', 
        body: JSON.stringify({ status }) 
      })
      const index = orders.value.findIndex(order => (order.id || order._id) === orderId)
      if (index !== -1) orders.value[index].status = status
      localStorage.setItem('store_orders', JSON.stringify(orders.value))
      showNotification('อัปเดตสถานะคำสั่งซื้อแล้ว')
    } catch (error) { 
      const index = orders.value.findIndex(order => (order.id || order._id) === orderId)
      if (index !== -1) orders.value[index].status = status
      localStorage.setItem('store_orders', JSON.stringify(orders.value))
      showNotification('อัปเดตสถานะคำสั่งซื้อแล้ว')
    }
  }

  // 🚚 📌 3. เพิ่มฟังก์ชันอัปเดตข้อมูลติดตามพัสดุ (Admin Update Tracking)
  async function updateTracking(orderId, { trackingNumber, courier }) {
    try {
      await apiRequest(`/admin/orders/${orderId}/tracking`, {
        method: 'PUT',
        body: JSON.stringify({ trackingNumber, courier })
      })
      
      const index = orders.value.findIndex(order => (order.id || order._id) === orderId)
      if (index !== -1) {
        orders.value[index].trackingNumber = trackingNumber
        orders.value[index].courier = courier
        orders.value[index].status = 'shipped' // เปลี่ยนสถานะเป็นจัดส่งแล้วอัตโนมัติ
      }
      localStorage.setItem('store_orders', JSON.stringify(orders.value))
      showNotification('อัปเดตเลขพัสดุเรียบร้อยแล้ว')
    } catch (error) {
      // Fallback
      const index = orders.value.findIndex(order => (order.id || order._id) === orderId)
      if (index !== -1) {
        orders.value[index].trackingNumber = trackingNumber
        orders.value[index].courier = courier
        orders.value[index].status = 'shipped'
      }
      localStorage.setItem('store_orders', JSON.stringify(orders.value))
      showNotification('อัปเดตเลขพัสดุเรียบร้อยแล้ว')
    }
  }

  async function register(userData) {
    try { 
      await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ name: userData.name, email: userData.email, password: userData.password || userData.pass }) })
      showNotification('สมัครสมาชิกสำเร็จ')
      return { success: true } 
    } catch (error) { 
      showNotification(getErrorMessage(error, 'สมัครสมาชิกไม่สำเร็จ'), 'error')
      return { success: false, message: getErrorMessage(error) } 
    }
  }

  async function login(email, password) {
    try {
      const guestItems = [...guestCart.value]
      const data = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      token.value = data.token
      localStorage.setItem('token', token.value)
      currentUser.value = { ...(data.user || {}), email }
      
      await restoreSession()
      await syncGuestCart(guestItems)
      showNotification('เข้าสู่ระบบสำเร็จ')
      return { success: true, role: currentUser.value.role }
    } catch (error) { 
      clearAuth()
      showNotification(getErrorMessage(error, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'), 'error')
      return { success: false, message: getErrorMessage(error) } 
    }
  }

  async function logout() {
    try { if (token.value) await apiRequest('/auth/logout', { method: 'POST' }) } catch {}
    clearAuth()
    showNotification('ออกจากระบบเรียบร้อยแล้ว')
  }

  async function restoreSession() {
    if (!token.value) { isAuthRestored.value = true; await loadCart(); return false }
    try {
      const me = await apiRequest('/auth/me')
      currentUser.value = { ...(currentUser.value || {}), id: me.userId || currentUser.value?.id, role: me.role }
      localStorage.setItem('currentUser', JSON.stringify(currentUser.value))
      isAuthRestored.value = true
      await loadCart()
      return true
    } catch { 
      clearAuth()
      return false 
    }
  }

  async function syncGuestCart(items = guestCart.value) {
    if (!isAuthenticated.value || !items.length) return
    const failed = []
    for (const item of items) {
      try { 
        await apiRequest('/cart/items', { method: 'POST', body: JSON.stringify({ productId: item.productId, variantId: item.variantId, quantity: item.quantity }) }) 
      } catch (error) { 
        failed.push(item) 
      }
    }
    guestCart.value = failed
    persistGuestCart()
    await loadCart()
  }

  function clearAuth() { 
    token.value = null
    currentUser.value = null
    isAuthRestored.value = true
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    cart.value = [...guestCart.value].map(normalizeCartItem) 
  }
  
  function persistGuestCart() { localStorage.setItem('cart', JSON.stringify(guestCart.value)) }

  async function initialize() {
    isLoading.value = true
    await Promise.all([fetchProducts(), fetchCategories()])
    await restoreSession()
    isLoading.value = false
  }

  return {
    token, cart, guestCart, currentUser, isAdmin, isAuthenticated, isAuthRestored, isLoading,
    products, categories, selectedCategory, filteredProducts, orders, pagination, cartTotal, cartCount,
    toastMessage, toastType, isToastVisible, showNotification, fetchProducts, fetchCategories,
    addProduct, updateProduct, deleteProduct, addCategory, deleteCategory, addToCart, loadCart,
    updateCartItem, removeCartItem, clearCart, checkout, placeOrder, fetchOrders, updateOrderStatus,
    updateTracking, register, login, logout, restoreSession, syncGuestCart, initialize
  }
})