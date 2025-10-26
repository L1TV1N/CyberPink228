"""Main pipeline: load data -> build graph -> GNN inference -> optimizer -> write outputs."""

import os, json
import numpy as np
import torch
from pathlib import Path
from .io import load_input
from .utils import haversine
from .gnn_model import SimpleGNN
from .optimizer import try_yandex_route, nearest_neighbor_route
from .config import Config
from urllib.parse import quote_plus
def build_graph(df):
    # Build nodes list and adjacency based on inverse distance (closer means stronger edge)
    points = []
    coords = []
    for _, row in df.iterrows():
        points.append({
            "id": row.get("id"),
            "client_name": row.get("client_name"),
            "address": row.get("address"),
            "lat": float(row.get("latitude")) if not np.isnan(row.get("latitude", float('nan'))) else None,
            "lon": float(row.get("longitude")) if not np.isnan(row.get("longitude", float('nan'))) else None,
            "priority": row.get("priority"),
            "time_window_start": row.get("_tw_start_time"),
            "time_window_end": row.get("_tw_end_time"),
            "service_time": row.get("service_time")
        })
        coords.append((points[-1]['lat'], points[-1]['lon']))
    n = len(points)
    # adjacency: inverse haversine distance (with cap)
    adj = np.zeros((n,n), dtype=float)
    for i in range(n):
        for j in range(n):
            if i==j: continue
            if points[i]['lat'] is None or points[j]['lat'] is None:
                adj[i,j] = 0.0
            else:
                d = haversine(points[i]['lon'], points[i]['lat'], points[j]['lon'], points[j]['lat'])
                adj[i,j] = 1.0/(d+1e-3)
    return points, adj

def compute_node_features(points):
    # features: [latitude, longitude, is_vip(1/0), service_time(minutes or 0)]
    import numpy as np
    feats = []
    for p in points:
        lat = p['lat'] if p['lat'] is not None else 0.0
        lon = p['lon'] if p['lon'] is not None else 0.0
        is_vip = 1.0 if str(p.get('priority')).lower().startswith('vip') else 0.0
        st = float(p.get('service_time') or 0.0)
        feats.append([lat, lon, is_vip, st])
    return np.array(feats, dtype=float)

def run_pipeline(input_path, output_dir="results", config: Config = Config()):
    p = Path(output_dir)
    p.mkdir(parents=True, exist_ok=True)
    df = load_input(input_path)
    points, adj = build_graph(df)
    if len(points)==0:
        raise ValueError("No points found in input.")
    feats = compute_node_features(points)
    # normalize coords
    feats[:,0] = (feats[:,0] - feats[:,0].mean()) / (feats[:,0].std() + 1e-6)
    feats[:,1] = (feats[:,1] - feats[:,1].mean()) / (feats[:,1].std() + 1e-6)

    # to torch
    x = torch.tensor(feats, dtype=torch.float32)
    adj_t = torch.tensor(adj, dtype=torch.float32)

    # model
    model = SimpleGNN(in_dim=x.shape[1], hidden_dim=32)
    model.eval()
    with torch.no_grad():
        scores = model(x, adj_t).numpy()

    # attach scores to points
    for i,pnt in enumerate(points):
        pnt['gnn_score'] = float(scores[i])

    # Order by score descending as initial ranking
    ordered_by_score = sorted(points, key=lambda p: p['gnn_score'], reverse=True)

    # Attempt Yandex Routing (requires API key)
    api_key = getattr(config, "YANDEX_API_KEY", None)
    yandex_result = try_yandex_route(ordered_by_score, api_key)
    if yandex_result and isinstance(yandex_result, dict) and 'ordered_points' in yandex_result:
        ordered = yandex_result['ordered_points']
        metrics = yandex_result.get('metrics', {})
        total_time_min = metrics.get("distance_km", 0) / 40 * 60  # rough assume avg speed 40 km/h -> minutes
        out = {
            "mode":"yandex",
            "ordered_ids":[p['id'] for p in ordered],
            "ordered_points": ordered,
            "metrics": {
                "distance_km": metrics.get("distance_km"),
                "estimated_travel_time_min": total_time_min
            }
        }
        with open(p/"route.json","w",encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        # build simple Leaflet HTML
        html = build_leaflet_html(ordered, out['metrics'])
        with open(p/"map.html","w",encoding="utf-8") as f:
            f.write(html)
        # Create a Yandex Maps URL based on coordinates (lon,lat pairs)
        coord_pairs = []
        for pt in ordered:
            lat = pt.get('latitude') or pt.get('lat')
            lon = pt.get('longitude') or pt.get('lon')
            if lat is not None and lon is not None:
                coord_pairs.append(f"{lon},{lat}")
        if coord_pairs:
            yandex_url = f"https://yandex.ru/maps/?rtext={'~'.join(coord_pairs)}&rtt=auto"
            out['map_url'] = yandex_url
            url_path = p / "URL.txt"
            with open(url_path, "w", encoding="utf-8") as f:
                f.write(yandex_url + "\n")
        return out

    # Fallback optimizer
    ordered, metrics = nearest_neighbor_route(ordered_by_score)
    total_time_min = metrics.get("distance_km", 0) / 40 * 60  # rough assume avg speed 40 km/h -> minutes
    out = {
        "mode":"fallback",
        "ordered_ids":[p['id'] for p in ordered],
        "ordered_points": ordered,
        "metrics": {
            "distance_km": metrics.get("distance_km"),
            "estimated_travel_time_min": total_time_min
        }
    }
    # write outputs
    with open(p/"route.json","w",encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    # build simple Leaflet HTML
    html = build_leaflet_html(ordered, out['metrics'])
    with open(p/"map.html","w",encoding="utf-8") as f:
        f.write(html)

    # 🧭 создаём ссылку на интерактивную карту Яндекс с маршрутами
    coord_pairs = [p['address'] for p in ordered if isinstance(p.get('address'), str) and p['address'].strip()]
    if coord_pairs:
        yandex_url = f"https://yandex.ru/maps/?rtext={'~'.join(coord_pairs)}&rtt=auto"
        out["map_url"] = yandex_url
        url_path = p / "URL.txt"
        with open(url_path, "w", encoding="utf-8") as f:
            f.write(yandex_url + "\n")

    return out

    # 🧭 создаём ссылку на интерактивную карту Яндекс по адресам (а не координатам)
    # from urllib.parse import quote_plus

    # address_list = [p['address'] for p in ordered if isinstance(p.get('address'), str) and p['address'].strip()]
    # if address_list:
    #     encoded_addresses = [quote_plus(addr) for addr in address_list]
    #     yandex_url = f"https://yandex.ru/maps/?rtext={'~'.join(encoded_addresses)}&rtt=auto"
    #     out["map_url"] = yandex_url
    #     url_path = p / "URL.txt"
    #     with open(url_path, "w", encoding="utf-8") as f:
    #         f.write(yandex_url + "\n")

def build_leaflet_html(points, metrics):
    markers_js = []
    lat0 = points[0]['lat'] if points and points[0]['lat'] else 0
    lon0 = points[0]['lon'] if points and points[0]['lon'] else 0
    for p in points:
        markers_js.append(f" L.marker([{p['lat']},{p['lon']}]).bindPopup('{p.get('client_name', '')} (id:{p['id']})'); ")
    poly = ",\n".join([f"[{p['lat']},{p['lon']}]" for p in points])

    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Route map</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
  <style> #map {{ height: 90vh; }} body {{ margin:0; padding:0; }} </style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script>
  var map = L.map('map').setView([{lat0},{lon0}], 12);
  L.tileLayer('https://{{{{s}}}}.tile.openstreetmap.org/{{{{z}}}}/{{{{x}}}}/{{{{y}}}}.png', {{
    maxZoom: 19
  }}).addTo(map);

  var latlngs = [{poly}];
  var polyline = L.polyline(latlngs, {{weight:4}}).addTo(map);
  map.fitBounds(polyline.getBounds());

  {"".join(markers_js)}

  var metrics = {json.dumps(metrics)};
  var info = L.control();
  info.onAdd = function(map) {{
      var div = L.DomUtil.create('div', 'info');
      div.style.background = 'white';
      div.style.padding = '6px';
      div.innerHTML = '<b>Estimated distance (км):</b> ' + metrics.distance_km.toFixed(2) + '<br>' +
                      '<b>Estimated travel time (мин):</b> ' + metrics.estimated_travel_time_min.toFixed(0);
      return div;
  }};
  info.addTo(map);
</script>
</body>
</html>"""
    return html
