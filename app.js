import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

/* ==========================================================
   1) ISI KONFIGURASI FIREBASE ANDA DI SINI
   Firebase Console > Project settings > Your apps > Web app
   ========================================================== */
const firebaseConfig = {
  apiKey: "GANTI_API_KEY",
  authDomain: "GANTI_PROJECT.firebaseapp.com",
  projectId: "GANTI_PROJECT_ID",
  storageBucket: "GANTI_PROJECT.firebasestorage.app",
  messagingSenderId: "GANTI_SENDER_ID",
  appId: "GANTI_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0,10);
const timeNow = () => new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date());
const dateTimeNow = () => new Date().toISOString();

let currentProfile = null;
let allEmployees = [];
let allAttendance = [];
let allLeaves = [];

function show(id){$(id).classList.remove("hidden")}
function hide(id){$(id).classList.add("hidden")}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

$("loginForm").addEventListener("submit", async e=>{
  e.preventDefault();
  $("loginError").textContent="";
  try{
    await signInWithEmailAndPassword(auth,$("loginEmail").value,$("loginPassword").value);
  }catch(err){$("loginError").textContent="Login gagal. Periksa email dan password."}
});
$("logoutBtn").addEventListener("click",()=>signOut(auth));
$("printBtn").addEventListener("click",()=>window.print());
$("addEmployeeBtn").addEventListener("click",()=>show("employeeModal"));
$("closeModal").addEventListener("click",()=>hide("employeeModal"));
$("reportDate").value=today();
$("leaveDate").value=today();

setInterval(()=>{
  const clock = new Date().toLocaleString("id-ID",{dateStyle:"full",timeStyle:"medium"});
  if($("liveClock")) $("liveClock").textContent=clock;
  if($("hrClock")) $("hrClock").textContent=clock;
},1000);

onAuthStateChanged(auth, async user=>{
  if(!user){hide("dashboardPage");show("loginPage");return}
  try{
    const snap=await getDoc(doc(db,"users",user.uid));
    if(!snap.exists()){await signOut(auth);$("loginError").textContent="Profil pengguna belum dibuat oleh HRD.";return}
    currentProfile={uid:user.uid,...snap.data()};
    hide("loginPage");show("dashboardPage");
    $("currentUser").textContent=currentProfile.name||user.email;
    $("userRoleBadge").textContent=currentProfile.role==="hrd"?"HRD":"Karyawan";
    if(currentProfile.role==="hrd"){hide("employeeView");show("hrView");await loadHRD()}
    else{hide("hrView");show("employeeView");await loadEmployee()}
  }catch(err){console.error(err);alert("Gagal memuat data. Pastikan konfigurasi Firebase sudah benar.")}
});

async function loadEmployee(){
  $("employeeName").textContent=currentProfile.name||"Karyawan";
  const q=query(collection(db,"attendance"),where("uid","==",currentProfile.uid),orderBy("date","desc"));
  const snap=await getDocs(q);
  const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
  renderMyAttendance(rows);
  const leaves=await getDocs(query(collection(db,"leaves"),where("uid","==",currentProfile.uid),orderBy("createdAt","desc")));
  renderMyLeaves(leaves.docs.map(d=>({id:d.id,...d.data()})));
  const rec=rows.find(x=>x.date===today());
  $("todayIn").textContent=rec?.checkIn||"-";
  $("todayOut").textContent=rec?.checkOut||"-";
  $("todayStatus").textContent=rec?.checkOut?"Selesai bekerja":rec?.checkIn?"Sedang bekerja":"Belum absen";
  $("checkInBtn").disabled=!!rec?.checkIn;
  $("checkOutBtn").disabled=!rec?.checkIn||!!rec?.checkOut;
}
function renderMyAttendance(rows){
  $("myAttendanceBody").innerHTML=rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.checkIn||"-")}</td><td>${esc(r.checkOut||"-")}</td><td>${esc(r.status||"Hadir")}</td></tr>`).join("")||`<tr><td colspan="4">Belum ada data.</td></tr>`;
}
function renderMyLeaves(rows){
  $("myLeaveBody").innerHTML=rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.type)}</td><td>${esc(r.reason)}</td><td>${esc(r.status||"Menunggu")}</td></tr>`).join("")||`<tr><td colspan="4">Belum ada pengajuan.</td></tr>`;
}

$("checkInBtn").addEventListener("click",async()=>{
  const id=`${currentProfile.uid}_${today()}`;
  try{
    await setDoc(doc(db,"attendance",id),{
      uid:currentProfile.uid,name:currentProfile.name,email:currentProfile.email||auth.currentUser.email,
      date:today(),checkIn:timeNow(),checkOut:"",status:"Hadir",updatedAt:dateTimeNow()
    },{merge:true});
    $("attendanceMessage").textContent="Absensi masuk berhasil disimpan.";
    await loadEmployee();
  }catch(e){console.error(e);$("attendanceMessage").textContent="Gagal menyimpan absensi."}
});
$("checkOutBtn").addEventListener("click",async()=>{
  const id=`${currentProfile.uid}_${today()}`;
  try{
    await updateDoc(doc(db,"attendance",id),{checkOut:timeNow(),updatedAt:dateTimeNow()});
    $("attendanceMessage").textContent="Absensi pulang berhasil disimpan.";
    await loadEmployee();
  }catch(e){console.error(e);$("attendanceMessage").textContent="Gagal menyimpan absensi pulang."}
});
$("leaveForm").addEventListener("submit",async e=>{
  e.preventDefault();
  try{
    await addDoc(collection(db,"leaves"),{
      uid:currentProfile.uid,name:currentProfile.name,email:currentProfile.email||auth.currentUser.email,
      type:$("leaveType").value,date:$("leaveDate").value,reason:$("leaveReason").value,
      status:"Menunggu",createdAt:dateTimeNow()
    });
    $("leaveForm").reset();$("leaveDate").value=today();alert("Pengajuan berhasil dikirim.");await loadEmployee();
  }catch(e){alert("Gagal mengirim pengajuan.")}
});
$("exportMyBtn").addEventListener("click",async()=>{
  const q=query(collection(db,"attendance"),where("uid","==",currentProfile.uid),orderBy("date","desc"));
  const snap=await getDocs(q); downloadCSV("riwayat-absensi.csv",snap.docs.map(d=>d.data()),["date","name","email","checkIn","checkOut","status"]);
});

async function loadHRD(){
  const empSnap=await getDocs(collection(db,"users"));
  allEmployees=empSnap.docs.map(d=>({uid:d.id,...d.data()}));
  const attSnap=await getDocs(query(collection(db,"attendance"),orderBy("date","desc")));
  allAttendance=attSnap.docs.map(d=>({id:d.id,...d.data()}));
  const leaveSnap=await getDocs(query(collection(db,"leaves"),orderBy("createdAt","desc")));
  allLeaves=leaveSnap.docs.map(d=>({id:d.id,...d.data()}));
  renderEmployees();renderAllAttendance();renderAllLeaves();updateStats();
}
function renderEmployees(){
  $("employeeBody").innerHTML=allEmployees.map(e=>`<tr><td>${esc(e.name)}</td><td>${esc(e.email)}</td><td>${esc(e.position||"-")}</td><td>${esc(e.role)}</td></tr>`).join("")||`<tr><td colspan="4">Belum ada data.</td></tr>`;
}
function renderAllAttendance(){
  const date=$("reportDate").value, term=$("searchEmployee").value.toLowerCase();
  const rows=allAttendance.filter(r=>(!date||r.date===date)&&(`${r.name} ${r.email}`.toLowerCase().includes(term)));
  $("allAttendanceBody").innerHTML=rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.name)}</td><td>${esc(r.email)}</td><td>${esc(r.checkIn||"-")}</td><td>${esc(r.checkOut||"-")}</td><td>${esc(r.status||"Hadir")}</td></tr>`).join("")||`<tr><td colspan="6">Tidak ada data.</td></tr>`;
}
function renderAllLeaves(){
  $("allLeaveBody").innerHTML=allLeaves.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.name)}</td><td>${esc(r.type)}</td><td>${esc(r.reason)}</td><td>${esc(r.status)}</td><td>${r.status==="Menunggu"?`<button class="btn success" onclick="approveLeave('${r.id}')">Setujui</button> <button class="btn danger" onclick="rejectLeave('${r.id}')">Tolak</button>`:"-"}</td></tr>`).join("")||`<tr><td colspan="6">Belum ada pengajuan.</td></tr>`;
}
function updateStats(){
  const t=today();
  const employeeCount=allEmployees.filter(e=>e.role==="employee").length;
  const present=new Set(allAttendance.filter(a=>a.date===t&&a.checkIn).map(a=>a.uid)).size;
  const leave=new Set(allLeaves.filter(a=>a.date===t&&a.status==="Disetujui").map(a=>a.uid)).size;
  $("statEmployees").textContent=employeeCount;
  $("statPresent").textContent=present;
  $("statAbsent").textContent=Math.max(0,employeeCount-present-leave);
  $("statLeave").textContent=leave;
}
$("reportDate").addEventListener("change",renderAllAttendance);
$("searchEmployee").addEventListener("input",renderAllAttendance);
$("exportAllBtn").addEventListener("click",()=>downloadCSV("laporan-absensi.csv",allAttendance,["date","name","email","checkIn","checkOut","status"]));

window.approveLeave=async id=>{await updateDoc(doc(db,"leaves",id),{status:"Disetujui",reviewedAt:dateTimeNow(),reviewedBy:currentProfile.uid});await loadHRD()};
window.rejectLeave=async id=>{await updateDoc(doc(db,"leaves",id),{status:"Ditolak",reviewedAt:dateTimeNow(),reviewedBy:currentProfile.uid});await loadHRD()};

$("employeeForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const uid=$("newUid").value.trim();
  await setDoc(doc(db,"users",uid),{
    name:$("newName").value.trim(),email:$("newEmail").value.trim(),
    position:$("newPosition").value.trim(),role:$("newRole").value,createdAt:dateTimeNow()
  });
  hide("employeeModal");e.target.reset();await loadHRD();
});

function downloadCSV(filename,rows,cols){
  const header=cols.join(",");
  const body=rows.map(r=>cols.map(c=>`"${String(r[c]??"").replaceAll('"','""')}"`).join(",")).join("\n");
  const blob=new Blob(["\ufeff"+header+"\n"+body],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href);
}
