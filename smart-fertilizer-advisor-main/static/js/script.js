// ============================================
//   SMART FERTILIZER ADVISOR - Frontend JS
//   Full Tamil + Flask Backend
// ============================================

var currentLang = "en";
var lastResult  = {};

// ===== TAMIL TRANSLATION - updates ALL elements with data-en/data-ta =====
function setLang(lang) {
  currentLang = lang;
  document.getElementById("btnEn").classList.toggle("active", lang === "en");
  document.getElementById("btnTa").classList.toggle("active", lang === "ta");

  // Update ALL elements that have data-en and data-ta
  document.querySelectorAll("[data-en]").forEach(function(el) {
    el.textContent = lang === "ta" ? el.getAttribute("data-ta") : el.getAttribute("data-en");
  });

  // Update header title and tagline
  if (lang === "ta") {
    document.getElementById("appTitle").innerHTML   = "நுண்ணிய உர<br/><em>ஆலோசகர்</em>";
    document.getElementById("appTagline").textContent = "மண் தரவை உள்ளிடுங்கள் — AI பரிந்துரை உடனடியாக பெறுங்கள்";
  } else {
    document.getElementById("appTitle").innerHTML   = "Smart Fertilizer<br/><em>Advisor</em>";
    document.getElementById("appTagline").textContent = "Enter your soil data — get expert AI recommendation instantly";
  }
}

// ===== CROP SELECTION =====
function selectCrop(cropVal, el) {
  document.getElementById("crop").value = cropVal;
  document.querySelectorAll(".crop-chip").forEach(function(c) { c.classList.remove("active"); });
  el.classList.add("active");
  updateHealthMeter();
}

// ===== HEALTH METER =====
function updateHealthMeter() {
  var n  = parseInt(document.getElementById("n").value);
  var p  = parseInt(document.getElementById("p").value);
  var k  = parseInt(document.getElementById("k").value);
  var ph = parseInt(document.getElementById("ph").value) / 10;
  var nScore  = Math.min(100, (n / 120) * 100);
  var pScore  = Math.min(100, (p / 60)  * 100);
  var kScore  = Math.min(100, (k / 80)  * 100);
  var phScore = (ph >= 6 && ph <= 7.5) ? 100 : (ph < 5 || ph > 8.5) ? 20 : 60;
  var total   = Math.round((nScore + pScore + kScore + phScore) / 4);
  var color   = total < 40 ? "#e74c3c" : total < 70 ? "#f39c12" : "#27ae60";
  var deg     = Math.round((total / 100) * 360);
  document.getElementById("meterCircle").style.background =
    "conic-gradient(" + color + " " + deg + "deg, #e0e0e0 " + deg + "deg)";
  document.getElementById("meterVal").textContent = total;
  document.getElementById("meterVal").style.color = color;
}
updateHealthMeter();

// ===== WEATHER =====
function loadWeather() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(function(pos) {
    var lat = pos.coords.latitude;
    var lon = pos.coords.longitude;

    fetch("/weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: lat, lon: lon })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        document.getElementById("weatherTemp").textContent = data.temp + "°C";
        document.getElementById("weatherIcon").textContent = data.icon;
        document.getElementById("weatherDesc").textContent = data.desc;
        document.getElementById("weatherTip").textContent  = data.tip;
        document.getElementById("weatherAdviceBox").style.display = "block";
      }
    }).catch(function() {});

    fetch("/location-crops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: lat, lon: lon })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        document.getElementById("locationText").textContent  = "📍 " + data.city + ", " + data.state;
        document.getElementById("locationCrops").textContent = (currentLang === "ta" ? "பரிந்துரை: " : "Suggested: ") + data.crops;
      }
    }).catch(function() {});
  }, function() {
    document.getElementById("locationText").textContent = currentLang === "ta" ? "📍 இடம் கண்டறிய முடியவில்லை" : "📍 Location access denied";
  });
}
loadWeather();

// ===== MAIN RECOMMENDATION =====
async function getRecommendation() {
  var crop      = document.getElementById("crop").value;
  var soil      = document.getElementById("soil").value;
  var n         = parseInt(document.getElementById("n").value);
  var p         = parseInt(document.getElementById("p").value);
  var k         = parseInt(document.getElementById("k").value);
  var ph        = parseFloat((document.getElementById("ph").value / 10).toFixed(1));
  var rain      = document.getElementById("rain").value;
  var irrig     = document.getElementById("irrig").value;
  var stage     = document.getElementById("stage").value;
  var prev      = document.getElementById("prev").value;
  var stageName = document.getElementById("stage").selectedOptions[0].text;
  var irrigTip  = irrig === "yes"    ? (currentLang === "ta" ? "💧 3 தடவை பிரிக்கவும்" : "💧 Split 3 doses")  : (currentLang === "ta" ? "🌧️ மழைக்கு முன்" : "🌧️ Before rain");
  var prevTip   = prev  === "legume" ? (currentLang === "ta" ? "🫘 20% N குறைவு"       : "🫘 20% less N")      : (currentLang === "ta" ? "❌ N கடன் இல்லை"  : "❌ No N credit");

  // Show loading
  var thinking  = currentLang === "ta" ? "🌿 AI வேளாண் நிபுணரிடம் கேட்கிறோம்..." : "🌿 Flask server processing... please wait...";
  document.getElementById("aiResp").innerHTML = '<span class="thinking">' + thinking + '</span>';
  document.getElementById("resultSection").classList.add("visible");
  document.getElementById("resultSection").scrollIntoView({ behavior: "smooth" });

  try {
    var response = await fetch("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crop, soil, n, p, k, ph, rain, irrig, stage, prev, lang: currentLang })
    });
    var data = await response.json();

    if (data.success) {
      document.getElementById("fertName").textContent = data.fertilizer;
      document.getElementById("fertDose").textContent =
        (currentLang === "ta" ? "இடுங்கள்: நைட்ரஜன் " : "Apply: Nitrogen ") + data.n_needed +
        (currentLang === "ta" ? " | பாஸ்பரஸ் "         : " | Phosphorus ")    + data.p_needed +
        (currentLang === "ta" ? " | பொட்டாசியம் "       : " | Potassium ")     + data.k_needed + " kg/ha";

      document.getElementById("confetti").textContent = "🎉 🌾 ✅ 🌿 🎊 🌱 🎉";

      var bars = [
        { label: currentLang === "ta" ? "நைட்ரஜன்"   : "Nitrogen",   current: data.n_current, ideal: data.n_ideal, color: "#2E7D32" },
        { label: currentLang === "ta" ? "பாஸ்பரஸ்"   : "Phosphorus", current: data.p_current, ideal: data.p_ideal, color: "#1565C0" },
        { label: currentLang === "ta" ? "பொட்டாசியம்" : "Potassium",  current: data.k_current, ideal: data.k_ideal, color: "#E65100" }
      ];
      document.getElementById("nutriBars").innerHTML = bars.map(function(bar) {
        var pct = Math.min(100, Math.round((bar.current / bar.ideal) * 100));
        return '<div class="bar-row"><span class="bar-label">' + bar.label + '</span>' +
               '<div class="bar-bg"><div class="bar-fill" style="width:' + pct + '%;background:' + bar.color + ';"></div></div>' +
               '<span class="bar-pct">' + pct + '%</span></div>';
      }).join("");

      var stageL  = currentLang === "ta" ? "நிலை"        : "Stage";
      var phL     = currentLang === "ta" ? "pH"           : "pH";
      var irrigL  = currentLang === "ta" ? "நீர்ப்பாசனம்" : "Irrigation";
      var prevL   = currentLang === "ta" ? "முந்தைய பயிர்" : "Prev Crop";
      document.getElementById("tipGrid").innerHTML =
        '<div class="tip-box"><div class="tip-label">' + stageL + '</div><div class="tip-val">' + stageName + '</div></div>' +
        '<div class="tip-box"><div class="tip-label">' + phL    + '</div><div class="tip-val">' + data.ph_status + '</div></div>' +
        '<div class="tip-box"><div class="tip-label">' + irrigL + '</div><div class="tip-val">' + irrigTip + '</div></div>' +
        '<div class="tip-box"><div class="tip-label">' + prevL  + '</div><div class="tip-val">' + prevTip  + '</div></div>';

      var warnBox = document.getElementById("warnBox");
      if (data.ph_warning) {
        warnBox.textContent = data.ph < 5.5
          ? (currentLang === "ta" ? "⚠️ மண் அதிக அமிலம்! முதலில் சுண்ணாம்பு இடுங்கள்." : "⚠️ Soil too acidic! Apply lime first.")
          : (currentLang === "ta" ? "⚠️ மண் அதிக காரம்! முதலில் ஜிப்சம் இடுங்கள்."    : "⚠️ Soil too alkaline! Apply gypsum first.");
        warnBox.style.display = "flex";
      } else {
        warnBox.style.display = "none";
      }

      document.getElementById("aiResp").textContent = data.ai_advice;
      document.getElementById("pdfBtn").style.display = "block";

      lastResult = { crop, soil, stageName, n, p, k, ph,
        fertilizer: data.fertilizer,
        n_needed: data.n_needed, p_needed: data.p_needed, k_needed: data.k_needed,
        ai_advice: data.ai_advice
      };
    }
  } catch (error) {
    document.getElementById("aiResp").textContent = currentLang === "ta"
      ? "Flask server-உடன் இணைப்பு தோல்வி. app.py இயங்குகிறதா என சரிபார்க்கவும்!"
      : "Error connecting to Flask server. Make sure app.py is running!";
  }
}

// ===== PDF =====
function downloadPDF() {
  var r = lastResult;
  if (!r.crop) return;
  var { jsPDF } = window.jspdf;
  var doc = new jsPDF();
  doc.setFillColor(27,77,31);
  doc.rect(0,0,210,35,'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(20); doc.setFont("helvetica","bold");
  doc.text("Smart Fertilizer Advisor", 105, 15, {align:"center"});
  doc.setFontSize(10); doc.setFont("helvetica","normal");
  doc.text("AI-Powered Report | Python Flask Backend", 105, 24, {align:"center"});
  doc.text("Date: " + new Date().toLocaleDateString(), 105, 31, {align:"center"});
  doc.setTextColor(27,77,31); doc.setFontSize(13); doc.setFont("helvetica","bold");
  doc.text("Crop & Soil Details", 15, 48);
  doc.setTextColor(50,50,50); doc.setFontSize(11); doc.setFont("helvetica","normal");
  doc.text("Crop: " + r.crop, 15, 58);
  doc.text("Soil: " + r.soil, 15, 66);
  doc.text("N: " + r.n + " | P: " + r.p + " | K: " + r.k + " kg/ha | pH: " + r.ph, 15, 74);
  doc.setTextColor(27,77,31); doc.setFontSize(13); doc.setFont("helvetica","bold");
  doc.text("Recommended Fertilizer", 15, 88);
  doc.setFillColor(232,245,233); doc.rect(12,92,186,18,'F');
  doc.setTextColor(27,77,31); doc.setFontSize(13); doc.setFont("helvetica","bold");
  doc.text(r.fertilizer, 105, 104, {align:"center"});
  doc.setTextColor(27,77,31); doc.setFontSize(13); doc.setFont("helvetica","bold");
  doc.text("Required Doses", 15, 120);
  doc.setTextColor(50,50,50); doc.setFontSize(11); doc.setFont("helvetica","normal");
  doc.text("Nitrogen: " + r.n_needed + " kg/ha", 15, 130);
  doc.text("Phosphorus: " + r.p_needed + " kg/ha", 15, 138);
  doc.text("Potassium: " + r.k_needed + " kg/ha", 15, 146);
  if (r.ai_advice) {
    doc.setTextColor(27,77,31); doc.setFontSize(13); doc.setFont("helvetica","bold");
    doc.text("AI Agronomist Advice", 15, 160);
    doc.setTextColor(50,50,50); doc.setFontSize(10); doc.setFont("helvetica","normal");
    var lines = doc.splitTextToSize(r.ai_advice, 180);
    doc.text(lines, 15, 170);
  }
  doc.setFillColor(27,77,31); doc.rect(0,280,210,20,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(9);
  doc.text("Smart Fertilizer Advisor • Python Flask + AI • Built for Indian Farmers", 105, 292, {align:"center"});
  doc.save("Fertilizer_Report_" + r.crop + ".pdf");
}
