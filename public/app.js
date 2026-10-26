let currentCategory = 'all'; //จำว่าตอนนี้กำลังเปิดดูสินค้าหมวดหมู่อะไรอยู่
let currentProducts = []; //อาร์เรย์เก็บข้อมูลสินค้าที่ดึงมาจากฐานข้อมูลหลังบ้าน
let currentUser = null; //เก็บข้อมูลของผู้ใช้ที่กำลังล็อกอินอยู่ ถ้ายังไม่ล็อกอินจะเป็น null

// ข้อมูลไอคอนและสีพื้นหลังประจำประเภทสินค้า 
function getProductBadgeInfo(title) {
  if (title.includes('Krist') || title.includes('ตุ๊กตา')) return { icon: '🧸', bg: '#ffe8ec' };
  if (title.includes('Photocard') || title.includes('การ์ด')) return { icon: '🎴', bg: '#eef2ff' };
  if (title.includes('เสื้อ')) return { icon: '👕', bg: '#f3e8ff' };
  if (title.includes('ไฟเชียร์') || title.includes('แท่งไฟ')) return { icon: '🪄', bg: '#fffbeb' };
  if (title.includes('Standee')) return { icon: '✨', bg: '#ecfdf5' };
  if (title.includes('อัลบั้ม')) return { icon: '💿', bg: '#fef3c7' };
  if (title.includes('พวงกุญแจ')) return { icon: '🔑', bg: '#fdf2f8' };
  return { icon: '🎁', bg: '#fff0f3' };
}

document.addEventListener('DOMContentLoaded', () => {
  initAuth(); //ตรวจสอบสถานะการล็อกอิน
  loadCategories(); //ดึงหมวดหมู่สินค้า
  loadProducts(); //ดึงรายการสินค้ามาแสดงผล
  loadSeller(1); //ดึงโปรไฟล์เจ้าของร้าน

  // ตัวค้นหาและตัวกรอง
  const sInput = document.getElementById('searchInput');
  if (sInput) {
    sInput.addEventListener('input', (e) => {
      const fInput = document.getElementById('filterInput');
      if (fInput) fInput.value = e.target.value;
      loadProducts();
    });
  }

  const fInput = document.getElementById('filterInput');
  if (fInput) fInput.addEventListener('input', loadProducts);

  const condF = document.getElementById('conditionFilter');
  if (condF) condF.addEventListener('change', loadProducts);

  const delF = document.getElementById('deliveryFilter');
  if (delF) delF.addEventListener('change', loadProducts);

  const sortF = document.getElementById('sortFilter');
  if (sortF) sortF.addEventListener('change', loadProducts);
});

/* ============================================================
   1. AUTHENTICATION & ADMIN PERMISSION
   ============================================================ */
function initAuth() {
  // 🛠️ เปลี่ยนให้ดึงจากคีย์ 'boxie_user' ให้ตรงกับตอนล็อกอิน
  const saved = localStorage.getItem('boxie_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
    } catch (e) {
      currentUser = null;
    }
  } else {
    currentUser = null; 
  }
  renderAuthNav();
  loadCart();
}

function renderAuthNav() {
  const c = document.getElementById('authNavContainer');
  const btnSell = document.getElementById('btnSellTop');
  
  if (currentUser) {
    // 🛠️ เช็กสิทธิ์แอดมินจาก username 'Yibsee_25' หรือ id = 1
    const isAdmin = currentUser.username === 'Yibsee_25' || currentUser.username === 'admin' || currentUser.id === 1 || currentUser.role === 'admin';
    const roleBadge = isAdmin ? ' (เจ้าของร้าน)' : '';
    
    c.innerHTML = `
      <div class="user-pill" onclick="window.openProfileModal()" title="คลิกเพื่อจัดการโปรไฟล์" style="cursor: pointer; display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.08); padding:4px 10px; border-radius:20px;">
        <img src="${currentUser.avatar || 'images/my-avatar.png'}" alt="User" class="nav-avatar" style="width:24px; height:24px; border-radius:50%; object-fit:cover;">
        <span style="font-size:13px; color:#fff; font-weight:600;">${currentUser.display_name}${roleBadge}</span>
        <span style="font-size:11px; color:#38bdf8;">⚙️ ตั้งค่า</span>
      </div>
    `;

    if (isAdmin) {
      if (btnSell) btnSell.style.display = 'inline-block';
    } else {
      if (btnSell) btnSell.style.display = 'none';
    }
  } else {
    c.innerHTML = `<button class="btn-login-top" onclick="window.openAuthModal('login')">เข้าสู่ระบบ</button>`;
    if (btnSell) btnSell.style.display = 'none';
  }
}

window.openAuthModal = function(tab = 'login') {
  window.switchAuthTab(tab);
  document.getElementById('authModal').style.display = 'flex';
};

window.closeAuthModal = function() {
  document.getElementById('authModal').style.display = 'none';
};

window.switchAuthTab = function(tab) {
  const tabLogin = document.getElementById('tabLoginBtn');
  const tabReg = document.getElementById('tabRegisterBtn');
  const formLogin = document.getElementById('loginForm');
  const formReg = document.getElementById('registerForm');

  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
    formLogin.style.display = 'block';
    formReg.style.display = 'none';
  } else {
    tabLogin.classList.remove('active');
    tabReg.classList.add('active');
    formLogin.style.display = 'none';
    formReg.style.display = 'block';
  }
};

window.submitLogin = async function(e) {
  e.preventDefault();
  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();

    if (res.ok) {
      currentUser = data.user;
      localStorage.setItem('boxie_user', JSON.stringify(currentUser));
      window.location.reload(); 
    } else {
      alert('เข้าสู่ระบบไม่สำเร็จ: ' + data.error);
    }
  } catch (err) {
    console.error('Login error:', err);
  }
};

window.submitRegister = async function(e) {
  e.preventDefault();
  
  const passwordVal = document.getElementById('regPassword').value;
  
  // 🛡️ เช็กความปลอดภัยรหัสผ่านตรงนี้
  const passwordCheck = validateStrongPassword(passwordVal);
  if (!passwordCheck.isValid) {
    alert('รหัสผ่านยังไม่ปลอดภัยพอครับเฮีย:\n' + passwordCheck.errors.join('\n'));
    return; // เบรก ไม่ให้สมัครต่อ
  }

  const payload = {
    display_name: document.getElementById('regDisplayName').value.trim(),
    username: document.getElementById('regUsername').value.trim(),
    email: document.getElementById('regEmail').value.trim(),
    password: passwordVal
  };

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
      currentUser = data.user;
      localStorage.setItem('boxie_user', JSON.stringify(currentUser));
      renderAuthNav();
      window.closeAuthModal();
      loadCart();
      alert(`✨ สมัครสมาชิกสำเร็จ! ยินดีต้อนรับคุณ ${currentUser.display_name}`);
    } else {
      alert('สมัครสมาชิกไม่สำเร็จ: ' + data.error);
    }
  } catch (err) {
    console.error('Register error:', err);
  }
};

window.logoutUser = function() {
  localStorage.removeItem('boxie_user');
  currentUser = null;
  window.location.reload(); // รีเฟรชหน้าเว็บทันทีแบบเงียบๆ จบในคลิกเดียว
};

let selectedAvatarBase64 = '';

window.openProfileModal = function() {
  if (!currentUser) return;
  
  document.getElementById('profileDisplayName').value = currentUser.display_name || '';
  document.getElementById('profileBio').value = currentUser.bio || '';
  
  // 🔍 ตรวจสอบและกำหนดรูปภาพโปรไฟล์ให้ถูกต้อง
  const avatarImg = document.getElementById('profilePreviewAvatar');
  if (avatarImg) {
    avatarImg.src = currentUser.avatar && currentUser.avatar.trim() !== '' ? currentUser.avatar : 'images/my-avatar.png';
  }
  selectedAvatarBase64 = ''; // รีเซ็ตค่า

  const savedAddr = localStorage.getItem(`boxie_addr_${currentUser.id}`);
  if (savedAddr) {
    const addr = JSON.parse(savedAddr);
    document.getElementById('profileAddrName').value = addr.name || '';
    document.getElementById('profileAddrPhone').value = addr.phone || '';
    document.getElementById('profileAddrText').value = addr.address || '';
  } else {
    document.getElementById('profileAddrName').value = currentUser.display_name || '';
    document.getElementById('profileAddrPhone').value = '';
    document.getElementById('profileAddrText').value = '';
  }

  window.switchProfileTab('info');
  document.getElementById('profileModal').style.display = 'flex';
};
window.closeProfileModal = function() {
  document.getElementById('profileModal').style.display = 'none';
};

window.switchProfileTab = function(tab) {
  const infoBtn = document.getElementById('profileTabInfoBtn');
  const passBtn = document.getElementById('profileTabPassBtn');
  const infoSec = document.getElementById('profileSectionInfo');
  const passSec = document.getElementById('profileSectionPassword');

  if (tab === 'info') {
    infoBtn.style.background = '#ff334b'; infoBtn.style.color = '#fff';
    passBtn.style.background = '#2a2a38'; passBtn.style.color = '#ccc';
    infoSec.style.display = 'block';
    passSec.style.display = 'none';
  } else {
    passBtn.style.background = '#ff334b'; passBtn.style.color = '#fff';
    infoBtn.style.background = '#2a2a38'; infoBtn.style.color = '#ccc';
    passSec.style.display = 'block';
    infoSec.style.display = 'none';
  }
};

// ฟังก์ชันเปิด Modal พร้อมใส่หัวข้อและเนื้อหาที่เราต้องการ
function openPolicyModal(type) {
  const modal = document.getElementById('policyModal');
  const titleEl = document.getElementById('policyModalTitle');
  const bodyEl = document.getElementById('policyModalBody');

  if (modal) {
    if (type === 'privacy') {
      titleEl.innerText = '🔒 นโยบายความเป็นส่วนตัว';
      bodyEl.innerHTML = `
        <p><strong>1. การเก็บรวบรวมข้อมูลส่วนบุคคล:</strong> เว็บไซต์ BOXIE Store จะเก็บข้อมูลเท่าที่จำเป็น เช่น ชื่อผู้ใช้ และข้อมูลการสั่งซื้อ เพื่อใช้ในการให้บริการ</p>
        <p><strong>2. การ ใช้วัตถุประสงค์ของข้อมูล:</strong> ข้อมูลทั้งหมดจะถูกใช้เพื่อการซื้อขายของสะสมและการจัดส่งสินค้าเท่านั้น จะไม่มีการเปิดเผยข้อมูลส่วนตัวให้บุคคลภายนอกเด็ดขาด</p>
        <p><strong>3. ความปลอดภัย:</strong> เรามีระบบรักษาความปลอดภัยของฐานข้อมูลเพื่อให้มั่นใจว่าข้อมูลของสมาชิกทุกท่านถูกเก็บรักษาไว้อย่างดีที่สุด</p>
      `;
    } else if (type === 'terms') {
      titleEl.innerText = '📋 เงื่อนไขการสั่งซื้อ';
      bodyEl.innerHTML = `
        <p><strong>1. การสั่งซื้อสินค้า:</strong> สินค้าประเภทของสะสมและ Art Toy เมื่อทำการสั่งซื้อและชำระเงินแล้ว ไม่สามารถยกเลิกหรือเปลี่ยนคืนได้ในทุกกรณี</p>
        <p><strong>2. การจัดส่งสินค้า:</strong> ทางร้านจะทำการจัดส่งสินค้าตามรอบที่กำหนด (พร้อมส่ง หรือนัดรับตามตกลง)</p>
        <p><strong>3. สภาพสินค้า:</strong> รายละเอียดสภาพสินค้า (เช่น สภาพดี, มีรอยเล็กน้อย, แกะแล้ว) ได้ระบุไว้ชัดเจนในหน้าสินค้า โปรดตรวจสอบก่อนทำการสั่งซื้อ</p>
      `;
    }
    
    modal.style.display = 'flex';
  }
}

// ฟังก์ชันปิด Modal
function closePolicyModal() {
  const modal = document.getElementById('policyModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// ฟังก์ชันแปลงไฟล์รูปจากเครื่องเป็น Base64 ทันทีที่เลือก
window.previewAvatarFile = function(input) {
  // 1. ถ้าผู้ใช้กด Cancel ตอนเลือกไฟล์ ให้รีเซ็ตค่าทันที ป้องกันรูปค้าง
  if (!input.files || !input.files[0]) {
    return;
  }

  const file = input.files[0];
  
  // 2. ตรวจสอบว่าเป็นไฟล์รูปภาพจริงไหม
  if (!file.type.startsWith('image/')) {
    alert('กรุณาเลือกไฟล์รูปภาพเท่านั้นครับ!');
    input.value = ''; // เคลียร์ค่า input
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    // 3. บันทึก Base64 ของรูปที่เลือกใหม่จริงๆ เข้าตัวแปร
    selectedAvatarBase64 = e.target.result;
    
    // 4. อัปเดตภาพพรีวิวในหน้าจอทันที
    const previewImg = document.getElementById('profilePreviewAvatar');
    if (previewImg) {
      previewImg.src = selectedAvatarBase64;
    }
  };
  reader.readAsDataURL(file);
};

// บันทึกข้อมูลทั่วไป & ที่อยู่
window.saveGeneralProfile = async function() {
  if (!currentUser) return;

  const displayName = document.getElementById('profileDisplayName').value.trim();
  const bio = document.getElementById('profileBio').value.trim();
  
  // 🔍 ดึงค่า source จากรูปพรีวิวในหน้าจอ Modal โดยตรงเลย (ชัวร์ที่สุด!)
  const previewImg = document.getElementById('profilePreviewAvatar');
  const avatarToSave = previewImg ? previewImg.src : (currentUser.avatar || 'images/my-avatar.png');

  const addrName = document.getElementById('profileAddrName').value.trim();
  const addrPhone = document.getElementById('profileAddrPhone').value.trim();
  const addrText = document.getElementById('profileAddrText').value.trim();

  if (!displayName) {
    alert('กรุณากรอกชื่อที่แสดงครับ');
    return;
  }

  try {
    const res = await fetch('/api/auth/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: currentUser.id, 
        display_name: displayName, 
        bio, 
        avatar: avatarToSave 
      })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      // 1. อัปเดตข้อมูลในตัวแปรเครื่อง
      currentUser.display_name = displayName;
      currentUser.bio = bio;
      currentUser.avatar = avatarToSave;
      localStorage.setItem('boxie_user', JSON.stringify(currentUser));

      // 2. เคลียร์ค่าตัวแปรเลือกรูปทิ้ง
      window.selectedAvatarBase64 = '';

      if (addrName && addrPhone && addrText) {
        const newAddr = { name: addrName, phone: addrPhone, address: addrText };
        localStorage.setItem(`boxie_addr_${currentUser.id}`, JSON.stringify(newAddr));
      }

      // 3. อัปเดตภาพที่ปุ่มมุมขวาบนทันที
      const navAvatarImg = document.querySelector('.user-pill .nav-avatar');
      if (navAvatarImg) {
        navAvatarImg.src = avatarToSave;
      }

      renderAuthNav();
      window.closeProfileModal();
      
    } else {
      alert('บันทึกไม่สำเร็จ: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Update profile error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
  }
};

// บันทึกเปลี่ยนรหัสผ่าน (พร้อมเชื่อมฟังก์ชัน validateStrongPassword ตัวเก่งของเรา!)
window.saveNewPassword = async function() {
  if (!currentUser) return;

  const oldPassword = document.getElementById('profileOldPassword').value;
  const newPassword = document.getElementById('profileNewPassword').value;

  if (!oldPassword || !newPassword) {
    alert('กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่ให้ครบถ้วน');
    return;
  }

  // 🛡️ เช็กความปลอดภัยรหัสผ่านใหม่ด้วยฟังก์ชันมาตรฐานของเรา
  const passCheck = validateStrongPassword(newPassword);
  if (!passCheck.isValid) {
    alert('รหัสผ่านใหม่ไม่ปลอดภัยตามกำหนดครับเฮีย:\n' + passCheck.errors.join('\n'));
    return;
  }

  try {
    const res = await fetch('/api/auth/update-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, oldPassword, newPassword })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      alert('🔒 เปลี่ยนรหัสผ่านใหม่สำเร็จเรียบร้อย!');
      document.getElementById('profileOldPassword').value = '';
      document.getElementById('profileNewPassword').value = '';
      window.closeProfileModal();
    } else {
      alert('เปลี่ยนรหัสผ่านไม่สำเร็จ: ' + (data.error || 'รหัสผ่านเดิมไม่ถูกต้อง'));
    }
  } catch (err) {
    console.error('Update password error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
  }
};

// ฟังก์ชันเช็กความปลอดภัยรหัสผ่าน (ชุดเดียวจบ รองรับครบถ้วน)
function validateStrongPassword(password) {
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}\\|;:'",.<>\/?]/.test(password);

  let errors = [];

  if (!minLength) {
    errors.push("• ต้องมีความยาวอย่างน้อย 8 ตัวอักษรขึ้นไป");
  }
  if (!hasUpperCase) {
    errors.push("• ต้องมีตัวอักษรภาษาอังกฤษพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว");
  }
  if (!hasLowerCase) {
    errors.push("• ต้องมีตัวอักษรภาษาอังกฤษพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว");
  }
  if (!hasNumber) {
    errors.push("• ต้องมีตัวเลข (0-9) อย่างน้อย 1 ตัว");
  }

  let infoMessage = "";
  if (!hasSpecialChar) {
    infoMessage = "💡 เคล็ดลับ: สามารถเพิ่มอักขระพิเศษ (!@#$%^&* ฯลฯ) เพื่อเพิ่มความปลอดภัยสูงสุดได้นะครับ";
  }

  return {
    errors: errors,
    info: infoMessage,
    isValid: errors.length === 0
  };
}

/* ============================================================
   2. CATEGORIES
   ============================================================ */
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    const list = document.getElementById('categoryList');
    if (!list) return;

    const iconMap = {
      all: '▦', 
      doll: '🧸', photocard: '🎴', cloth: '👕',
      album: '💿', misc: '👜', concert: '🎟️', special: '⭐'
    };

    list.innerHTML = data.map(cat => `
      <div class="cat-item ${cat.key_name === currentCategory ? 'active' : ''}" data-cat="${cat.key_name}">
        <span class="cat-icon">${iconMap[cat.key_name] || '📦'}</span>
        <span class="cat-name">${cat.name}</span>
      </div>
    `).join('');

    document.querySelectorAll('.cat-item').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        currentCategory = el.dataset.cat;
        loadProducts();
      });
    });
  } catch (err) { console.error('Categories error:', err); }
}

// ============================================================
//   3. PRODUCTS & DETAILS (UI จัดระเบียบสวยงาม + ล็อกสต็อกแอดมิน + คุมจำนวนลูกค้า)
// ============================================================
async function loadProducts() {
  try {
    const q = document.getElementById('filterInput') ? document.getElementById('filterInput').value.trim() : '';
    const condition = document.getElementById('conditionFilter') ? document.getElementById('conditionFilter').value : 'all';
    const delivery = document.getElementById('deliveryFilter') ? document.getElementById('deliveryFilter').value : 'all';
    const sort = document.getElementById('sortFilter') ? document.getElementById('sortFilter').value : 'new';

    let url = `/api/products?category=${currentCategory}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (condition !== 'all') url += `&condition=${encodeURIComponent(condition)}`;
    if (delivery !== 'all') url += `&delivery=${encodeURIComponent(delivery)}`;
    if (sort) url += `&sort=${sort}`;

    const res = await fetch(url);
    currentProducts = await res.json();
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (!currentProducts.length) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#888;">ไม่พบสินค้าที่ตรงตามเงื่อนไข</div>';
      return;
    }

    grid.innerHTML = currentProducts.map(p => {
      let tagHtml = '';
      if (p.badge_label === 'ขายดี') tagHtml = '<span class="prod-tag tag-hot">★ ขายดี</span>';
      else if (p.badge_label === 'ลดราคา') tagHtml = '<span class="prod-tag tag-sale">ลดราคา</span>';
      else if (p.badge_label === 'มาใหม่') tagHtml = '<span class="prod-tag tag-new">มาใหม่</span>';

      const info = getProductBadgeInfo(p.title);
      const hasRealImg = Boolean(p.image_url && p.image_url.trim() !== '');

      const isAdmin = currentUser && (
        currentUser.username === 'Yibsee_25' || 
        currentUser.username === 'admin' || 
        currentUser.id === 1
      );

      const currentStock = p.stock !== undefined && p.stock !== null ? p.stock : 2;
      const isOutOfStock = Number(currentStock) <= 0;

      return `
        <article class="prod-card" style="display:flex; flex-direction:column; justify-content:space-between; background:#1e1e28; border:1px solid #33334d; border-radius:12px; padding:12px; overflow:hidden;">
          <div>
            <div class="prod-img-wrap" style="background:${info.bg}; border-radius:8px; position:relative; height:160px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="window.openProductDetail(${p.id})">
              ${tagHtml}
              <button class="fav-btn" onclick="event.stopPropagation(); alert('บันทึกสินค้าลงรายการโปรดแล้ว')" title="ถูกใจ" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.5); border:none; color:#fff; border-radius:50%; width:28px; height:28px; cursor:pointer;">♡</button>
              ${hasRealImg 
                ? `<img src="${p.image_url}" alt="${p.title}" class="prod-img-real" style="width:100%; height:100%; object-fit:cover; border-radius:8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                   <div class="prod-avatar-icon" style="display:none; font-size:40px;">${info.icon}</div>` 
                : `<div class="prod-avatar-icon" style="font-size:40px;">${info.icon}</div>`}
            </div>

            <div class="prod-body" style="padding-top:10px;">
              <h4 class="prod-title" onclick="window.openProductDetail(${p.id})" style="margin:0 0 6px; font-size:14px; color:#fff; cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.title}</h4>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#aaa; margin-bottom:8px;">
                <span>${p.condition_status}</span>
                <span id="stockText_${p.id}" style="font-weight:bold; color:${isOutOfStock ? '#ff334b' : '#10b981'};">
                  ${isOutOfStock ? '❌ สินค้าหมด' : `เหลือ ${currentStock} ชิ้น`}
                </span>
              </div>
              <div class="prod-seller" style="display:flex; align-items:center; gap:6px; font-size:11px; color:#888; margin-bottom:8px;">
                <img src="images/my-avatar.png" alt="Seller" style="width:16px; height:16px; border-radius:50%;">
                <span>by: ${p.seller_name ? p.seller_name : 'BOXIE Store'}</span>
              </div>
            </div>
          </div>

          <div style="border-top:1px solid #2a2a38; padding-top:8px; margin-top:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <div>
                ${p.original_price ? `<span style="text-decoration:line-through; color:#777; font-size:10px; display:block;">฿${Number(p.original_price).toLocaleString()}</span>` : ''}
                <span style="font-weight:bold; color:#ff334b; font-size:15px;">฿ ${Number(p.price).toLocaleString()}</span>
              </div>
              ${isAdmin ? `<button onclick="window.deleteProduct(${p.id})" style="background:#ff334b; color:white; border:none; border-radius:6px; padding:5px 8px; cursor:pointer; font-size:11px;" title="ลบสินค้า">🗑️</button>` : ''}
            </div>

            <!-- โหมดแอดมิน: ปุ่มปรับสต็อกพร้อมปุ่มยืนยัน (ตกลง) -->
            ${isAdmin ? `
              <div style="background:#15151c; padding:8px; border-radius:8px; border:1px dashed #444;">
                <div style="font-size:10px; color:#aaa; margin-bottom:4px; text-align:center;">⚙️ จัดการสต็อก (แอดมิน)</div>
                <div style="display:flex; justify-content:center; gap:4px; align-items:center; margin-bottom:6px;">
                  <button onclick="window.adjustAdminStock(${p.id}, -1)" style="background:#ef4444; color:#fff; border:none; width:22px; height:22px; border-radius:4px; font-weight:bold; cursor:pointer;">-</button>
                  <span id="tempStock_${p.id}" style="font-weight:bold; font-size:13px; min-width:24px; text-align:center; color:#fff;">${currentStock}</span>
                  <button onclick="window.adjustAdminStock(${p.id}, 1)" style="background:#10b981; color:#fff; border:none; width:22px; height:22px; border-radius:4px; font-weight:bold; cursor:pointer;">+</button>
                </div>
                <button onclick="window.confirmUpdateStock(${p.id})" style="width:100%; background:#3b82f6; color:#fff; border:none; border-radius:4px; padding:4px; font-size:11px; font-weight:bold; cursor:pointer;">
                  ✓ ตกลง (บันทึกสต็อก)
                </button>
              </div>
            ` : `
              <!-- โหมดลูกค้าทั่วไป: เลือกจำนวนชิ้นและปุ่มเพิ่มลงตะกร้า -->
              <div>
                ${isOutOfStock ? `
                  <button disabled style="width:100%; background:#333; color:#777; border:none; border-radius:6px; padding:7px; font-size:12px; font-weight:bold; cursor:not-allowed;">สินค้าหมด</button>
                ` : `
                  <div style="display:flex; gap:6px; align-items:center;">
                    <div style="display:flex; align-items:center; background:#15151c; padding:2px 6px; border-radius:6px; border:1px solid #333;">
                      <button onclick="window.changeBuyQty(${p.id}, -1, ${currentStock})" style="background:none; color:#fff; border:none; width:20px; height:20px; cursor:pointer; font-weight:bold;">-</button>
                      <span id="buyQty_${p.id}" style="font-size:12px; font-weight:bold; min-width:20px; text-align:center; color:#fff;">1</span>
                      <button onclick="window.changeBuyQty(${p.id}, 1, ${currentStock})" style="background:none; color:#fff; border:none; width:20px; height:20px; cursor:pointer; font-weight:bold;">+</button>
                    </div>
                    <button onclick="window.addToCartWithQuantity(${p.id})" style="flex:1; background:#ff334b; color:#fff; border:none; border-radius:6px; padding:7px; font-weight:bold; cursor:pointer; font-size:12px;">
                      🛒 ใส่ตะกร้า
                    </button>
                  </div>
                `}
              </div>
            `}
          </div>
        </article>
      `;
    }).join('');
  } catch (err) { console.error('Products error:', err); }
}

window.deleteProduct = async function(productId) {
  if (!confirm('คุณต้องการลบสินค้านี้ออกจากระบบใช่หรือไม่?')) return;

  try {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (res.ok && data.success) {
      alert('ลบสินค้าเรียบร้อยแล้วครับ');
      if (typeof loadProducts === 'function') {
        await loadProducts(); // โหลดรายการสินค้าใหม่ทันที
      }
    } else {
      alert(data.error || 'ไม่สามารถลบสินค้าได้');
    }
  } catch (err) {
    console.error('Delete product error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
  }
};

// --- ฟังก์ชันควบคุมฝั่งลูกค้า: เลือกจำนวนก่อนหยิบใส่ตะกร้า ---
window.changeBuyQty = function(productId, delta, maxStock) {
  const qtyEl = document.getElementById(`buyQty_${productId}`);
  if (!qtyEl) return;
  let current = parseInt(qtyEl.innerText) || 1;
  current += delta;
  if (current < 1) current = 1;
  if (current > maxStock) current = maxStock; // ห้ามเลือกเกินจำนวนสินค้าที่มีในคลัง
  qtyEl.innerText = current;
};

// 1. ฟังก์ชันแสดงข้อความแจ้งเตือนแบบแบนเนอร์มุมจอ (ไม่ต้องใช้ alert)
window.showToast = function(message) {
  // สร้างกล่องแจ้งเตือนถ้ายังไม่มี
  let toast = document.getElementById('customToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'customToast';
    toast.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; background: #10b981; color: #fff;
      padding: 12px 20px; border-radius: 8px; font-family: sans-serif; font-size: 13px;
      font-weight: bold; z-index: 999999; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: opacity 0.3s ease; opacity: 0; pointer-events: none;
    `;
    document.body.appendChild(toast);
  }

  toast.innerText = message;
  toast.style.opacity = '1';

  // ซ่อนข้อความอัตโนมัติหลังผ่านไป 2.5 วินาที
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 2500);
};

// 2. ฟังก์ชันกดเพิ่มสินค้าลงตะกร้าพร้อมจำนวนที่เลือก
window.addToCartWithQuantity = async function(productId) {
  const qtyEl = document.getElementById(`buyQty_${productId}`);
  const quantity = qtyEl ? parseInt(qtyEl.innerText) || 1 : 1;
  
  const userId = currentUser ? currentUser.id : 1;

  try {
    // ส่งข้อมูลจำนวน quantity ไปบันทึกที่หลังบ้านโดยตรง
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user_id: userId, 
        product_id: productId, 
        quantity: quantity 
      })
    });

    if (res.ok) {
      window.showToast(`✅ เพิ่มสินค้าลงตะกร้าจำนวน ${quantity} ชิ้นเรียบร้อย!`);
      
      // สั่งรีเฟรชตะกร้าสินค้าขวาบนทันทีเพื่อให้เลข x เปลี่ยนตาม
      if (typeof window.loadCart === 'function') {
        window.loadCart();
      } else {
        location.reload(); // ถ้าไม่มีฟังก์ชันโหลดตะกร้า ให้รีเฟรชหน้าเว็บเพื่ออัปเดต
      }
    } else {
      window.showToast('❌ เพิ่มสินค้าลงตะกร้าไม่สำเร็จ');
    }
  } catch (err) {
    console.error('Add to cart error:', err);
    window.showToast('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ');
  }
};

// --- ฟังก์ชันควบคุมฝั่งแอดมิน: กดบวก/ลบ และกดปุ่มตกลงเพื่อบันทึก ---
window.adjustAdminStock = function(productId, delta) {
  const tempStockEl = document.getElementById(`tempStock_${productId}`);
  if (!tempStockEl) return;
  let val = parseInt(tempStockEl.innerText) || 0;
  val += delta;
  if (val < 0) val = 0;
  tempStockEl.innerText = val;
};

window.confirmUpdateStock = async function(productId) {
  const tempStockEl = document.getElementById(`tempStock_${productId}`);
  const stockTextEl = document.getElementById(`stockText_${productId}`);
  if (!tempStockEl) return;

  const newStock = parseInt(tempStockEl.innerText) || 0;

  try {
    const res = await fetch('/api/admin/update-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: Number(productId), stock: newStock })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (stockTextEl) {
        stockTextEl.innerText = newStock <= 0 ? '❌ สินค้าหมด' : `เหลือ ${newStock} ชิ้น`;
        stockTextEl.style.color = newStock <= 0 ? '#ff334b' : '#10b981';
      }
      if (typeof window.showToast === 'function') {
        window.showToast(`✅ บันทึกสต็อกสินค้าเป็น ${newStock} ชิ้นเรียบร้อย!`);
      } else {
        alert(`✅ บันทึกสต็อกสินค้าเป็น ${newStock} ชิ้นเรียบร้อย!`);
      }
      // โหลดรายการสินค้าใหม่เพื่อให้หน้าเว็บอัปเดตสต็อกล่าสุดทันที
      loadProducts(); 
    } else {
      alert('❌ บันทึกสต็อกไม่สำเร็จ: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Confirm stock error:', err);
    alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

// ฟังก์ชันเปิดดูรายละเอียดสินค้าใน Modal
window.openProductDetail = function(id) {
  const p = currentProducts.find(x => x.id === id);
  if (!p) return;

  const info = getProductBadgeInfo(p.title);
  const imgBox = document.getElementById('modalImgBox');
  const imgDisplay = document.getElementById('modalImgDisplay');
  const fallbackIcon = document.getElementById('modalFallbackIcon');

  if (imgBox) imgBox.style.backgroundColor = info.bg;
  if (imgDisplay && fallbackIcon) {
    if (p.image_url && p.image_url.trim() !== '') {
      imgDisplay.src = p.image_url;
      imgDisplay.style.display = 'block';
      fallbackIcon.style.display = 'none';
    } else {
      imgDisplay.style.display = 'none';
      fallbackIcon.style.display = 'flex';
      fallbackIcon.textContent = info.icon;
    }
  }

  if (document.getElementById('modalTitle')) document.getElementById('modalTitle').textContent = p.title;
  if (document.getElementById('modalPrice')) document.getElementById('modalPrice').textContent = `฿ ${Number(p.price).toLocaleString()}`;
  if (document.getElementById('modalOrigPrice')) document.getElementById('modalOrigPrice').textContent = p.original_price ? `฿${Number(p.original_price).toLocaleString()}` : '';
  if (document.getElementById('modalCondition')) document.getElementById('modalCondition').textContent = p.condition_status;
  if (document.getElementById('modalDelivery')) document.getElementById('modalDelivery').textContent = p.delivery_status;

  const badgeEl = document.getElementById('modalBadge');
  if (badgeEl && p.badge_label) {
    badgeEl.style.display = 'block';
    badgeEl.textContent = p.badge_label;
    badgeEl.className = 'modal-tag-badge ' + (p.badge_label === 'ขายดี' ? 'tag-hot' : p.badge_label === 'ลดราคา' ? 'tag-sale' : 'tag-new');
  } else if (badgeEl) {
    badgeEl.style.display = 'none';
  }

  if (document.getElementById('modalBtnCart')) {
    document.getElementById('modalBtnCart').onclick = () => {
      window.addToCart(p.id);
      window.closeProductModal();
    };
  }

  if (document.getElementById('modalBtnChat')) {
    document.getElementById('modalBtnChat').onclick = () => {
      window.openContactModal();
    };
  }

  if (document.getElementById('productModal')) document.getElementById('productModal').style.display = 'flex';
};

window.closeProductModal = function() {
  const modal = document.getElementById('productModal');
  if (modal) modal.style.display = 'none';
};

/* ============================================================
   4. ABOUT US MODAL
   ============================================================ */
window.openAboutModal = function() {
  document.getElementById('aboutModal').style.display = 'flex';
};
window.closeAboutModal = function() {
  document.getElementById('aboutModal').style.display = 'none';
};

/* ============================================================
   5. SELLER PROFILE
   ============================================================ */
async function loadSeller(sellerId) {
  try {
    const res = await fetch(`/api/seller/${sellerId}`);
    const s = await res.json();
    // เปลี่ยน URL ตรงนี้เป็นรูปที่คุณต้องการ
    document.getElementById('sellerAvatar').src = 'images/my-avatar.png';
    document.getElementById('sellerName').textContent = 'BOXIE Admin Store'; 
    document.getElementById('sellerRating').textContent = '5.0';
    document.getElementById('sellerSales').textContent = s.total_sales || 150;
    document.getElementById('sellerItems').textContent = s.item_count;
    document.getElementById('sellerJoined').textContent = '01/01/2567';
  } catch (err) { console.error('Seller error:', err); }
}

// ฟังก์ชันตอนกด submit ฟอร์มลงขายสินค้า
async function submitNewProduct(event) {
  event.preventDefault();

  const formData = new FormData();
  formData.append('title', document.getElementById('selltitle').value);
  formData.append('price', document.getElementById('sellPrice').value);
  formData.append('category_id', document.getElementById('sellCategory')?.value || 1);
  formData.append('condition_status', document.getElementById('sellCondition')?.value || 'สภาพดี');
  formData.append('delivery_status', document.getElementById('sellDelivery')?.value || 'พร้อมส่ง');
  formData.append('badge_label', document.getElementById('sellBadge')?.value || '');

  // ใช้ id="sellImage" (I ตัวใหญ่ให้ตรงกับ HTML)
  const imageFile = document.getElementById('sellImage').files[0];
  if (imageFile) {
    formData.append('image', imageFile); 
  }

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      body: formData 
    });
    
    const result = await res.json();
    if (res.ok) {
      alert('เพิ่มสินค้าสำเร็จ!');
      location.reload();
    } else {
      alert('เกิดข้อผิดพลาด: ' + result.error);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

/* ============================================================
   6. CART & CHECKOUT
   ============================================================ */
window.addToCart = async function(productId, customQty) {
  if (!currentUser) {
    alert('กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าลงตะกร้าครับ');
    window.openAuthModal('login');
    return;
  }

  // ดึงค่าจำนวนจากปุ่มบวก-ลบที่หน้าการ์ดสินค้า (ถ้ามีส่ง customQty มาให้ใช้ตัวนั้น ถ้าไม่มีให้ไปอ่านค่าจากหน้าจอ)
  const qtyEl = document.getElementById(`buyQty_${productId}`);
  const quantity = customQty !== undefined ? customQty : (qtyEl ? parseInt(qtyEl.innerText) || 1 : 1);

  try {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        product_id: Number(productId), 
        user_id: currentUser.id, 
        quantity: quantity // ส่งจำนวน quantity ที่เลือกไปบันทึกที่หลังบ้าน
      })
    });
    if (res.ok) {
      if (typeof window.showToast === 'function') {
        window.showToast(`✅ เพิ่มสินค้าลงตะกร้าจำนวน ${quantity} ชิ้นเรียบร้อย!`);
      }
      await loadCart();
      scrollToSection('cart-widget');
    }
  } catch (err) { console.error('Add cart error:', err); }
};

// ฟังก์ชันรองรับการกดปุ่มใส่ตะกร้าพร้อมจำนวน
window.addToCartWithQuantity = function(productId) {
  window.addToCart(productId);
};

window.removeCartItem = async function(cartItemId) {
  try {
    const res = await fetch(`/api/cart/${cartItemId}`, { 
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (res.ok) {
      await loadCart(); // โหลดตะกร้าใหม่ทันที สินค้าจะหายไปและยอดเงินอัปเดต
    } else {
      console.error('Delete failed');
    }
  } catch (err) { 
    console.error('Remove cart error:', err); 
  }
};

async function loadCart() {
  if (!currentUser) {
    document.getElementById('cartCount').textContent = 0;
    document.getElementById('navCartCount').textContent = 0;
    document.getElementById('cartTotal').textContent = '฿ 0';
    document.getElementById('cartItemList').innerHTML = '<div style="font-size:12px; color:#aaa; text-align:center; padding:10px;">กรุณาเข้าสู่ระบบ</div>';
    return;
  }

  try {
    const res = await fetch(`/api/cart?user_id=${currentUser.id}`);
    const data = await res.json();
    document.getElementById('cartCount').textContent = data.count;
    document.getElementById('navCartCount').textContent = data.count;
    document.getElementById('cartTotal').textContent = `฿ ${Number(data.total).toLocaleString()}`;

    const list = document.getElementById('cartItemList');
    if (!data.items || !data.items.length) {
      list.innerHTML = '<div style="font-size:12px; color:#aaa; text-align:center; padding:10px;">ไม่มีสินค้าในตะกร้า</div>';
      return;
    }

    list.innerHTML = data.items.map(item => {
      const info = getProductBadgeInfo(item.title);
      const hasRealImg = Boolean(item.image_url && item.image_url.trim() !== '');
      return `
        <div class="cart-line">
          <div class="cart-thumb" style="background:${info.bg};">
            ${hasRealImg ? `<img src="${item.image_url}" alt="">` : info.icon}
          </div>
          <div class="cart-info">
            <div class="cart-title">${item.title}</div>
            <div class="cart-price">฿ ${Number(item.price).toLocaleString()}</div>
          </div>
          <span class="cart-qty">x${item.quantity}</span>

          <button class="cart-del-btn" onclick="window.removeCartItem(${item.cart_item_id})" title="ลบออก">✕</button>
        </div>
      `;
    }).join('');
  } catch (err) { console.error('Cart error:', err); }
}

/* ============================================================
   BOXIE OFFICIAL STORE - CLEAN & FINAL PAYMENT SCRIPT
   ============================================================ */

let selectedPaymentMethod = 'qr';
let currentCheckoutGrandTotal = 0;
let qrTimerInterval = null;
let qrRemainingSeconds = 300;

// ข้อมูลบัญชีของเฮีย (นาย พรหมพิริยะ มหินกอง)
const PROMPTPAY_NUMBER = '0621485603'; 
const KTB_ACCOUNT = '661-8-00721-6';
const ACCOUNT_NAME = 'นาย พรหมพิริยะ มหินกอง';

/* ------------------------------------------------------------
   1. USER ADDRESS & SHIPPING MANAGEMENT
   ------------------------------------------------------------ */
function getUserShippingAddress() {
  if (!currentUser) return null;
  const saved = localStorage.getItem(`boxie_addr_${currentUser.id}`);
  if (saved) return JSON.parse(saved);
  return { name: currentUser.username || '', phone: '', address: '' };
}

function renderAddressBox() {
  const addr = getUserShippingAddress();
  const displayView = document.getElementById('addressDisplayView');
  const editView = document.getElementById('addressEditView');

  if (!displayView || !editView) return;

  if (!addr || !addr.phone || !addr.address) {
    const nameInput = document.getElementById('inputRecipientName');
    if (nameInput) nameInput.value = (currentUser && currentUser.username) || '';
    displayView.style.display = 'none';
    editView.style.display = 'flex';
  } else {
    const nameEl = document.getElementById('displayRecipientName');
    const phoneEl = document.getElementById('displayRecipientPhone');
    const addressEl = document.getElementById('displayRecipientAddress');
    
    if (nameEl) nameEl.textContent = addr.name;
    if (phoneEl) phoneEl.textContent = addr.phone;
    if (addressEl) addressEl.textContent = addr.address;

    displayView.style.display = 'block';
    editView.style.display = 'none';
  }
}

window.toggleEditAddress = function() {
  const displayView = document.getElementById('addressDisplayView');
  const editView = document.getElementById('addressEditView');
  const addr = getUserShippingAddress();

  if (!displayView || !editView) return;

  if (editView.style.display === 'none') {
    const nameInput = document.getElementById('inputRecipientName');
    const phoneInput = document.getElementById('inputRecipientPhone');
    const addressInput = document.getElementById('inputRecipientAddress');

    if (nameInput) nameInput.value = (addr && addr.name) || '';
    if (phoneInput) phoneInput.value = (addr && addr.phone) || '';
    if (addressInput) addressInput.value = (addr && addr.address) || '';

    displayView.style.display = 'none';
    editView.style.display = 'flex';
  } else {
    displayView.style.display = 'block';
    editView.style.display = 'none';
  }
};

window.saveAddress = function() {
  if (!currentUser) return;
  const nameInput = document.getElementById('inputRecipientName');
  const phoneInput = document.getElementById('inputRecipientPhone');
  const addressInput = document.getElementById('inputRecipientAddress');

  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const address = addressInput ? addressInput.value.trim() : '';

  if (!name || !phone || !address) {
    alert('กรุณากรอกข้อมูลชื่อ เบอร์โทร และที่อยู่ให้ครบถ้วนครับ');
    return;
  }

  const newAddr = { name, phone, address };
  localStorage.setItem(`boxie_addr_${currentUser.id}`, JSON.stringify(newAddr));
  renderAddressBox();
};

/* ------------------------------------------------------------
   2. QR CODE TIMER & EXPIRATION SYSTEM
   ------------------------------------------------------------ */
function startQrTimer() {
  clearInterval(qrTimerInterval);
  qrRemainingSeconds = 300;
  updateQrTimerDisplay();

  qrTimerInterval = setInterval(() => {
    qrRemainingSeconds--;
    updateQrTimerDisplay();
    if (qrRemainingSeconds <= 0) {
      clearInterval(qrTimerInterval);
      handleQrExpired();
    }
  }, 1000);
}

function updateQrTimerDisplay() {
  const timerEl = document.getElementById('qrCountdownText');
  if (!timerEl) return;
  const minutes = Math.floor(qrRemainingSeconds / 60);
  const seconds = qrRemainingSeconds % 60;
  timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function handleQrExpired() {
  const box = document.getElementById('qrDisplayContainer');
  if (box) {
    box.innerHTML = `
      <div style="width: 140px; height: 140px; background: rgba(255,255,255,0.05); border: 2px dashed #ff4081; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;">
        <span style="font-size: 24px;">⏳</span>
        <span style="font-size: 11px; color: #ff4081; font-weight: 700;">QR หมดอายุแล้ว</span>
      </div>
      <button onclick="window.selectPaymentMethod('qr')" style="margin-top: 6px; padding: 4px 10px; font-size: 11px; background: var(--primary-pink); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        🔄 โหลด QR อีกครั้ง
      </button>
    `;
  }
}

/* ------------------------------------------------------------
   3. CHECKOUT MODAL & CART CALCULATIONS
   ------------------------------------------------------------ */
window.openCheckoutModal = async function() {
  if (!currentUser) {
    alert('กรุณาเข้าสู่ระบบก่อนทำการชำระเงิน');
    if (typeof window.openAuthModal === 'function') {
      window.openAuthModal('login');
    }
    return;
  }

  renderAddressBox();

  try {
    const res = await fetch(`/api/cart?user_id=${currentUser.id}`);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      alert('ยังไม่มีสินค้าในตะกร้าครับ');
      return;
    }

    const totalCountEl = document.getElementById('checkoutTotalCount');
    if (totalCountEl) {
      totalCountEl.textContent = data.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    const list = document.getElementById('checkoutItemsList');
    if (list) {
      list.innerHTML = data.items.map(item => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0; border-bottom: 1px dashed var(--border); font-size: 12px;">
          <div style="text-align: left;">
            <div style="font-weight: 600;">${item.title}</div>
            <div style="color: #888; font-size: 11px;">฿${Number(item.price).toLocaleString()} × ${item.quantity}</div>
          </div>
          <div style="font-weight: 700; color: var(--primary-pink);">
            ฿ ${(item.price * item.quantity).toLocaleString()}
          </div>
        </div>
      `).join('');
    }

    const shipping = 50;
    const subtotal = Number(data.total) || 0;
    const vat = Math.round(subtotal * 0.07); 
    currentCheckoutGrandTotal = subtotal + vat + shipping;

    const subEl = document.getElementById('checkoutSubtotal');
    if (subEl) subEl.textContent = `฿ ${subtotal.toLocaleString()}`;

    const vatEl = document.getElementById('checkoutVat');
    if (vatEl) vatEl.textContent = `฿ ${vat.toLocaleString()}`;

    const grandEl = document.getElementById('checkoutGrandtotal');
    if (grandEl) grandEl.textContent = `฿ ${currentCheckoutGrandTotal.toLocaleString()}`;

    const grandTotalBottomEl = document.getElementById('checkoutGrandTotal');
    if (grandTotalBottomEl) grandTotalBottomEl.textContent = `฿ ${Number(currentCheckoutGrandTotal).toLocaleString()}`;

    window.selectPaymentMethod('qr');
    
    const checkoutModal = document.getElementById('checkoutModal');
    if (checkoutModal) checkoutModal.style.display = 'flex';
  } catch (err) {
    console.error('Checkout error:', err);
  }
};

window.closeCheckoutModal = function() {
  clearInterval(qrTimerInterval);
  const checkoutModal = document.getElementById('checkoutModal');
  if (checkoutModal) checkoutModal.style.display = 'none';
};

/* ============================================================
   PAYMENT METHOD SWITCHER (CLEAN & NO CITE TEXT)
   ============================================================ */
window.selectPaymentMethod = function(method) {
  selectedPaymentMethod = method;

  const cardQr = document.getElementById('payCardQr');
  const cardKtb = document.getElementById('payCardKtb');
  const cardTrue = document.getElementById('payCardTrue');
  const detailBox = document.getElementById('paymentDetailBox');

  [cardQr, cardKtb, cardTrue].forEach(card => {
    if (card) {
      card.style.borderColor = 'var(--border)';
      card.style.background = 'rgba(255,255,255,0.03)';
    }
  });

  if (!detailBox) return;

  if (method === 'qr') {
    if (cardQr) {
      cardQr.style.borderColor = 'var(--primary-pink)';
      cardQr.style.background = 'rgba(255, 64, 129, 0.1)';
    }

    detailBox.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 11px; margin-bottom: 4px; color: #ffeb3b; font-weight: 600;">
          กรุณาโอนภายใน: <span id="qrCountdownText" style="background: rgba(255,235,59,0.15); padding: 1px 5px; border-radius: 4px; font-weight: 700; font-family: monospace;">05:00</span>
      </div>
      <div id="qrDisplayContainer" style="display: flex; justify-content: center; align-items: center;">
        <div style="background: white; padding: 6px; border-radius: 8px; display: inline-block; text-align: center; border: 2px solid #003366; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
          <!-- รูป QR Code .jpg ของเฮียแบบคลีนๆ -->
          <img src="/images/my-promptpay.jpg" alt="PromptPay QR" style="width: 150px; height: auto; display: block; margin: 0 auto; border-radius: 4px;" onerror="this.src='https://promptpay.io/${PROMPTPAY_NUMBER}.png'">
        </div>
      </div>
      <div style="margin-top: 8px; font-size: 13px; font-weight: 800; color: #ff4081; background: rgba(255,64,129,0.08); padding: 6px; border-radius: 6px; text-align: center;">
        ยอดชำระสุทธิ: ฿ ${Number(currentCheckoutGrandTotal).toLocaleString()}
      </div>
      <div style="font-size: 9px; color: #aaa; margin-top: 4px; text-align: center;">สแกน QR Code นี้ผ่านแอปธนาคารเพื่อชำระเงิน</div>
    `;

    startQrTimer();

  } else {
    clearInterval(qrTimerInterval);

    if (method === 'ktb') {
      if (cardKtb) {
        cardKtb.style.borderColor = '#00a8e8';
        cardKtb.style.background = 'rgba(0, 168, 232, 0.1)';
      }

      detailBox.innerHTML = `
        <div style="font-size: 13px; font-weight: 700; color: #00a8e8;">ธนาคารกรุงไทย (KTB)</div>
        <div style="font-size: 11px; color: #888; margin-bottom: 6px;">โอนผ่าน Krungthai NEXT / ตู้ ATM</div>
        <div style="background: rgba(0,168,232,0.08); border: 1px solid rgba(0,168,232,0.3); border-radius: 8px; padding: 10px; width: 100%; box-sizing: border-box;">
          <div style="font-size: 10px; color: #aaa;">เลขที่บัญชี:</div>
          <div style="font-size: 16px; font-weight: 800; letter-spacing: 1px; color: #fff;">${KTB_ACCOUNT}</div>
          <div style="font-size: 11px; color: #ccc; margin-top: 2px;">ชื่อบัญชี: ${ACCOUNT_NAME}</div>
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #ff4081; margin-top: 6px;">
          ยอดโอนสุทธิ: ฿ ${Number(currentCheckoutGrandTotal).toLocaleString()}
        </div>
      `;

    } else if (method === 'true') {
      if (cardTrue) {
        cardTrue.style.borderColor = '#ff8200';
        cardTrue.style.background = 'rgba(255, 130, 0, 0.1)';
      }

      detailBox.innerHTML = `
        <div style="font-size: 13px; font-weight: 700; color: #ff8200;">ทรูมันนี่ วอลเล็ท (TrueMoney)</div>
        <div style="font-size: 11px; color: #888; margin-bottom: 6px;">โอนผ่านแอป TrueMoney Wallet</div>
        <div style="background: rgba(255,130,0,0.08); border: 1px solid rgba(255,130,0,0.3); border-radius: 8px; padding: 10px; width: 100%; box-sizing: border-box;">
          <div style="font-size: 10px; color: #aaa;">เบอร์ทรูมันนี่:</div>
          <div style="font-size: 16px; font-weight: 800; letter-spacing: 1px; color: #fff;">${PROMPTPAY_NUMBER}</div>
          <div style="font-size: 11px; color: #ccc; margin-top: 2px;">ชื่อบัญชี: ${ACCOUNT_NAME}</div>
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #ff4081; margin-top: 6px;">
          ยอดโอนสุทธิ: ฿ ${Number(currentCheckoutGrandTotal).toLocaleString()}
        </div>
      `;
    }
  }
};
// ==========================================
// ฟังก์ชันยืนยันคำสั่งซื้อและชำระเงิน (รวมร่างสมบูรณ์)
// ==========================================
window.confirmOrder = async function() {
  const checkoutBtn = document.querySelector('.btn-checkout') || document.querySelector('button[onclick*="confirmOrder"]');
  
  // 1. ล็อกปุ่มทันทีที่กด เพื่อป้องกันการกดย้ำรัวๆ จนออเดอร์เบิ้ล
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.style.opacity = '0.5';
    checkoutBtn.innerText = 'กำลังประมวลผล...';
  }

  try {
    const addr = getUserShippingAddress();
    if (!addr || !addr.name || !addr.phone || !addr.address) {
      alert('⚠️ กรุณากรอกและบันทึกที่อยู่จัดส่งให้ครบถ้วนก่อนยืนยันชำระเงินครับ');
      throw new Error('ยังไม่ได้กรอกที่อยู่จัดส่ง');
    }

    if (selectedPaymentMethod === 'qr' && typeof qrRemainingSeconds !== 'undefined' && qrRemainingSeconds <= 0) {
      alert('⚠️ QR Code หมดอายุแล้ว กรุณากดปุ่มสร้าง QR Code ใหม่ก่อนยืนยันครับ');
      throw new Error('QR Code หมดอายุ');
    }

    const methodNames = {
      qr: 'สแกน QR Code พร้อมเพย์',
      ktb: 'โอนผ่านธนาคารกรุงไทย',
      true: 'ทรูมันนี่ วอลเล็ท'
    };
    const currentMethodName = methodNames[selectedPaymentMethod] || 'สแกน QR Code พร้อมเพย์';

    // 2. ดึงยอดชำระสุทธิที่ต้องจ่ายจริงจากหน้าจอ
    const modalText = document.body.innerText;
    const matchTotal = modalText.match(/ยอดชำระ:\s*฿\s*([\d,]+)/) || modalText.match(/ทั้งหมด\s*฿\s*([\d,]+)/);
    const expectedAmount = matchTotal ? Number(matchTotal[1].replace(/,/g, '')) : 0;

    // 3. ตรวจสอบไฟล์รูปสลิป
    const fileInput = document.getElementById('slipFileInput') || document.querySelector('input[name="slip"]');
    const amountInput = document.getElementById('slipAmountInput') || document.querySelector('input[name="entered_amount"]');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      alert('❌ ไม่สามารถชำระเงินได้!\nกรุณาเลือกไฟล์แนบรูปสลิปโอนเงินเพื่อเป็นหลักฐานก่อนครับ');
      throw new Error('ยังไม่ได้แนบสลิป');
    }

    // 4. ตรวจสอบยอดเงินที่กรอกต้องตรงเป๊ะ
    const inputVal = amountInput ? amountInput.value.replace(/,/g, '').trim() : '';
    if (!inputVal) {
      alert('⚠️ กรุณากรอกยอดเงินที่โอนในช่อง "ยืนยันยอดเงินที่โอนตามสลิป" ก่อนกดชำระเงินครับ!');
      if (amountInput) amountInput.focus();
      throw new Error('ยังไม่ได้กรอกยอดเงินในสลิป');
    }

    const paidNum = Number(inputVal);
    if (isNaN(paidNum) || paidNum <= 0 || (expectedAmount > 0 && paidNum !== expectedAmount)) {
      alert(`❌ ยอดเงินในสลิปไม่ถูกต้อง!\nยอดที่ต้องชำระคือ ฿${expectedAmount.toLocaleString()} แต่คุณระบุยอดโอน ${inputVal} บาท\nกรุณาตรวจสอบสลิปและกรอกยอดเงินให้ตรงกันครับ`);
      if (amountInput) amountInput.focus();
      throw new Error('ยอดเงินในสลิปไม่ตรงกับยอดชำระจริง');
    }

    // 5. แพ็กข้อมูลใส่ FormData ส่งไปที่ Server
    const formData = new FormData();
    formData.append('user_id', currentUser ? currentUser.id : 2);
    formData.append('payment_method', currentMethodName);
    formData.append('shipping_address', `${addr.name} (${addr.phone}) ${addr.address}`);
    formData.append('entered_amount', paidNum);
    formData.append('slip', fileInput.files[0]); // แนบไฟล์สลิปชัวร์ 100%

    const res = await fetch('/api/checkout', {
      method: 'POST',
      body: formData // ส่งแบบ FormData ห้ามกำหนด Content-Type ปล่อยให้เบราว์เซอร์จัดการเอง
    });
    const data = await res.json();

    if (res.ok || data.success) {
      if (typeof qrTimerInterval !== 'undefined') clearInterval(qrTimerInterval);
      
      // เคลียร์ฟอร์ม
      fileInput.value = '';
      if (amountInput) amountInput.value = '';
      const previewBox = document.getElementById('slipPreviewBox');
      if (previewBox) previewBox.style.display = 'none';

      if (typeof window.closeCheckoutModal === 'function') window.closeCheckoutModal();
      if (typeof loadCart === 'function') await loadCart();
      if (typeof loadProducts === 'function') await loadProducts();
      if (typeof loadOrders === 'function') await loadOrders();

      const finalTotal = data.total || paidNum;
      const shippingFee = 50;
      const calcSubtotal = Math.max(0, finalTotal - shippingFee);
      const orderNo = data.orderId || Math.floor(100000 + Math.random() * 900000);

      // สร้างหน้าต่างใบเสร็จการันตีสวยๆ
      const slipHtml = `
        <div id="boxieSlipModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:999999;">
          <div style="background:#ffffff;color:#222;width:380px;border-radius:16px;padding:24px;text-align:center;box-shadow:0 15px 40px rgba(0,0,0,0.6);font-family:sans-serif;">
            <div style="width:54px;height:54px;background:#10b981;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 10px;">✓</div>
            <h3 style="margin:0;color:#111;font-size:18px;">สลิปการันตีคำสั่งซื้อ / ใบกำกับภาษีอย่างย่อ</h3>
            <p style="margin:4px 0 12px;font-size:12px;color:#10b981;font-weight:bold;">✅ ตรวจสอบหลักฐานสลิปและยอด ฿${Number(finalTotal).toLocaleString()} ถูกต้อง!</p>
            
            <div style="background:#f8f9fa;border:1px dashed #ccc;border-radius:10px;padding:12px;text-align:left;font-size:13px;line-height:1.8;margin-bottom:14px;">
              <div><b>หมายเลขคำสั่งซื้อ:</b> #BOX-${orderNo}</div>
              <div><b>วันที่ชำระ:</b> ${new Date().toLocaleString('th-TH')}</div>
              <div><b>ผู้รับ:</b> ${addr.name} (${addr.phone})</div>
              <div><b>ที่อยู่จัดส่ง:</b> ${addr.address}</div>
              <div><b>ช่องทางชำระเงิน:</b> ${currentMethodName}</div>
              <div><b>สถานะ:</b> <span style="color:#10b981;font-weight:bold;">ชำระเงินสำเร็จ (คุ้มครอง 100%)</span></div>
              
              <div style="border-top:1px dashed #ddd;margin-top:6px;padding-top:6px;font-size:12px;color:#555;">
                <div style="display:flex;justify-content:space-between;"><span>ราคาสินค้า:</span><span>฿${Number(calcSubtotal).toLocaleString()}</span></div>
                <div style="display:flex;justify-content:space-between;"><span>ค่าจัดส่งพัสดุกันกระแทก:</span><span>฿${shippingFee}</span></div>
              </div>

              <div style="border-top:1px solid #ddd;margin-top:6px;padding-top:6px;font-size:15px;font-weight:bold;color:#ff334b;display:flex;justify-content:space-between;">
                <span>ยอดชำระสุทธิ:</span>
                <span>฿${Number(finalTotal).toLocaleString()}</span>
              </div>
            </div>

            <div style="font-size:11px;color:#d61f3c;background:#fff0f2;padding:8px;border-radius:6px;margin-bottom:16px;">
              🛡️ <b>BOXIE Official Guarantee:</b> ทางร้านได้รับหลักฐานสลิปและยอดเงินรวมภาษีครบถ้วนแล้ว รับประกันการจัดส่งสินค้าแท้ 100%
            </div>

            <button onclick="document.getElementById('boxieSlipModal').remove(); if(typeof loadProducts==='function') loadProducts(); location.reload();" style="width:100%;background:#ff334b;color:#fff;border:none;padding:11px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:14px;">
              ตกลง (บันทึกสลิปการันตี)
            </button>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', slipHtml);

    } else {
      throw new Error(data.error || 'ไม่สามารถบันทึกคำสั่งซื้อได้');
    }
  } catch (err) {
    console.error('Confirm order error:', err);
    // ปลดล็อกปุ่มคืนค่าให้กดใหม่ได้เมื่อเกิดข้อผิดพลาด
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.style.opacity = '1';
      checkoutBtn.innerText = 'ชำระเงิน';
    }
  }
};

// ==========================================
// ฟังก์ชันพรีวิวรูปสลิป
// ==========================================
window.previewSlip = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewImg = document.getElementById('slip-preview-img') || document.getElementById('slipPreviewImg');
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }
};

/* ============================================================
   7. SELL NEW PRODUCT (ADMIN ONLY)
   ============================================================ */
window.openSellModal = async function() {
  if (!currentUser || (currentUser.username !== 'admin' && currentUser.id !== 1)) {
    alert('เฉพาะเจ้าของร้าน (Admin) เท่านั้นที่สามารถลงขายสินค้าได้ครับ');
    return;
  }

  const catSelect = document.getElementById('sellCategory');
  if (catSelect.children.length === 0) {
    const resCat = await fetch('/api/categories');
    const cats = await resCat.json();
    catSelect.innerHTML = cats.filter(c => c.key_name !== 'all').map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  document.getElementById('sellModal').style.display = 'flex';
};

window.closeSellModal = function() {
  document.getElementById('sellModal').style.display = 'none';
};

window.submitNewProduct = async function(event) {
  event.preventDefault();

  const formData = new FormData();
  formData.append('title', document.getElementById('sellTitle').value); // สสังเกตตัว T ใหญ่ตาม sellTitle ใน HTML
  formData.append('price', document.getElementById('sellPrice').value);
  formData.append('category_id', document.getElementById('sellCategory')?.value || 1);
  formData.append('condition_status', document.getElementById('sellCondition')?.value || 'สภาพดี');
  formData.append('delivery_status', document.getElementById('sellDelivery')?.value || 'พร้อมส่ง');
  formData.append('badge_label', document.getElementById('sellBadge')?.value || '');

  // 📌 ดึงไฟล์ผ่าน .files[0] และใช้ id="sellImage" (I ตัวใหญ่) ให้ตรงกับ HTML
  const imageFile = document.getElementById('sellImage').files[0];
  if (imageFile) {
    formData.append('image', imageFile); 
  }

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      body: formData // ห้ามใส่ headers กำหนด Content-Type เองปล่อยให้ browser จัดการให้
    });
    
    const result = await res.json();
    if (res.ok) {
      alert('เพิ่มสินค้าสำเร็จ!');
      location.reload();
    } else {
      alert('เกิดข้อผิดพลาด: ' + result.error);
    }
  } catch (err) {
    console.error('Error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

/* ============================================================
   8. ORDER HISTORY
   ============================================================ */
// --- ระบบคำสั่งซื้อ + หมวดหมู่สถานะการจัดส่ง + ติดตามพัสดุ + ดูสลิปการันตีย้อนหลัง ---
window.currentOrderFilter = 'all';
window.cachedOrdersList = [];

window.getOrderShippingStatus = function(orderId) {
  const raw = localStorage.getItem('boxie_order_shipping_status');
  const saved = raw ? JSON.parse(raw) : {};
  return saved[orderId] ? saved[orderId] : 'preparing';
};

window.setOrderShippingStatus = function(orderId, newStatus) {
  const raw = localStorage.getItem('boxie_order_shipping_status');
  const saved = raw ? JSON.parse(raw) : {};
  saved[orderId] = newStatus;
  localStorage.setItem('boxie_order_shipping_status', JSON.stringify(saved));
  window.renderOrdersList();
};

window.filterOrdersByStatus = function(status) {
  window.currentOrderFilter = status;
  window.renderOrdersList();
};

window.viewGuaranteeSlip = function(orderId) {
  const list = window.cachedOrdersList ? window.cachedOrdersList : [];
  const o = list.find(item => Number(item.id) === Number(orderId));
  if (!o) return;

  // แก้ไขเป็นชุดนี้
const finalTotal = o.total ? Number(o.total) : 0;
const shippingFee = 50;
const calcSubtotal = Math.max(0, finalTotal - shippingFee);
const statusKey = window.getOrderShippingStatus(o.id);
const statusLabels = {
    preparing: '📦 เตรียมจัดส่ง (แพ็กพัสดุกันกระแทก)',
    shipping: '🚚 กำลังจัดส่ง (อยู่ระหว่างขนส่ง)',
    delivered: '✅ จัดส่งสำเร็จ (ได้รับสินค้าแล้ว)'
  };
  const trackingNo = 'TH' + String(o.id).padStart(6, '0') + 'BOX';
  const orderDate = o.created_at ? o.created_at : 'เมื่อสักครู่';
  const itemCount = o.total_items ? o.total_items : 1;
  const buyerName = currentUser ? currentUser.display_name : 'ลูกค้าทั่วไป';

  const oldSlip = document.getElementById('boxieSlipModal');
  if (oldSlip) oldSlip.remove();

  const slipHtml = `
    <div id="boxieSlipModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:999999;">
      <div style="background:#ffffff;color:#222;width:380px;max-width:92%;border-radius:16px;padding:24px;text-align:center;box-shadow:0 15px 40px rgba(0,0,0,0.6);font-family:sans-serif;">
        <div style="width:50px;height:50px;background:#10b981;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px;">✓</div>
        <h3 style="margin:0;color:#111;font-size:17px;">สลิปการันตีคำสั่งซื้อ / ใบกำกับภาษีอย่างย่อ</h3>
        <p style="margin:4px 0 12px;font-size:12px;color:#10b981;font-weight:bold;">🛡️ หลักฐานรับรองโดย BOXIE Official Store</p>
        
        <div style="background:#f8f9fa;border:1px dashed #ccc;border-radius:10px;padding:12px;text-align:left;font-size:12.5px;line-height:1.8;margin-bottom:14px;">
          <div><b>หมายเลขคำสั่งซื้อ:</b> #BOX-${o.id}</div>
          <div><b>เลขพัสดุ (Tracking):</b> <span style="color:#d61f3c;font-weight:bold;">${trackingNo}</span></div>
          <div><b>วันที่สั่งซื้อ:</b> ${orderDate}</div>
          <div><b>ผู้ซื้อ:</b> ${buyerName}</div>
          <div><b>สถานะจัดส่ง:</b> <span style="color:#0284c7;font-weight:bold;">${statusLabels[statusKey]}</span></div>
          
          <div style="border-top:1px dashed #ddd;margin-top:6px;padding-top:6px;font-size:12px;color:#555;">
            <div style="display:flex;justify-content:space-between;"><span>ราคาสินค้า (${itemCount} ชิ้น):</span><span>฿${calcSubtotal.toLocaleString()}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>ค่าจัดส่งพัสดุกันกระแทก:</span><span>฿${shippingFee}</span></div>
          </div>

          <div style="border-top:1px solid #ddd;margin-top:6px;padding-top:6px;font-size:15px;font-weight:bold;color:#ff334b;display:flex;justify-content:space-between;">
            <span>ยอดชำระสุทธิ:</span>
            <span>฿${Number(finalTotal).toLocaleString()}</span>
          </div>

          <div style="border-top:1px solid #ddd;margin-top:6px;padding-top:6px;font-size:14px;font-weight:bold;color:#ff334b;display:flex;justify-content:space-between;">
            <span>ยอดชำระสุทธิ (รวม VAT):</span>
            <span>฿${finalTotal.toLocaleString()}</span>
          </div>
        </div>

        <div style="font-size:11px;color:#d61f3c;background:#fff0f2;padding:8px;border-radius:6px;margin-bottom:14px;">
          🛡️ <b>BOXIE Official Guarantee:</b> เอกสารฉบับนี้ใช้ยืนยันว่าทางร้านได้รับยอดชำระและรับประกันการจัดส่งสินค้าของแท้ 100%
        </div>

        <button onclick="document.getElementById('boxieSlipModal').remove();" style="width:100%;background:#ff334b;color:#fff;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:13px;">
          ปิดหน้าต่างสลิป
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', slipHtml);
};

window.renderOrdersList = function() {
  const container = document.getElementById('ordersListContainer');
  if (!container) return;

  const modalBox = container.parentElement;
  if (modalBox) modalBox.style.maxWidth = '600px';

  const headerEl = modalBox ? modalBox.querySelector('h2, h3') : null;
  if (headerEl) {
    headerEl.style.display = 'flex';
    headerEl.style.alignItems = 'center';
    headerEl.style.justifyContent = 'space-between';
    headerEl.style.flexWrap = 'wrap';
    headerEl.style.gap = '10px';
    headerEl.style.width = '100%';
    headerEl.style.paddingRight = '30px';

    const f = window.currentOrderFilter;
    const btnStyle = (active) => `
      background:${active ? '#ff334b' : '#2a2a38'};
      color:${active ? '#fff' : '#ccc'};
      border:1px solid ${active ? '#ff334b' : '#3f3f52'};
      padding:4px 9px;
      border-radius:20px;
      font-size:11px;
      font-weight:600;
      cursor:pointer;
      white-space:nowrap;
    `;

    headerEl.innerHTML = `
      <span>📋 คำสั่งซื้อ & ติดตามพัสดุ</span>
      <div style="display:inline-flex; gap:4px; align-items:center;">
        <button onclick="window.filterOrdersByStatus('all')" style="${btnStyle(f === 'all')}">ทั้งหมด</button>
        <button onclick="window.filterOrdersByStatus('preparing')" style="${btnStyle(f === 'preparing')}">📦 เตรียมจัดส่ง</button>
        <button onclick="window.filterOrdersByStatus('shipping')" style="${btnStyle(f === 'shipping')}">🚚 กำลังจัดส่ง</button>
        <button onclick="window.filterOrdersByStatus('delivered')" style="${btnStyle(f === 'delivered')}">✅ จัดส่งสำเร็จ</button>
      </div>
    `;
  }

  const allOrders = window.cachedOrdersList ? window.cachedOrdersList : [];
  const filtered = allOrders.filter(o => {
    if (window.currentOrderFilter === 'all') return true;
    const currentStatus = o.shipping_status || 'preparing';
    return currentStatus === window.currentOrderFilter;
  });

  if (!filtered.length) {
    container.innerHTML = '<div style="text-align:center; padding: 30px; color:#999; font-size:13px;">ไม่มีรายการคำสั่งซื้อในหมวดสถานะนี้</div>';
    return;
  }

  container.innerHTML = filtered.map(o => {
    const status = o.shipping_status || 'preparing';
    const trackingNo = o.tracking_number || ('TH' + String(o.id).padStart(6, '0') + 'BOX');
    const orderDate = o.created_at ? o.created_at : 'เมื่อสักครู่';
    const itemCount = o.total_items ? o.total_items : 1;

    // เช็กสถานะเส้น Timeline
    const step1 = true;
    const step2 = (status === 'shipping' || status === 'delivered');
    const step3 = (status === 'delivered');

    const badgeMap = {
      preparing: { text: '📦 เตรียมจัดส่ง', bg: '#fff3cd', color: '#b45309' },
      shipping: { text: '🚚 กำลังจัดส่ง', bg: '#e0f2fe', color: '#0369a1' },
      delivered: { text: '✅ จัดส่งสำเร็จ', bg: '#dcfce7', color: '#15803d' }
    };
    const badgeInfo = badgeMap[status] || badgeMap.preparing;

    return `
      <div style="background: #faf7f2; border: 1px solid #e5e0d8; border-radius: 14px; padding: 16px; margin-bottom: 12px; color: #222;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight: 800; font-size: 15px; color: #222;">คำสั่งซื้อ #BOX-${o.id}</span>
              <span style="background:${badgeInfo.bg}; color:${badgeInfo.color}; font-size:11px; font-weight:700; padding:2px 9px; border-radius:12px;">
                ${badgeInfo.text}
              </span>
            </div>
            <div style="font-size: 11.5px; color: #666; margin-top: 4px;">
              วันที่สั่ง: ${orderDate} (${itemCount} ชิ้น) | เลขพัสดุ: <b style="color:#d61f3c;">${trackingNo}</b>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: 800; color: #ff334b;">฿ ${Number(o.total || 0).toLocaleString()}</div>
            <span style="font-size: 10px; color: #777; display:block;">รวม VAT & กันกระแทก</span>
          </div>
        </div>

        <!-- 🟢 เส้น Timeline แสดงสถานะความคืบหน้ากลับมาแล้ว -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin: 12px 0; padding: 0 10px; font-size: 11px; color: #555; position: relative;">
          <div style="position: absolute; top: 50%; left: 20px; right: 20px; height: 2px; background: #e0dcd3; z-index: 1; transform: translateY(-50%);"></div>
          
          <div style="display: flex; align-items: center; gap: 4px; z-index: 2; background: #faf7f2; padding: 0 4px;">
            <span style="width: 18px; height: 18px; border-radius: 50%; background: ${step1 ? '#10b981' : '#cbd5e1'}; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">1</span>
            <span style="font-weight: ${step1 ? 'bold' : 'normal'}; color: ${step1 ? '#10b981' : '#888'};">เตรียมจัดส่ง</span>
          </div>

          <div style="display: flex; align-items: center; gap: 4px; z-index: 2; background: #faf7f2; padding: 0 4px;">
            <span style="width: 18px; height: 18px; border-radius: 50%; background: ${step2 ? '#10b981' : '#cbd5e1'}; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">2</span>
            <span style="font-weight: ${step2 ? 'bold' : 'normal'}; color: ${step2 ? '#10b981' : '#888'};">กำลังจัดส่ง</span>
          </div>

          <div style="display: flex; align-items: center; gap: 4px; z-index: 2; background: #faf7f2; padding: 0 4px;">
            <span style="width: 18px; height: 18px; border-radius: 50%; background: ${step3 ? '#10b981' : '#cbd5e1'}; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">3</span>
            <span style="font-weight: ${step3 ? 'bold' : 'normal'}; color: ${step3 ? '#10b981' : '#888'};">จัดส่งสำเร็จ</span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px dashed #e0dcd3;">
          <button onclick="window.viewGuaranteeSlip(${o.id})" style="background: #ff334b; color: #fff; border: none; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">
            🧾 ดูสลิปการันตีของร้าน (E-Receipt)
          </button>
          <div style="font-size: 11px; color: #666; font-style: italic;">
            สถานะอัปเดตโดย: BOXIE Official Store
          </div>
        </div>
      </div>
    `;
  }).join('');
};

window.openOrdersModal = async function() {
  if (!currentUser) {
    alert('กรุณาเข้าสู่ระบบก่อนครับ');
    window.openAuthModal('login');
    return;
  }

  try {
    // 🔄 บังคับดึงข้อมูลสดจาก API ของเซิร์ฟเวอร์ทุกครั้งที่เปิด Modal
    const res = await fetch(`/api/orders?user_id=${currentUser.id}`);
    const orders = await res.json();
    
    // บันทึกข้อมูลใหม่ลงแคชแบบตรงไปตรงมา
    window.cachedOrdersList = Array.isArray(orders) ? orders : [];
    window.currentOrderFilter = 'all';
    
    window.renderOrdersList();
    document.getElementById('ordersModal').style.display = 'flex';
  } catch (err) {
    console.error('Orders error:', err);
  }
};

window.closeOrdersModal = function() {
  document.getElementById('ordersModal').style.display = 'none';
};

/* ============================================================
   9. NAVIGATION & UTILITIES
   ============================================================ */
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function focusChat() {
  alert('ระบบแชทปิดปรับปรุงชั่วคราวครับ สามารถสั่งซื้อสินค้าได้ตามปกติ');
}

/* ============================================================
   10. DARK MODE & NOTIFICATIONS SYSTEM
   ============================================================ */
(function initTheme() {
  const isDark = localStorage.getItem('boxie_theme') === 'dark';
  if (isDark) {
    document.body.classList.add('dark-mode');
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = '☀️';
  }
})();

window.toggleDarkMode = function() {
  const isDark = document.body.classList.toggle('dark-mode');
  const btn = document.getElementById('themeToggleBtn');
  if (isDark) {
    localStorage.setItem('boxie_theme', 'dark');
    if (btn) btn.textContent = '☀️';
  } else {
    localStorage.setItem('boxie_theme', 'light');
    if (btn) btn.textContent = '🌙';
  }
};

window.toggleNotifDropdown = function() {
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
};

document.addEventListener('click', (e) => {
  const notifWrapper = document.querySelector('.notif-wrapper');
  const dropdown = document.getElementById('notifDropdown');
  if (notifWrapper && dropdown && !notifWrapper.contains(e.target)) {
    dropdown.classList.remove('show');
  }
});

window.markAllNotifsAsRead = function() {
  const badge = document.getElementById('notifBadge');
  if (badge) badge.style.display = 'none';

  const unreadItems = document.querySelectorAll('.notif-item.unread');
  unreadItems.forEach(item => item.classList.remove('unread'));
};

/* ============================================================
   CONTACT MODAL (INSTAGRAM & LINE)
   ============================================================ */
window.openContactModal = function() {
  // หากเปิดจากหน้าต่างดูสินค้า ให้ปิดหน้าต่างสินค้าเดิมก่อน
  if (typeof window.closeProductModal === 'function') {
    window.closeProductModal();
  }
  const modal = document.getElementById('contactModal');
  if (modal) modal.style.display = 'flex';
};

window.closeContactModal = function() {
  const modal = document.getElementById('contactModal');
  if (modal) modal.style.display = 'none';
};

// --- 1. ฟังก์ชันเปิดแผงควบคุมแอดมิน (Global) ---
// --- 1. ฟังก์ชันเปิดแผงควบคุมแอดมิน (แบบ 2 ฝั่ง ซ้าย-ขวา สมบูรณ์) ---
// --- 1. ฟังก์ชันเปิดแผงควบคุมแอดมิน (แบบเต็มจอ Full Screen) ---
window.openAdminModal = async function() {
  console.log("Admin modal opening (Clean Filter & Working Delete Fixed)...");
  
  const oldModal = document.getElementById('adminModal');
  if (oldModal) oldModal.remove();

  const modalHtml = `
    <div id="adminModal" style="display:flex !important; position:fixed !important; inset:0 !important; background:rgba(0,0,0,0.85) !important; z-index:999999 !important; align-items:center !important; justify-content:center !important;">
      <div style="background:#1e1e28; color:#fff; width:1400px; max-width:98%; max-height:92vh; border-radius:16px; padding:24px; overflow-y:auto; box-shadow:0 10px 30px rgba(0,0,0,0.5); font-family:sans-serif; position:relative; display:flex; flex-direction:column;">
        
        <!-- ส่วนหัว Modal -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #333; padding-bottom:12px; flex-shrink:0;">
          <h3 style="margin:0; font-size:20px; color: #ff334b;">⚙️ แผงควบคุมแอดมิน: รายงานยอดขายและประวัติการขาย (POS Pro)</h3>
          <button onclick="document.getElementById('adminModal').remove()" style="background:none; border:none; color:#aaa; font-size:24px; cursor:pointer;">✕</button>
        </div>

        <!-- ส่วนเนื้อหาหลัก: แบ่งเป็น 2 ฝั่ง (Grid Layout) -->
        <div id="adminPanelContent" style="display: grid; grid-template-columns: 1.35fr 0.65fr; gap: 20px; flex-grow: 1; overflow: hidden;">
          
          <!-- 📊 ฝั่งซ้าย: ยอดขายรวม, สินค้าขายดี และตารางประวัติการขายพร้อมแถบฟิลเตอร์ -->
          <div style="display: flex; flex-direction: column; gap: 16px; overflow-y: auto; padding-right: 4px;">
            
            <!-- การ์ดรายงานยอดขาย & สินค้าขายดี -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div style="background: #121216; padding: 14px; border-radius: 10px; border: 1px solid #333;">
                <div style="font-size: 13px; color: #aaa; margin-bottom: 6px;">📈 ยอดขายรวม</div>
                <div style="font-size: 15px; font-weight: bold; color: #ff334b; margin-bottom: 4px;">วันนี้: <span id="reportDailySales">฿0</span></div>
                <div style="font-size: 12px; color: #ccc;">เดือน: <span id="reportMonthlySales">฿0</span></div>
                <div style="font-size: 12px; color: #888;">ปี: <span id="reportYearlySales">฿0</span></div>
              </div>
              <div style="background: #121216; padding: 14px; border-radius: 10px; border: 1px solid #333;">
                <div style="font-size: 13px; color: #aaa; margin-bottom: 6px;">🔥 สินค้าขายดี</div>
                <div id="reportTopProducts" style="font-size: 12px; color: #ddd; line-height: 1.4;">กำลังโหลด...</div>
              </div>
            </div>

            <!-- 🧾 ประวัติการขาย -->
            <div style="background: #121216; padding: 16px; border-radius: 10px; border: 1px solid #333; display: flex; flex-direction: column;">
              
              <!-- แถบตัวกรอง (Filter Bar) -->
              <div style="background: #262633; padding: 12px; border-radius: 8px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; border: 1px solid #444;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px;">
                  <b style="color: #fff;">สรุปการขายประจำวัน</b>
                  <select id="filterDay" style="padding: 4px 8px; background: #181820; color: #fff; border: 1px solid #555; border-radius: 4px;">
                    <option value="">ทุกวัน</option>
                  </select>
                  <select id="filterMonth" style="padding: 4px 8px; background: #181820; color: #fff; border: 1px solid #555; border-radius: 4px;">
                    <option value="">ทุกเดือน</option>
                    <option value="01">ม.ค.</option><option value="02">ก.พ.</option><option value="03">มี.ค.</option><option value="04">เม.ย.</option>
                    <option value="05">พ.ค.</option><option value="06">มิ.ย.</option><option value="07">ก.ค.</option><option value="08">ส.ค.</option>
                    <option value="09">ก.ย.</option><option value="10">ต.ค.</option><option value="11">พ.ย.</option><option value="12">ธ.ค.</option>
                  </select>
                  <select id="filterYear" style="padding: 4px 8px; background: #181820; color: #fff; border: 1px solid #555; border-radius: 4px;">
                    <option value="">ทุกปี</option>
                  </select>
                  
                  <span style="color: #aaa; margin-left: 4px;">ตัวกรอง:</span>
                  <select id="filterStatus" style="padding: 4px 8px; background: #181820; color: #fff; border: 1px solid #555; border-radius: 4px;">
                    <option value="all">ทั้งหมด</option>
                    <option value="preparing">เตรียมจัดส่ง</option>
                    <option value="shipping">กำลังจัดส่ง</option>
                    <option value="delivered">จัดส่งสำเร็จ</option>
                  </select>

                  <button onclick="window.filterAdminOrders()" style="background: #2563eb; color: #fff; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                    🔍 ค้นหา
                  </button>
                  <button onclick="window.resetAdminFilter()" style="background: #4b5563; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                    🔄 ล้างค่า
                  </button>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; font-size: 11px; color: #ccc;">
                  <div>การชำระเงิน: 
                    <select id="filterPayment" style="padding: 3px 6px; background: #181820; color: #fff; border: 1px solid #555; border-radius: 4px;">
                      <option value="all">ทั้งหมด</option>
                      <option value="qr">QR PromptPay</option>
                      <option value="cod">เก็บเงินปลายทาง</option>
                    </select>
                  </div>
                  <div>ประเภทการขาย: 
                    <select id="filterSaleType" style="padding: 3px 6px; background: #181820; color: #fff; border: 1px solid #555; border-radius: 4px;">
                      <option value="all">ทั้งหมด</option>
                      <option value="online">ออนไลน์</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- ตารางประวัติการขาย (ลบคอลัมน์ "ลบ" ออกเรียบร้อย) -->
              <div style="max-height: 280px; overflow-y: auto; border-radius: 6px; border: 1px solid #333;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 11px;">
                  <thead>
                    <tr style="background: #3b82f6; color: #fff; border-bottom: 2px solid #2563eb;">
                      <th style="padding: 8px 6px; text-align: center; width: 35px; border-right: 1px solid rgba(255,255,255,0.2);">ที่</th>
                      <th style="padding: 8px 8px; border-right: 1px solid rgba(255,255,255,0.2);">เลขที่บิล</th>
                      <th style="padding: 8px 8px; border-right: 1px solid rgba(255,255,255,0.2);">ชื่อสมาชิก</th>
                      <th style="padding: 8px 6px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2);">จำนวน</th>
                      <th style="padding: 8px 8px; text-align: right; border-right: 1px solid rgba(255,255,255,0.2);">ราคา</th>
                      <th style="padding: 8px 8px; text-align: right; border-right: 1px solid rgba(255,255,255,0.2);">ส่วนลด</th>
                      <th style="padding: 8px 8px; text-align: right; border-right: 1px solid rgba(255,255,255,0.2);">Vat (7%)</th>
                      <th style="padding: 8px 8px; text-align: right; border-right: 1px solid rgba(255,255,255,0.2);">รวมสุทธิ</th>
                      <th style="padding: 8px 8px; text-align: right; border-right: 1px solid rgba(255,255,255,0.2);">กำไร</th>
                      <th style="padding: 8px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2);">วัน/เดือน/ปี และเวลา</th>
                      <th style="padding: 8px 6px; text-align: center; width: 85px;">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody id="adminSalesHistoryTableBody">
                    <tr><td colspan="11" style="padding: 20px; text-align: center; color: #888;">กำลังโหลดประวัติ...</td></tr>
                  </tbody>
                  <tfoot id="adminSalesHistoryTableFooter">
                    <!-- แถวสรุปผลรวม -->
                  </tfoot>
                </table>
              </div>
            </div>

          </div>

          <!-- 🚚 ฝั่งขวา: จัดการออเดอร์และพัสดุ (รอจัดการ) -->
          <div style="background: #121216; padding: 18px; border-radius: 10px; border: 1px solid #333; display: flex; flex-direction: column; overflow: hidden;">
            <h4 style="margin-top: 0; font-size: 15px; margin-bottom: 12px; color: #fff;">🚚 จัดการออเดอร์และพัสดุ (รอจัดการ)</h4>
            <div id="adminOrdersContainer" style="color: #ccc; font-size: 13px; flex-grow: 1; overflow-y: auto;">
              กำลังโหลดรายการออเดอร์...
            </div>
          </div>

        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  if (typeof window.loadAdminOrdersData === 'function') {
    window.loadAdminOrdersData();
  }

  // เติมตัวเลือกวันและปีในฟิลเตอร์อัตโนมัติ
  const daySelect = document.getElementById('filterDay');
  const yearSelect = document.getElementById('filterYear');
  if (daySelect) {
    for (let i = 1; i <= 31; i++) {
      daySelect.innerHTML += `<option value="${String(i).padStart(2, '0')}">${i}</option>`;
    }
  }
  if (yearSelect) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 5; y--) {
      yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    }
  }

  // ฟังก์ชันแปลงเวลาบวกเพิ่ม 7 ชั่วโมง (เวลาไทย)
  function formatToThaiTime(dateString) {
    if (!dateString) return '-';
    try {
      let parts = dateString.split(/[- :]/);
      if (parts.length >= 5) {
        let year = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1;
        let day = parseInt(parts[2], 10);
        let hour = parseInt(parts[3], 10) + 7;
        let minute = parseInt(parts[4], 10);
        let second = parts[5] ? parseInt(parts[5], 10) : 0;

        let d = new Date(year, month, day, hour, minute, second);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      }
      return dateString;
    } catch (e) {
      return dateString;
    }
  }

  // 1. โหลดรายงานยอดขายและสินค้าขายดี
  try {
    const reportRes = await fetch('/api/admin/reports');
    const reportData = await reportRes.json();
    const sales = reportData.sales || {};

    const dailyEl = document.getElementById('reportDailySales');
    const monthlyEl = document.getElementById('reportMonthlySales');
    const yearlyEl = document.getElementById('reportYearlySales');

    if (dailyEl) dailyEl.innerText = '฿' + Number(sales.daily_sales || sales.daily || 0).toLocaleString();
    if (monthlyEl) monthlyEl.innerText = '฿' + Number(sales.monthly_sales || sales.monthly || 0).toLocaleString();
    if (yearlyEl) yearlyEl.innerText = '฿' + Number(sales.yearly_sales || sales.yearly || 0).toLocaleString();

    const topContainer = document.getElementById('reportTopProducts');
    if (topContainer) {
      if (reportData.topProducts && reportData.topProducts.length > 0) {
        topContainer.innerHTML = reportData.topProducts.map((p, i) => 
          `<div style="margin-bottom: 3px;">${i + 1}. ${p.title || p.name} <span style="color: #ff334b;">(${p.total_sold || p.sold || 0} ชิ้น)</span></div>`
        ).join('');
      } else {
        topContainer.innerHTML = '<span style="color: #888;">ยังไม่มีข้อมูลการขาย</span>';
      }
    }
  } catch (err) {
    console.error('Load reports error:', err);
  }

  // 2. โหลดข้อมูลออเดอร์ทั้งหมด
  window.loadAdminOrdersData = async function() {
    const orderContainer = document.getElementById('adminOrdersContainer');
    const historyTbody = document.getElementById('adminSalesHistoryTableBody');

    try {
      const res = await fetch('/api/admin/orders');
      const orders = await res.json();

      window.allAdminOrders = orders; // เก็บข้อมูลทั้งหมดไว้สำหรับกรอง
      window.renderAdminOrdersLists(orders);
    } catch (err) {
      console.error('Fetch admin orders error:', err);
      if (orderContainer) orderContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#ff334b;">เกิดข้อผิดพลาด</div>';
      if (historyTbody) historyTbody.innerHTML = `<tr><td colspan="12" style="padding: 20px; text-align: center; color: #ff334b;">เกิดข้อผิดพลาดในการโหลด</td></tr>`;
    }
  };

  // ฟังก์ชันเรนเดอร์รายการออเดอร์และตาราง
  window.renderAdminOrdersLists = function(orders) {
    const orderContainer = document.getElementById('adminOrdersContainer');
    const historyTbody = document.getElementById('adminSalesHistoryTableBody');
    const historyTfoot = document.getElementById('adminSalesHistoryTableFooter');

    if (!Array.isArray(orders) || orders.length === 0) {
      if (orderContainer) orderContainer.innerHTML = '<div style="text-align:center; padding:50px 20px; color:#888;"><p style="font-size:14px; color:#aaa;">ไม่มีออเดอร์ค้างจัดการ</p></div>';
      if (historyTbody) historyTbody.innerHTML = `<tr><td colspan="12" style="padding: 20px; text-align: center; color: #888;">ไม่พบประวัติการขายที่ตรงกับเงื่อนไข</td></tr>`;
      if (historyTfoot) historyTfoot.innerHTML = '';
      return;
    }

    const activeOrders = orders.filter(o => o.shipping_status !== 'delivered');

    // ฝั่งขวา: จัดการออเดอร์ที่ยังไม่เสร็จ
    if (orderContainer) {
      if (activeOrders.length === 0) {
        orderContainer.innerHTML = '<div style="text-align:center; padding:50px 20px; color:#888;"><p style="font-size:14px; color:#aaa;">ไม่มีออเดอร์ค้างจัดการ</p></div>';
      } else {
        orderContainer.innerHTML = activeOrders.map(o => {
          const status = o.shipping_status || 'preparing';
          const trackingNo = o.tracking_number || ('TH' + String(o.id).padStart(6, '0') + 'BOX');
          const orderDate = formatToThaiTime(o.created_at);
          const itemCount = o.total_items || 1;
          const totalAmount = Number(o.total || 0).toLocaleString();
          const rawName = o.buyer_name || o.buyer_username;
          const buyerName = rawName ? `<span style="color:#38bdf8; font-weight:bold;">${rawName}</span>` : `<span style="color:#aaa;">ลูกค้าทั่วไป</span>`;

          return `
            <div style="background:#262633; border:1px solid #3f3f52; border-radius:10px; padding:12px; margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <div>
                  <b style="color:#fff; font-size:13px;">#BOX-${o.id}</b> | ลูกค้า: ${buyerName}
                  <div style="font-size:11px; color:#aaa;">สั่งเมื่อ: ${orderDate} (${itemCount} ชิ้น)</div>
                </div>
                <div style="text-align:right;">
                  <span style="color:#ff334b; font-weight:bold; font-size:14px;">฿${totalAmount}</span>
                </div>
              </div>

              <div style="background:#181820; padding:8px; border-radius:6px; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                  <label style="font-size:11px; color:#ccc;">สถานะ:</label>
                  <select id="adminStatus_${o.id}" style="flex:1; padding:4px; border-radius:4px; background:#2a2a38; color:#fff; border:1px solid #444; font-size:11px; cursor:pointer;">
                    <option value="preparing" ${status === 'preparing' ? 'selected' : ''}>📦 เตรียมจัดส่ง</option>
                    <option value="shipping" ${status === 'shipping' ? 'selected' : ''}>🚚 กำลังจัดส่ง</option>
                    <option value="delivered" ${status === 'delivered' ? 'selected' : ''}>✅ จัดส่งสำเร็จ</option>
                  </select>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                  <label style="font-size:11px; color:#ccc;">Tracking:</label>
                  <input type="text" id="adminTracking_${o.id}" value="${trackingNo}" style="flex:1; padding:4px 6px; border-radius:4px; background:#2a2a38; color:#fff; border:1px solid #444; font-size:11px;">
                </div>

                <button onclick="window.saveAdminOrderStatus(${o.id})" style="background:#10b981; color:#fff; border:none; padding:6px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:11px;">
                  💾 บันทึกอัปเดตสถานะ
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // ฝั่งซ้าย: ตารางประวัติการขาย
    if (historyTbody) {
      let totalQtySum = 0;
      let totalPriceSum = 0;
      let totalProfitSum = 0;

      historyTbody.innerHTML = orders.map((o, index) => {
        const totalAmount = Number(o.total || 0);
        const itemCount = Number(o.total_items || 1);
        const discount = 0.00;
        
        const vat = totalAmount * 7 / 107; 
        const netTotal = totalAmount; 
        const profit = (totalAmount - vat) * 0.25; 

        totalQtySum += itemCount;
        totalPriceSum += netTotal;
        totalProfitSum += profit;

        const rawName = o.buyer_name || o.buyer_username || 'ลูกค้าทั่วไป';
        const formattedDateTime = formatToThaiTime(o.created_at);
        const rowBg = index % 2 === 0 ? '#181822' : '#121216';

        const statusText = o.shipping_status === 'delivered' ? '✅ สำเร็จ' : (o.shipping_status === 'shipping' ? '🚚 ขนส่ง' : '📦 เตรียม');

        return `
          <tr style="background: ${rowBg}; border-bottom: 1px solid #2a2a38; transition: background 0.2s;" onmouseover="this.style.background='#252535'" onmouseout="this.style.background='${rowBg}'">
            <td style="padding: 8px 6px; text-align: center; color: #aaa; border-right: 1px solid #222;">${index + 1}</td>
            <td style="padding: 8px 8px; color: #fff; font-weight: bold; border-right: 1px solid #222;">#BOX-${o.id}</td>
            <td style="padding: 8px 8px; color: #38bdf8; border-right: 1px solid #222;">${rawName}</td>
            <td style="padding: 8px 6px; text-align: center; color: #ccc; border-right: 1px solid #222;">${itemCount}</td>
            <td style="padding: 8px 8px; text-align: right; color: #ccc; border-right: 1px solid #222;">฿${totalAmount.toLocaleString()}</td>
            <td style="padding: 8px 8px; text-align: right; color: #aaa; border-right: 1px solid #222;">฿${discount.toFixed(2)}</td>
            <td style="padding: 8px 8px; text-align: right; color: #aaa; border-right: 1px solid #222;">฿${vat.toFixed(2)}</td>
            <td style="padding: 8px 8px; text-align: right; color: #ff334b; font-weight: bold; border-right: 1px solid #222;">฿${netTotal.toLocaleString()}</td>
            <td style="padding: 8px 8px; text-align: right; color: #10b981; border-right: 1px solid #222;">฿${profit.toFixed(2)}</td>
            <td style="padding: 8px 8px; text-align: center; color: #aaa; font-size: 10px; border-right: 1px solid #222;">${formattedDateTime}</td>
            <td style="padding: 8px 6px; text-align: center;">
              <button onclick="window.openOrderEditModal(${o.id}, '${o.shipping_status || 'preparing'}', '${o.tracking_number || ''}')" title="จัดการออเดอร์" style="background:#2563eb; color:#fff; border:none; padding:4px 6px; border-radius:4px; cursor:pointer; font-size:10px;">📋 ${statusText}</button>
            </td>
          </tr>
        `;
      }).join('');

      if (historyTfoot) {
        historyTfoot.innerHTML = `
          <tr style="background: #262633; font-weight: bold; border-top: 2px solid #444; color: #fff;">
            <td colspan="3" style="padding: 8px; text-align: right;">รวมทั้งหมด</td>
            <td style="padding: 8px; text-align: center; color: #38bdf8;">${totalQtySum}</td>
            <td colspan="3" style="padding: 8px;"></td>
            <td style="padding: 8px; text-align: right; color: #ff334b;">฿${totalPriceSum.toLocaleString()}</td>
            <td style="padding: 8px; text-align: right; color: #10b981;">฿${totalProfitSum.toFixed(2)}</td>
            <td colspan="2" style="padding: 8px; text-align: center; color: #aaa; font-size: 11px;">พบ ${orders.length} รายการ</td>
          </tr>
        `;
      }
    }
  };

  // ฟังก์ชันกรองข้อมูลออเดอร์ (กดปุ่มค้นหา)
  window.filterAdminOrders = function() {
    if (!window.allAdminOrders) return;
    const dVal = document.getElementById('filterDay').value;
    const mVal = document.getElementById('filterMonth').value;
    const yVal = document.getElementById('filterYear').value;
    const statusVal = document.getElementById('filterStatus').value;

    let filtered = window.allAdminOrders.filter(o => {
      let formattedDate = formatToThaiTime(o.created_at); // YYYY-MM-DD HH:MM:SS
      let matchDay = true, matchMonth = true, matchYear = true, matchStatus = true;

      if (yVal) matchYear = formattedDate.startsWith(yVal);
      if (mVal) matchMonth = formattedDate.substring(5, 7) === mVal;
      if (dVal) matchDay = formattedDate.substring(8, 10) === dVal;
      if (statusVal !== 'all') matchStatus = (o.shipping_status || 'preparing') === statusVal;

      return matchDay && matchMonth && matchYear && matchStatus;
    });

    window.renderAdminOrdersLists(filtered);
  };

  // ฟังก์ชันล้างค่าตัวกรองกลับมาแสดงทั้งหมด
  window.resetAdminFilter = function() {
    document.getElementById('filterDay').value = '';
    document.getElementById('filterMonth').value = '';
    document.getElementById('filterYear').value = '';
    document.getElementById('filterStatus').value = 'all';
    if (window.allAdminOrders) {
      window.renderAdminOrdersLists(window.allAdminOrders);
    }
  };

  // โหลดข้อมูลเริ่มต้น
  window.loadAdminOrdersData();
};

// ฟังก์ชันเปิด Pop-up จัดการออเดอร์
window.openOrderEditModal = function(orderId, currentStatus, currentTracking) {
  const existingSubModal = document.getElementById('orderEditSubModal');
  if (existingSubModal) existingSubModal.remove();

  const subModalHtml = `
    <div id="orderEditSubModal" style="display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999999; align-items:center; justify-content:center; padding:20px;">
      <div style="background:#262633; color:#fff; width:400px; max-width:95%; border-radius:12px; padding:20px; border:1px solid #444; box-shadow:0 10px 25px rgba(0,0,0,0.5); font-family:sans-serif;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px;">
          <h4 style="margin:0; font-size:16px; color:#ff334b;">📦 จัดการออเดอร์ #BOX-${orderId}</h4>
          <button onclick="document.getElementById('orderEditSubModal').remove()" style="background:none; border:none; color:#aaa; font-size:20px; cursor:pointer;">✕</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; font-size:13px;">
          <div>
            <label style="color:#ccc; display:block; margin-bottom:4px;">เปลี่ยนสถานะ:</label>
            <select id="subStatus_${orderId}" style="width:100%; padding:8px; border-radius:6px; background:#181820; color:#fff; border:1px solid #555; cursor:pointer;">
              <option value="preparing" ${currentStatus === 'preparing' ? 'selected' : ''}>📦 เตรียมจัดส่ง</option>
              <option value="shipping" ${currentStatus === 'shipping' ? 'selected' : ''}>🚚 กำลังจัดส่ง</option>
              <option value="delivered" ${currentStatus === 'delivered' ? 'selected' : ''}>✅ จัดส่งสำเร็จ</option>
            </select>
          </div>

          <div>
            <label style="color:#ccc; display:block; margin-bottom:4px;">เลขพัสดุ (Tracking):</label>
            <input type="text" id="subTracking_${orderId}" value="${currentTracking}" style="width:100%; padding:8px; border-radius:6px; background:#181820; color:#fff; border:1px solid #555; box-sizing:border-box;">
          </div>

          <button onclick="window.saveSubOrderStatus(${orderId})" style="background:#10b981; color:#fff; border:none; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer; margin-top:8px;">
            💾 บันทึกการแก้ไข
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', subModalHtml);
};

// ฟังก์ชันบันทึกข้อมูลจาก Pop-up
window.saveSubOrderStatus = async function(orderId) {
  const status = document.getElementById(`subStatus_${orderId}`).value;
  const trackingNumber = document.getElementById(`subTracking_${orderId}`)?.value || '';

  try {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipping_status: status, tracking_number: trackingNumber })
    });
    
    if (res.ok) {
      alert('อัปเดตข้อมูลสำเร็จ!');
      document.getElementById('orderEditSubModal').remove();
      window.openAdminModal();
    } else {
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  } catch (err) {
    console.error('Save order status error:', err);
    alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
  }
};

// ฟังก์ชันลบประวัติออเดอร์
window.deleteAdminOrder = async function(orderId) {
  if (!confirm(`ต้องการลบออเดอร์ #BOX-${orderId} ออกจากประวัติการขายใช่หรือไม่?`)) return;

  try {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      alert('ลบประวัติออเดอร์สำเร็จ!');
      window.openAdminModal(); // รีเฟรชตารางใหม่
    } else {
      alert('ไม่สามารถลบออเดอร์ได้ (ตรวจสอบเส้นทาง API /api/admin/orders/:id ใน backend)');
    }
  } catch (err) {
    console.error('Delete order error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

// --- 2. ฟังก์ชันบันทึกสถานะ (Global) ---
window.saveAdminOrderStatus = async function(orderId) {
  const statusSelect = document.getElementById(`adminStatus_${orderId}`);
  const trackingInput = document.getElementById(`adminTracking_${orderId}`);
  
  if (!statusSelect) return;

  const shipping_status = statusSelect.value;
  const tracking_number = trackingInput ? trackingInput.value : '';

  try {
    const res = await fetch('/api/admin/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, shipping_status, tracking_number })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('บันทึกสถานะและส่งแจ้งเตือนให้ลูกค้าเรียบร้อยแล้วครับ!');
      
      // 🔄 อัปเดตข้อมูลฝั่งลูกค้าทันทีถ้าหน้าต่างประวัติกำลังเปิดอยู่
      if (currentUser && currentUser.id) {
        const clientRes = await fetch(`/api/orders?user_id=${currentUser.id}`);
        const clientOrders = await clientRes.json();
        if (Array.isArray(clientOrders)) {
          window.cachedOrdersList = clientOrders;
          if (typeof window.renderOrdersList === 'function') {
            window.renderOrdersList();
          }
        }
      }

      // 🛠️ แก้ไข: ตัดการเรียกซ้ำซ้อนออก เพื่อไม่ให้ Event ไปค้างตีกันกับปุ่มอื่น
      // (ถ้าต้องการรีเฟรชข้อมูลหลังบ้าน ให้ใช้วิธีดึงข้อมูลมาอัปเดต Container แทนการเปิด Modal ซ้ำ)
      const container = document.getElementById('adminOrdersContainer');
      if (container && typeof window.openAdminModal === 'function') {
        // อัปเดตข้อมูลเฉพาะภายในโดยไม่ต้องเปิดปิด Modal ซ้ำ
        // หรือปล่อยให้หน้าต่างเปิดค้างไว้ตามปกติเพื่อให้แอดมินเช็กงานต่อได้เลย
      }

    } else {
      alert(data.error || 'ไม่สามารถอัปเดตสถานะได้');
    }
  } catch (err) {
    console.error('Update status error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
  }
};

// --- สร้างปุ่มจัดการหลังบ้านแอดมินอัตโนมัติ ---
window.injectAdminButton = function() {
  try {
    const isAdmin = (typeof currentUser !== 'undefined' && currentUser) && 
                    (currentUser.username === 'Yibsee_25' || currentUser.id === 1 || currentUser.role === 'admin');
    
    let adminBtn = document.getElementById('floatingAdminBtn');
    if (isAdmin) {
      if (!adminBtn) {
        adminBtn = document.createElement('button');
        adminBtn.id = 'floatingAdminBtn';
        adminBtn.innerHTML = '⚙️ จัดการหลังบ้าน (แอดมิน)';
        adminBtn.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #ff334b; color: #fff; border: none; padding: 12px 20px; border-radius: 30px; font-weight: bold; font-size: 14px; cursor: pointer; box-shadow: 0 4px 15px rgba(255,51,75,0.4); z-index: 999998; transition: 0.2s;';
        
        adminBtn.onmouseover = function() { this.style.transform = 'scale(1.05)'; };
        adminBtn.onmouseout = function() { this.style.transform = 'scale(1)'; };
        
        adminBtn.onclick = function() {
          if (typeof window.openAdminModal === 'function') {
            window.openAdminModal();
          } else {
            alert('กำลังโหลดระบบหลังบ้าน...');
          }
        };
        document.body.appendChild(adminBtn);
      } else {
        adminBtn.style.display = 'block';
      }
    } else {
      if (adminBtn) {
        adminBtn.style.display = 'none';
      }
    }
  } catch (e) {
    console.error('injectAdminButton error:', e);
  }
};

  // --- ฟังก์ชันเปิด-ปิด และโหลดข้อมูลในกระดิ่งแจ้งเตือน (เวอร์ชันสมบูรณ์ไม่เด้งซ้ำ) ---
window.toggleNotifDropdown = async function() {
  const dropdown = document.getElementById('notifDropdown');
  if (!dropdown) return;

  const isOpen = dropdown.style.display === 'block';
  dropdown.style.display = isOpen ? 'none' : 'block';

  if (!isOpen && typeof currentUser !== 'undefined' && currentUser && currentUser.id) {
    const notifList = document.getElementById('notifList');
    const notifBadge = document.getElementById('notifBadge');
    
    if (notifList) {
      notifList.innerHTML = '<div style="padding:15px; text-align:center; color:#aaa; font-size:12px;">กำลังโหลดการแจ้งเตือน...</div>';
      
      try {
        const res = await fetch(`/api/messages?user_id=${currentUser.id}`);
        const messages = await res.json();

        if (!Array.isArray(messages) || messages.length === 0) {
          notifList.innerHTML = '<div style="padding:20px; text-align:center; color:#aaa; font-size:12px;">ยังไม่มีการแจ้งเตือนในขณะนี้</div>';
          if (notifBadge) notifBadge.style.display = 'none';
          return;
        }

        // กรองเอาเฉพาะข้อความที่ยังไม่ได้อ่าน (is_read === 0 หรือยังไม่มีค่า)
        const unreadMessages = messages.filter(m => !m.is_read);

        // แสดงจำนวนแจ้งเตือนที่ปุ่มกระดิ่งเฉพาะที่ยังไม่อ่าน
        if (notifBadge) {
          if (unreadMessages.length > 0) {
            notifBadge.innerText = unreadMessages.length;
            notifBadge.style.display = 'inline-block';
          } else {
            notifBadge.style.display = 'none';
          }
        }

        // แสดงรายการข้อความทั้งหมด (หรือจะโชว์เฉพาะ unread ก็ได้ครับ แต่นี่โชว์ทั้งหมดแต่แยกสถานะ)
        notifList.innerHTML = messages.map(m => `
          <div class="notif-item ${m.is_read ? '' : 'unread'}" style="padding:12px 14px; border-bottom:1px solid #333; display:flex; gap:10px; align-items:flex-start; opacity: ${m.is_read ? '0.6' : '1'};">
            <div class="notif-icon" style="font-size:16px;">📦</div>
            <div class="notif-content" style="flex:1;">
              <p style="margin:0 0 4px 0; color:#fff; font-size:12px; line-height:1.4;">${m.message}</p>
              <span class="notif-time" style="font-size:10px; color:#888;">${m.created_at || 'เมื่อสักครู่'}</span>
            </div>
          </div>
        `).join('');

        // 🚀 จุดสำคัญ: พอกดเปิดดูกล่องแจ้งเตือนแล้ว ให้ส่ง API ไปอัปเดตหลังบ้านทันทีว่าอ่านหมดแล้ว
        await fetch('/api/messages/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: currentUser.id })
        });

      } catch (err) {
        console.error('Failed to load notifications:', err);
        notifList.innerHTML = '<div style="padding:15px; text-align:center; color:#ff334b; font-size:12px;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
      }
    }
  }
};

// ฟังก์ชันเช็กแจ้งเตือนข้อความใหม่แบบกรองเฉพาะที่ยังไม่อ่าน
async function checkUnreadMessages() {
  if (!currentUser) return;
  try {
    const res = await fetch(`/api/messages?user_id=${currentUser.id}`);
    const messages = await res.json();
    
    // กรองเอาเฉพาะข้อความที่ยังไม่ได้อ่าน (is_read === 0 หรือ undefined)
    const unreadMessages = messages.filter(m => !m.is_read);
    
    const badge = document.getElementById('notificationBadge');
    if (badge) {
      if (unreadMessages.length > 0) {
        badge.style.display = 'inline-block';
        badge.innerText = unreadMessages.length;
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Check notification error:', err);
  }
}

// ฟังก์ชันกดอ่านทั้งหมดเพื่อเคลียร์แจ้งเตือนแบบถาวร
window.markAllMessagesAsRead = async function() {
  if (!currentUser) return;
  
  try {
    // 1. ส่งคำสั่งไปอัปเดตในฐานข้อมูลหลังบ้าน
    await fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id })
    });

    // 2. ซ่อนปุ่มแจ้งเตือนบนหน้าจอทันที
    const badge = document.getElementById('notificationBadge');
    if (badge) badge.style.display = 'none';

    // 3. รีโหลดรายการข้อความ
    if (typeof window.loadMessages === 'function') {
      window.loadMessages();
    }
  } catch (err) {
    console.error('Mark read error:', err);
  }
};

// --- ฟังก์ชันอัปเดตสถานะทันทีเมื่อเลือกจาก Dropdown (ตามโค้ด snippet ของเฮีย) ---
window.setOrderShippingStatus = async function(orderId, newStatus) {
  try {
    const trackingInput = document.getElementById(`adminTracking_${orderId}`);
    const tracking_number = trackingInput ? trackingInput.value : ('TH' + String(orderId).padStart(6, '0') + 'BOX');

    const res = await fetch('/api/admin/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        order_id: orderId, 
        shipping_status: newStatus, 
        tracking_number: tracking_number 
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      console.log(`อัปเดตสถานะออเดอร์ #${orderId} เป็น ${newStatus} สำเร็จ`);
      
      // 🔄 สั่งดึงข้อมูลออเดอร์ล่าสุดมาอัปเดตหน้าจอทันทีแบบเรียลไทม์!
      if (currentUser && currentUser.id) {
        const updateRes = await fetch(`/api/orders?user_id=${currentUser.id}`);
        const updatedOrders = await updateRes.json();
        if (Array.isArray(updatedOrders)) {
          window.cachedOrdersList = updatedOrders;
          window.renderOrdersList(); // เรนเดอร์หน้าจอใหม่ทันที
        }
      }
    } else {
      alert(data.error || 'ไม่สามารถอัปเดตสถานะได้');
    }
  } catch (err) {
    console.error('Set order status error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
  }
};

window.markAllMessagesAsRead = async function() {
  if (!currentUser) return;
  
  try {
    // 1. ส่งคำสั่งไปอัปเดตหลังบ้าน
    await fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id })
    });

    // 2. ซ่อนปุ่มแจ้งเตือนหรือเคลียร์ตัวเลขบนหน้าจอ
    const badge = document.getElementById('notificationBadge');
    if (badge) badge.style.display = 'none';

    // 3. โหลดรายการข้อความใหม่ (ซึ่งตอนนี้จะเป็นสถานะอ่านแล้วทั้งหมด)
    if (typeof window.loadMessages === 'function') {
      window.loadMessages();
    }
  } catch (err) {
    console.error('Mark read error:', err);
  }
};

// --- ฟังก์ชันบันทึกอัตโนมัติทันทีที่เปลี่ยนค่า (ตัดปัญหาดีดกลับ) ---
window.instantUpdateStatus = async function(orderId) {
  const statusSelect = document.getElementById(`adminStatus_${orderId}`);
  const trackingInput = document.getElementById(`adminTracking_${orderId}`);
  
  if (!statusSelect) return;

  const shipping_status = statusSelect.value;
  const tracking_number = trackingInput ? trackingInput.value : '';

  try {
    const res = await fetch('/api/admin/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, shipping_status, tracking_number })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      console.log(`อัปเดตออเดอร์ #${orderId} สำเร็จ`);
    } else {
      alert(data.error || 'ไม่สามารถอัปเดตสถานะได้');
    }
  } catch (err) {
    console.error('Instant update error:', err);
  }
};

// --- ฟังก์ชันเช็กกระดิ่งแจ้งเตือนอัตโนมัติแบบเรียลไทม์ ---
// ฟังก์ชันเช็กจำนวนข้อความใหม่มาแสดงที่ปุ่มกระดิ่งตลอดเวลา (แบบไม่ลบทิ้งจนกว่าจะกดดู)
async function checkNewNotificationsCount() {
  if (!currentUser || !currentUser.id) return;
  
  try {
    const res = await fetch(`/api/messages?user_id=${currentUser.id}`);
    const messages = await res.json();
    
    const notifBadge = document.getElementById('notifBadge') || document.getElementById('notificationBadge');
    if (notifBadge) {
      if (Array.isArray(messages) && messages.length > 0) {
        notifBadge.innerText = messages.length;
        notifBadge.style.display = 'inline-block';
      } else {
        notifBadge.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Check count error:', err);
  }
}

// สั่งให้เช็กจำนวนทันทีที่เข้าเว็บ
window.addEventListener('DOMContentLoaded', checkNewNotificationsCount);

// ตัวอย่างการกรองออเดอร์ตามแท็บที่ลูกค้ากด
window.filterMyOrders = function(statusType) {
  const orderCards = document.querySelectorAll('.my-order-item-card');
  
  orderCards.forEach(card => {
    const cardStatus = card.getAttribute('data-status'); 
    if (statusType === 'all' || cardStatus === statusType) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
};

// 🛠️ สั่งรันเช็กสถานะปุ่มแอดมินอัตโนมัติทุกๆ 1 วินาที (อยู่นอกฟังก์ชันอย่างอิสระ)
setInterval(window.injectAdminButton, 1000);
