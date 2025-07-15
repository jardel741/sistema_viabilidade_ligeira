import os
from flask import Flask, render_template, jsonify, request, send_from_directory
import requests

# Só carrega dotenv localmente
if os.environ.get("RENDER") is None:
    from dotenv import load_dotenv
    load_dotenv()


app = Flask(__name__, template_folder='templates', static_folder='static')

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

@app.route('/')
def home():
    return render_template("index.html")

@app.route('/geojson')
def geojson():
    return send_from_directory('static', 'atuacao_link_cariri.geojson', mimetype='application/json')

@app.route('/geocode')
def geocode():
    address = request.args.get("address")
    if not address:
        return jsonify({"error": "Endereço ausente"}), 400

    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": address,
        "key": GOOGLE_API_KEY
    }

    response = requests.get(url, params=params)
    return jsonify(response.json())

@app.route('/maps-api.js')
def maps_api():
    return f"""const script = document.createElement('script');
script.src = "https://maps.googleapis.com/maps/api/js?key={GOOGLE_API_KEY}&libraries=places";
document.head.appendChild(script);""", 200, {'Content-Type': 'application/javascript'}

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
