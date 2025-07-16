import os
import json
import base64
import time
import requests
from flask import Flask, render_template, jsonify, request, send_from_directory

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

@app.route('/ctos')
def listar_ctos():
    try:
        with open("static/ctos.json", "r", encoding="utf-8") as f:
            dados = json.load(f)
        return jsonify(dados)
    except Exception as e:
        return jsonify({"erro": f"Erro ao carregar CTOs: {str(e)}"}), 500

@app.route('/maps-api.js')
def maps_api():
    return f"""const script = document.createElement('script');
script.src = "https://maps.googleapis.com/maps/api/js?key={GOOGLE_API_KEY}&libraries=places";
document.head.appendChild(script);""", 200, {'Content-Type': 'application/javascript'}

@app.route('/geocode')
def geocode():
    address = request.args.get("address")
    latlng = request.args.get("latlng")
    url = "https://maps.googleapis.com/maps/api/geocode/json"

    if address:
        params = { "address": address, "key": GOOGLE_API_KEY }
    elif latlng:
        params = { "latlng": latlng, "key": GOOGLE_API_KEY }
    else:
        return jsonify({ "error": "Parâmetros ausentes" }), 400

    response = requests.get(url, params=params)
    return jsonify(response.json())

def get_todas_ctos(token_path='token.txt', host='central.ligeira.net', output_file='static/ctos.json'):
    with open(token_path, "r") as f:
        token = f.read().strip()

    url = f"https://{host}/webservice/v1/rad_caixa_ftth"

    headers = {
        'ixcsoft': 'listar',
        'Authorization': 'Basic {}'.format(base64.b64encode(token.encode('utf-8')).decode('utf-8')),
        'Content-Type': 'application/json'
    }

    resultado = {}
    page = 1
    registros_por_pagina = 1000

    while True:
        payload = {
            'qtype': 'rad_caixa_ftth.id',
            'query': '0',
            'oper': '>',
            'page': str(page),
            'rp': str(registros_por_pagina),
            'sortname': 'rad_caixa_ftth.id',
            'sortorder': 'asc'
        }

        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

            registros = data.get("registros", [])

            if not registros:
                break

            for item in registros:
                id_cto = str(item.get("id", ""))
                resultado[id_cto] = item

            if len(registros) < registros_por_pagina:
                break

            page += 1
            time.sleep(0.3)

        except requests.exceptions.RequestException as e:
            print(f"[ERRO] Falha na página {page}: {e}")
            break

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(resultado, f, indent=4, ensure_ascii=False)

    return resultado

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
