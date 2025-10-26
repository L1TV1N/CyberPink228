"""Route optimizer using Yandex Distance Matrix + local TSP solver.

Provides:
- try_yandex_route(points, apikey) -> dict or None
- nearest_neighbor_route(points) -> (ordered_points, metrics)
"""

import requests, math, time, json
from typing import List, Tuple
from .utils import haversine

YANDEX_MATRIX_URL = "https://api.routing.yandex.net/v2/distancematrix"

def _apply_vip_rules(ordered_points):
    """After Yandex optimization, ensure VIP rules:
    - If at least 1 VIP: move the first VIP to position 0.
    - If 2 or more VIP: move the first VIP to pos 0 and the second VIP to pos 1.
    VIP detection is case-insensitive prefix match on 'priority' field.
    """
    if not ordered_points:
        return ordered_points
    vip_positions = [i for i, p in enumerate(ordered_points)
                     if isinstance(p.get('priority'), str) and p.get('priority').strip().lower().startswith('vip')]
    if not vip_positions:
        return ordered_points
    new_order = list(ordered_points)
    # Move first VIP to position 0
    first_idx = vip_positions[0]
    first_item = new_order.pop(first_idx)
    new_order.insert(0, first_item)
    # If there is a second VIP, move it to position 1
    if len(vip_positions) >= 2:
        # The second VIP id from original ordering
        second_vip = ordered_points[vip_positions[1]]
        second_id = second_vip.get('id')
        # find its index in new_order
        sec_idx = next((i for i, p in enumerate(new_order) if p.get('id') == second_id), None)
        if sec_idx is not None:
            sec_item = new_order.pop(sec_idx)
            new_order.insert(1, sec_item)
    return new_order

def try_yandex_route(points: List[dict], apikey: str):
    """
    Attempt to get optimized route via Yandex Distance Matrix API.
    Returns dict: {'ordered_points': [...], 'metrics': {...}} or None on failure.
    """
    if not apikey or len(points) < 2:
        return None
    # Build points list as "lon,lat" strings in required order
    coords = []
    for p in points:
        lat = p.get('lat') or p.get('latitude') or p.get('y')
        lon = p.get('lon') or p.get('longitude') or p.get('x')
        if lat is None or lon is None:
            coords.append(None)
        else:
            coords.append("{:.6f},{:.6f}".format(float(lon), float(lat)))
    # Filter out None coords and keep mapping to original indices
    idx_map = [i for i,c in enumerate(coords) if c is not None]
    if len(idx_map) < 2:
        return None
    coord_list = [coords[i] for i in idx_map]
    # Prepare POST body according to Yandex Distance Matrix API
    body = {
        "origins": [{"lat": float(points[i].get('lat') or points[i].get('latitude')),
                     "lon": float(points[i].get('lon') or points[i].get('longitude'))} for i in idx_map],
        "destinations": [{"lat": float(points[i].get('lat') or points[i].get('latitude')),
                          "lon": float(points[i].get('lon') or points[i].get('longitude'))} for i in idx_map],
        "metrics": ["distance"],
        "limit": len(idx_map)
    }
    headers = {"Content-Type": "application/json", "Accept": "application/json", "Authorization": f"Api-Key {apikey}"}
    try:
        resp = requests.post(YANDEX_MATRIX_URL, headers=headers, json=body, timeout=15)
        if resp.status_code != 200:
            return None
        data = resp.json()
        # data expected to contain 'matrix' with distances (meters) between origins->destinations
        matrix = data.get('matrix')
        if matrix is None:
            return None
        n = len(matrix)
        # Use a simple symmetric distance matrix (take min of [i][j] and [j][i] if asym)
        dist = [[0.0]*n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                try:
                    d = matrix[i][j].get('distance', {}).get('value', None)
                    if d is None:
                        dist[i][j] = float('inf')
                    else:
                        dist[i][j] = float(d) / 1000.0  # meters -> km
                except Exception:
                    dist[i][j] = float('inf')
        # Solve simple TSP on this distance matrix using nearest neighbor + 2-opt
        order_local = _nearest_neighbor_order_from_matrix(dist)
        order_local = _two_opt(order_local, dist, max_iters=300)
        # Map local order indices back to original points order
        ordered_points = [points[idx_map[i]] for i in order_local]
        total_km = sum(dist[order_local[i]][order_local[i+1]] for i in range(len(order_local)-1))
        metrics = {"distance_km": total_km}
        # Apply VIP rules after Yandex optimization
        ordered_points = _apply_vip_rules(ordered_points)
        return {"ordered_points": ordered_points, "metrics": metrics}
    except Exception:
        return None

# Fallback simple solvers (nearest neighbor + 2-opt)
def _nearest_neighbor_order_from_matrix(dist):
    n = len(dist)
    if n == 0:
        return []
    visited = [False]*n
    order = [0]
    visited[0] = True
    for _ in range(n-1):
        last = order[-1]
        next_idx = None
        best = float('inf')
        for j in range(n):
            if not visited[j] and dist[last][j] < best:
                best = dist[last][j]; next_idx = j
        if next_idx is None:
            for j in range(n):
                if not visited[j]:
                    next_idx = j; break
        order.append(next_idx); visited[next_idx] = True
    return order

def _tour_length(order, dist):
    L = 0.0
    for i in range(len(order)-1):
        L += dist[order[i]][order[i+1]]
    return L

def _two_opt(order, dist, max_iters=200):
    n = len(order)
    if n < 4:
        return order
    improved = True
    it = 0
    best = list(order)
    best_d = _tour_length(best, dist)
    while improved and it < max_iters:
        improved = False
        for i in range(1, n-2):
            for j in range(i+1, n):
                if j - i == 1:
                    continue
                new_order = best[:]
                new_order[i:j] = reversed(new_order[i:j])
                new_d = _tour_length(new_order, dist)
                if new_d < best_d - 1e-6:
                    best = new_order; best_d = new_d; improved = True
        it += 1
    return best

def nearest_neighbor_route(points):
    # Build simple distance matrix using haversine
    n = len(points)
    dist = [[0.0]*n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i==j: dist[i][j]=0.0; continue
            try:
                dist[i][j] = haversine(float(points[i].get('latitude') or points[i].get('lat')),
                                       float(points[i].get('longitude') or points[i].get('lon')),
                                       float(points[j].get('latitude') or points[j].get('lat')),
                                       float(points[j].get('longitude') or points[j].get('lon')))
            except Exception:
                dist[i][j] = float('inf')
    order = _nearest_neighbor_order_from_matrix(dist)
    order = _two_opt(order, dist, max_iters=200)
    ordered_points = [points[i] for i in order]
    total_km = 0.0
    for i in range(len(ordered_points)-1):
        a = ordered_points[i]; b = ordered_points[i+1]
        try:
            total_km += haversine(float(a.get('latitude') or a.get('lat')), float(a.get('longitude') or a.get('lon')),
                                  float(b.get('latitude') or b.get('lat')), float(b.get('longitude') or b.get('lon')))
        except Exception:
            pass
    # Apply VIP rules for fallback too
    ordered_points = _apply_vip_rules(ordered_points)
    return ordered_points, {"distance_km": total_km}
