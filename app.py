from flask import Flask, render_template, jsonify, request, send_from_directory
import requests
import os
from dotenv import load_dotenv

if os.environ.get("RENDER") is None:
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except:
        pass


# Carrega variáveis de ambiente do .env (funciona localmente)
load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')

# Chave da API via variável de ambiente
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

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

@app.route('/maps-api.js')
def maps_api():
    return f"""const script = document.createElement('script');
script.src = "https://maps.googleapis.com/maps/api/js?key={AIzaSyA_9lJtzaBhEuCNSx9fKicTDsslVgv5_QM}&libraries=places";
document.head.appendChild(script);""", 200, {'Content-Type': 'application/javascript'}
