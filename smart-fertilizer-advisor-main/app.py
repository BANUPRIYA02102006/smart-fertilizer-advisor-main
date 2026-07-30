# ============================================
#   SMART FERTILIZER ADVISOR - Flask Backend
#   Python + Flask + OpenRouter AI
# ============================================

from flask import Flask, render_template, request, jsonify
import requests
import os

app = Flask(__name__)

# ---- Your OpenRouter API Key ----
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")


# ---- Fertilizer Database ----
FERTILIZER_DB = {
    "rice":      {"base": "Urea + SSP + MOP",                "n": 120, "p": 60,  "k": 60},
    "wheat":     {"base": "DAP + Urea + MOP",                "n": 120, "p": 60,  "k": 40},
    "maize":     {"base": "Urea + DAP + ZnSO4",              "n": 150, "p": 75,  "k": 60},
    "sugarcane": {"base": "Ammonium Sulphate + SSP + MOP",   "n": 250, "p": 100, "k": 120},
    "cotton":    {"base": "DAP + Urea + MOP",                "n": 100, "p": 50,  "k": 50},
    "groundnut": {"base": "SSP + Gypsum + Rhizobium",        "n": 25,  "p": 50,  "k": 40},
    "tomato":    {"base": "NPK 19:19:19 + Calcium Nitrate",  "n": 180, "p": 90,  "k": 150},
    "onion":     {"base": "DAP + Potash + Sulphur",          "n": 100, "p": 50,  "k": 80},
    "banana":    {"base": "Urea + MOP + Neem Cake",          "n": 200, "p": 60,  "k": 300},
    "potato":    {"base": "DAP + Urea + MOP + Boron",        "n": 150, "p": 100, "k": 150},
}

# ============================================
# ROUTE 1 - Home Page
# ============================================
@app.route("/")
def home():
    return render_template("index.html")


# ============================================
# ROUTE 2 - Get Fertilizer Recommendation
# ============================================
@app.route("/recommend", methods=["POST"])
def recommend():
    # Get data from frontend
    data = request.get_json()

    crop    = data.get("crop", "rice")
    soil    = data.get("soil", "loamy")
    n       = int(data.get("n", 60))
    p       = int(data.get("p", 30))
    k       = int(data.get("k", 80))
    ph      = float(data.get("ph", 6.5))
    rain    = data.get("rain", "medium")
    irrig   = data.get("irrig", "yes")
    stage   = data.get("stage", "sowing")
    prev    = data.get("prev", "fallow")
    lang    = data.get("lang", "en")

    # Get ideal values from database
    rec = FERTILIZER_DB.get(crop, FERTILIZER_DB["rice"])

    # Calculate deficiency
    n_needed = max(0, rec["n"] - n)
    p_needed = max(0, rec["p"] - p)
    k_needed = max(0, rec["k"] - k)

    # Adjustments
    if prev == "legume":
        n_needed = round(n_needed * 0.80)
    if rain == "high":
        n_needed = round(n_needed * 1.10)

    # Build AI prompt
    lang_instruction = "Respond in Tamil language." if lang == "ta" else "Respond in English."
    prompt = f"""{lang_instruction}
You are an expert agronomist for Indian farmers.
Give practical fertilizer advice in 3-4 sentences.
Crop: {crop}. Soil: {soil}.
Nitrogen={n} kg/ha, Phosphorus={p} kg/ha, Potassium={k} kg/ha, pH={ph}.
Recommended fertilizer: {rec['base']}.
Required doses: N={n_needed}, P={p_needed}, K={k_needed} kg/ha.
Cover: when to apply, how to split doses, one organic supplement.
Write in simple farmer-friendly language. No bullet points."""

    # Call OpenRouter AI API
    ai_advice = "AI advice unavailable. Please check your API key."
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5000",
                "X-Title": "Smart Fertilizer Advisor"
            },
            json={
                "model": "openrouter/auto",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 300
            },
            timeout=30
        )
        result = response.json()
        if "choices" in result and result["choices"]:
            ai_advice = result["choices"][0]["message"]["content"]
        elif "error" in result:
            ai_advice = f"API Error: {result['error']['message']}"
    except Exception as e:
        ai_advice = f"Network error: {str(e)}"

    # Return JSON response to frontend
    return jsonify({
        "success": True,
        "fertilizer": rec["base"],
        "n_needed": n_needed,
        "p_needed": p_needed,
        "k_needed": k_needed,
        "n_current": n,
        "p_current": p,
        "k_current": k,
        "n_ideal": rec["n"],
        "p_ideal": rec["p"],
        "k_ideal": rec["k"],
        "ai_advice": ai_advice,
        "ph_status": "Acidic - lime needed" if ph < 6 else ("Alkaline - sulphur needed" if ph > 7.5 else "Optimal pH"),
        "ph_warning": ph < 5.5 or ph > 8,
        "ph": ph
    })


# ============================================
# ROUTE 3 - Get Weather Data
# ============================================
@app.route("/weather", methods=["POST"])
def weather():
    data = request.get_json()
    lat = data.get("lat")
    lon = data.get("lon")

    try:
        response = requests.get(
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true",
            timeout=10
        )
        weather_data = response.json()
        temp = weather_data["current_weather"]["temperature"]
        code = weather_data["current_weather"]["weathercode"]

        icon = "☀️" if code <= 1 else ("⛅" if code <= 3 else ("🌧️" if code <= 67 else "⛈️"))
        desc = "Clear sky" if code <= 1 else ("Partly cloudy" if code <= 3 else ("Rainy" if code <= 67 else "Stormy"))

        if code > 30:
            tip = "🌧️ Rain expected - delay fertilizer to avoid runoff."
        elif temp > 35:
            tip = "☀️ High temperature - apply fertilizer in early morning."
        else:
            tip = "✅ Good weather for fertilizer application today!"

        return jsonify({"success": True, "temp": temp, "icon": icon, "desc": desc, "tip": tip})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


# ============================================
# ROUTE 4 - Get Location Crops
# ============================================
@app.route("/location-crops", methods=["POST"])
def location_crops():
    data = request.get_json()
    lat = data.get("lat")
    lon = data.get("lon")

    REGION_CROPS = {
        "Tamil Nadu":     "Rice, Sugarcane, Banana, Groundnut, Cotton",
        "Punjab":         "Wheat, Rice, Maize, Cotton",
        "Maharashtra":    "Cotton, Sugarcane, Onion, Tomato",
        "Andhra Pradesh": "Rice, Groundnut, Cotton, Chilli",
        "Karnataka":      "Rice, Maize, Sugarcane, Groundnut",
        "Uttar Pradesh":  "Wheat, Sugarcane, Potato, Rice",
        "West Bengal":    "Rice, Potato, Jute",
        "Gujarat":        "Cotton, Groundnut, Wheat, Sugarcane",
    }

    try:
        response = requests.get(
            f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json",
            headers={"User-Agent": "SmartFertilizerAdvisor/1.0"},
            timeout=10
        )
        loc = response.json()
        state = loc.get("address", {}).get("state", "")
        city  = loc.get("address", {}).get("city") or loc.get("address", {}).get("town") or loc.get("address", {}).get("village", "")
        crops = REGION_CROPS.get(state, "Rice, Wheat, Maize (common crops)")
        return jsonify({"success": True, "state": state, "city": city, "crops": crops})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


# ============================================
# Run the Flask app
# ============================================
if __name__ == "__main__":
    print("🌱 Smart Fertilizer Advisor is running!")
    print("🔗 Open: http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
