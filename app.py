from flask import Flask, render_template, jsonify, request, send_from_directory
import requests
import os

app = Flask(__name__, template_folder='templates', static_folder='static')

GOOGLE_API_KEY = "AIzaSyA_9lJtzaBhEuCNSx9fKicTDsslVgv5_QM"

@app.route('/')
def home():
    return render_template("index.html")

@app.route('/geojson')
def geojson():
    return send_from_directory('static', 'atuacao_link_cariri.geojson', mimetype='application/json')

@app.route('/geocode')
def geocode():
    address = request.args.get("address")
    url = f"https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={GOOGLE_API_KEY}"
    response = requests.get(url)
    return jsonify(response.json())

import os

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

import os
import requests
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# Use variável de ambiente para guardar sua chave (mais seguro)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/geocode")
def geocode():
    address = request.args.get("address")
    if not address:
        return jsonify({"error": "Endereço ausente"}), 400

    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": address, "key": GOOGLE_API_KEY}
    
    response = requests.get(url, params=params)
    return jsonify(response.json())
from dotenv import load_dotenv
load_dotenv()
