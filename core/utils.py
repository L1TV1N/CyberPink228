import math
from datetime import datetime, time

def haversine(lon1, lat1, lon2, lat2):
    # returns kilometers
    R = 6371.0
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def parse_time_window(s):
    # input like '09:0010:00' -> ('09:00','10:00')
    if not isinstance(s, str):
        return None, None
    if len(s) == 9 and s[4] == '0':  # fallback
        pass
    # try to split in middle
    mid = len(s)//2
    a = s[:mid]
    b = s[mid:]
    # ensure colon present
    if ':' not in a:
        a = a[:-2] + ":" + a[-2:]
    if ':' not in b:
        b = b[:-2] + ":" + b[-2:]
    try:
        t0 = datetime.strptime(a, "%H:%M").time()
        t1 = datetime.strptime(b, "%H:%M").time()
        return t0, t1
    except Exception:
        return None, None
