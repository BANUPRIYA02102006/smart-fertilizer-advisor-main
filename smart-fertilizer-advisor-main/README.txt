# 🌱 Smart Fertilizer Advisor - Flask Version

## HOW TO RUN:

### Step 1 - Open cmd in this folder
Right-click the folder → "Open in Terminal" or type cmd

### Step 2 - Install Flask
pip install flask requests

### Step 3 - Run the app
python app.py

### Step 4 - Open browser
Go to: http://127.0.0.1:5000

## PROJECT STRUCTURE:
fertilizer-flask/
├── app.py              ← Flask backend (Python)
├── requirements.txt    ← Python packages needed
├── templates/
│   └── index.html      ← HTML frontend
└── static/
    ├── css/
    │   └── style.css   ← Styling
    └── js/
        └── script.js   ← Frontend JavaScript

## FLASK ROUTES:
- GET  /              → Home page
- POST /recommend     → Get fertilizer + AI advice
- POST /weather       → Get weather data
- POST /location-crops → Get region crop suggestions
