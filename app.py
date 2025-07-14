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

