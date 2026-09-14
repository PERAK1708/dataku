import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBqEzUbU6tGIjpavONyDjplt5spjE1KhBc",
  authDomain: "smartdr-b1a70.firebaseapp.com",
  projectId: "smartdr-b1a70",
  storageBucket: "smartdr-b1a70.firebasestorage.app",
  messagingSenderId: "238188993070",
  appId: "1:238188993070:web:68d1eb88f4a53285589dbf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentUserRole = "user";
let currentCategoryFilter = "all";

// Modal Elements
const modal = document.getElementById("login-modal");
const btnShowLogin = document.getElementById("btn-show-login");
const btnCloseModal = document.getElementById("close-modal");

if (btnShowLogin) btnShowLogin.onclick = () => modal.style.display = "flex";
if (btnCloseModal) btnCloseModal.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

// Element Form & Toggle
const adminPanel = document.getElementById("admin-panel");
const btnToggleForm = document.getElementById("btn-toggle-form");

// Toggle Hide/Show Form
if (btnToggleForm && adminPanel) {
  btnToggleForm.onclick = () => {
    const isHidden = adminPanel.style.display === "none" || adminPanel.style.display === "";
    adminPanel.style.display = isHidden ? "block" : "none";
    btnToggleForm.textContent = isHidden ? "✖️ Tutup Form" : "➕ Tambah Tool Baru";
  };
}

// Login Handlers
const emailLoginForm = document.getElementById("email-login-form");
if (emailLoginForm) {
  emailLoginForm.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(
        auth, 
        document.getElementById("login-email").value, 
        document.getElementById("login-password").value
      );
      modal.style.display = "none";
    } catch (err) {
      alert("Gagal Login: " + err.message);
    }
  };
}

const btnGoogleLogin = document.getElementById("btn-google-login");
if (btnGoogleLogin) {
  btnGoogleLogin.onclick = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      modal.style.display = "none";
    } catch (err) {
      alert("Gagal Google Sign-In: " + err.message);
    }
  };
}

// Auth State
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("user-email").textContent = user.email;
    if (btnShowLogin) btnShowLogin.style.display = "none";
    document.getElementById("btn-logout").style.display = "inline-block";

    currentUserRole = "admin";
    document.getElementById("user-role").textContent = "ADMIN";

    // Tampilkan tombol toggle utama
    if (btnToggleForm) {
      btnToggleForm.parentElement.style.display = "block";
    }
  } else {
    document.getElementById("user-email").textContent = "Belum Login";
    document.getElementById("user-role").textContent = "";
    if (btnShowLogin) btnShowLogin.style.display = "inline-block";
    document.getElementById("btn-logout").style.display = "none";
    
    // Sembunyikan panel & tombol toggle saat logout
    document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    if (adminPanel) adminPanel.style.display = "none";
    currentUserRole = "user";
  }

  loadToolsData();
});

// Render Dynamic Tag Chat Cepat
function loadToolsData() {
  const toolsContainer = document.getElementById("tools-container");
  let toolsQuery = collection(db, "tools");

  if (currentCategoryFilter !== "all") {
    toolsQuery = query(collection(db, "tools"), where("category", "==", currentCategoryFilter));
  }

  onSnapshot(toolsQuery, (snapshot) => {
    toolsContainer.innerHTML = "";
    
    if (snapshot.empty) {
      toolsContainer.innerHTML = `<p style="color:#fff; font-size:0.9rem;">Belum ada tag/tools tersimpan.</p>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const tool = docSnap.data();
      const toolId = docSnap.id;
      const isAdmin = currentUserRole === 'admin' || currentUserRole === 'editor';

      const itemEl = document.createElement("div");
      itemEl.className = "tag-item";
      itemEl.innerHTML = `
        <button class="btn-tag btn-copy" data-content="${escapeHtml(tool.content || '')}">
          <span class="tag-hash">#</span>${escapeHtml(tool.title || 'Tanpa Judul')}
        </button>

        ${isAdmin ? `
          <div class="tag-actions">
            <button class="btn-tag-action btn-edit" data-id="${toolId}" data-title="${escapeHtml(tool.title || '')}" data-category="${escapeHtml(tool.category || '')}" data-content="${escapeHtml(tool.content || '')}">✏️</button>
            <button class="btn-tag-action btn-delete" data-id="${toolId}">🗑️</button>
          </div>
        ` : ''}
      `;
      toolsContainer.appendChild(itemEl);
    });

    attachCardEvents();
  }, (error) => {
    console.error("Firestore Error: ", error);
    toolsContainer.innerHTML = `<p style="color:red;">Gagal memuat data: ${error.message}</p>`;
  });
}

// Form Add/Edit
const form = document.getElementById("tools-form");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("tool-id").value;
    const title = document.getElementById("tool-title").value;
    const category = document.getElementById("tool-category").value;
    const content = document.getElementById("tool-content").value;

    try {
      if (id) {
        await updateDoc(doc(db, "tools", id), { title, category, content });
      } else {
        await addDoc(collection(db, "tools"), { title, category, content, createdAt: new Date() });
      }
      resetForm();
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    }
  });
}

// Events Attachment
function attachCardEvents() {
  document.querySelectorAll(".btn-copy").forEach(btn => {
    btn.onclick = () => {
      const textToCopy = btn.getAttribute("data-content");
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = "✅ Tersalin!";
        btn.classList.add("copied");

        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove("copied");
        }, 1200);
      }).catch(err => alert("Gagal menyalin: " + err));
    };
  });

  document.querySelectorAll(".btn-edit").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      document.getElementById("tool-id").value = btn.getAttribute("data-id");
      document.getElementById("tool-title").value = btn.getAttribute("data-title");
      document.getElementById("tool-category").value = btn.getAttribute("data-category");
      document.getElementById("tool-content").value = btn.getAttribute("data-content");

      document.getElementById("form-title").textContent = "Edit Tool";
      document.getElementById("btn-cancel").style.display = "inline-block";
      
      // Buka form otomatis saat tombol edit diklik
      if (adminPanel) adminPanel.style.display = "block";
      if (btnToggleForm) btnToggleForm.textContent = "✖️ Tutup Form";

      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });

  document.querySelectorAll(".btn-delete").forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      if (confirm("Yakin ingin menghapus tag ini?")) {
        await deleteDoc(doc(db, "tools", btn.getAttribute("data-id")));
      }
    };
  });
}

// Filter & Cancel
const filterCategory = document.getElementById("filter-category");
if (filterCategory) {
  filterCategory.addEventListener("change", (e) => {
    currentCategoryFilter = e.target.value;
    loadToolsData();
  });
}

const btnCancel = document.getElementById("btn-cancel");
if (btnCancel) btnCancel.onclick = resetForm;

function resetForm() {
  if (form) form.reset();
  document.getElementById("tool-id").value = "";
  document.getElementById("form-title").textContent = "Tambah Tools Baru";
  if (btnCancel) btnCancel.style.display = "none";
  
  // Sembunyikan panel form kembali setelah reset/batal/simpan
  if (adminPanel) adminPanel.style.display = "none";
  if (btnToggleForm) btnToggleForm.textContent = "➕ Tambah Tool Baru";
}

const btnLogout = document.getElementById("btn-logout");
if (btnLogout) btnLogout.onclick = () => signOut(auth);

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}