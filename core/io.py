import pandas as pd
from pathlib import Path
from .utils import parse_time_window

def load_input(path):
    path = Path(path)
    if path.suffix in ['.csv', '.xls']:
        df = pd.read_csv(path)
    else:
        df = pd.read_csv(path)

    # 🧭 Автоматическое сопоставление русских названий
    rename_map = {
        'Номер объекта': 'id',
        'Адрес объекта': 'address',
        'Географическая широта': 'latitude',
        'Географическая долгота': 'longitude',
        'Уровень клиента': 'priority',
        'Время начала рабочего дня': 'time_window_start',
        'Время окончания рабочего дня': 'time_window_end',
        'Время начала обеда': 'lunch_start',
        'Время окончания обеда': 'lunch_end',
    }

    for k, v in rename_map.items():
        if k in df.columns and v not in df.columns:
            df.rename(columns={k: v}, inplace=True)

    # Проверка наличия нужных колонок
    required = ['latitude', 'longitude']
    for col in required:
        if col not in df.columns:
            raise ValueError(f"В файле нет нужного столбца: {col}")

    # Преобразования
    df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
    df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')

    # Обработка временных окон (если объединены в одну ячейку)
    if 'time_window_start' in df.columns and df['time_window_start'].dtype == object:
        if 'time_window_end' not in df.columns or df['time_window_end'].isnull().all():
            df[['time_window_start', 'time_window_end']] = df['time_window_start'].astype(str).str.extract(r'(.{5})(.{5})')

    df['_tw_start_time'] = df['time_window_start'].apply(lambda x: parse_time_window(x)[0] if isinstance(x, str) else None)
    df['_tw_end_time'] = df['time_window_end'].apply(lambda x: parse_time_window(x)[1] if isinstance(x, str) else None)
    return df
