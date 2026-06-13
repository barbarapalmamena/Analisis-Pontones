# feed_data.py
import os
import csv
import time
import datetime
import requests

API_URL = "http://localhost:3000/api/telemetria"
CSV_FILENAME = "puerto_montt_datos_pesquera_2025.csv"

def descargar_datos():
    print("El archivo CSV no existe. Descargando datos crudos desde Open-Meteo API...")
    
    latitude = -41.4693
    longitude = -72.9424
    start_date = "2025-01-01"
    end_date = "2025-12-31"
    timezone = "America/Santiago"

    # 1. Descargar datos meteorológicos
    print("1/3 Descargando datos meteorológicos (Archive)...")
    url_archive = f"https://archive-api.open-meteo.com/v1/archive?latitude={latitude}&longitude={longitude}&start_date={start_date}&end_date={end_date}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,pressure_msl,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone={timezone}"
    
    try:
        res_a = requests.get(url_archive)
        if res_a.status_code != 200:
            print(f"Error descargando datos del clima: {res_a.text}")
            return False
        data_a = res_a.json()
    except Exception as e:
        print(f"Error de red: {e}")
        return False

    # 2. Descargar datos marinos
    print("2/3 Descargando datos marinos (Marine)...")
    url_marine = f"https://marine-api.open-meteo.com/v1/marine?latitude={latitude}&longitude={longitude}&start_date={start_date}&end_date={end_date}&hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,wind_wave_height,wind_wave_direction,wind_wave_period,ocean_current_velocity,ocean_current_direction&timezone={timezone}"
    
    try:
        res_m = requests.get(url_marine)
        if res_m.status_code != 200:
            print(f"Error descargando datos marinos: {res_m.text}")
            return False
        data_m = res_m.json()
    except Exception as e:
        print(f"Error de red: {e}")
        return False

    # 3. Combinar datos
    print("3/3 Combinando arrays y escribiendo archivo CSV...")
    try:
        hourly_a = data_a["hourly"]
        hourly_m = data_m["hourly"]
        
        times = hourly_a["time"]
        total_records = len(times)
        
        with open(CSV_FILENAME, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            
            headers = [
                "date", "temperature_2m", "relative_humidity_2m", "apparent_temperature",
                "precipitation", "rain", "weather_code", "pressure_msl", "surface_pressure",
                "cloud_cover", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
                "wave_height", "wave_direction", "wave_period", "swell_wave_height",
                "swell_wave_direction", "swell_wave_period", "wind_wave_height",
                "wind_wave_direction", "wind_wave_period", "ocean_current_velocity",
                "ocean_current_direction"
            ]
            writer.writerow(headers)
            
            for i in range(total_records):
                w_height = hourly_m["wave_height"][i]
                if w_height is None: w_height = 0.15
                
                swell_h = hourly_m["swell_wave_height"][i]
                if swell_h is None: swell_h = 0.05
                
                wind_w = hourly_m["wind_wave_height"][i]
                if wind_w is None: wind_w = 0.10
                
                curr_v = hourly_m["ocean_current_velocity"][i]
                if curr_v is None: curr_v = 0.12

                row = [
                    times[i],
                    hourly_a["temperature_2m"][i],
                    hourly_a["relative_humidity_2m"][i],
                    hourly_a["apparent_temperature"][i],
                    hourly_a["precipitation"][i],
                    hourly_a["rain"][i],
                    hourly_a["weather_code"][i],
                    hourly_a["pressure_msl"][i],
                    hourly_a["surface_pressure"][i],
                    hourly_a["cloud_cover"][i],
                    hourly_a["wind_speed_10m"][i],
                    hourly_a["wind_direction_10m"][i],
                    hourly_a["wind_gusts_10m"][i],
                    w_height,
                    hourly_m["wave_direction"][i] or 0,
                    hourly_m["wave_period"][i] or 0,
                    swell_h,
                    hourly_m["swell_wave_direction"][i] or 0,
                    hourly_m["swell_wave_period"][i] or 0,
                    wind_w,
                    hourly_m["wind_wave_direction"][i] or 0,
                    hourly_m["wind_wave_period"][i] or 0,
                    curr_v,
                    hourly_m["ocean_current_direction"][i] or 0
                ]
                writer.writerow(row)
                
        print(f"¡Datos guardados con éxito en {CSV_FILENAME}!")
        return True
    except KeyError as ke:
        print(f"Error en el mapeo de claves del JSON de Open-Meteo: {ke}")
        return False

def enviar_datos_dashboard():
    if not os.path.exists(CSV_FILENAME):
        exito = descargar_datos()
        if not exito:
            return

    # Leer el archivo CSV
    print(f"Leyendo datos desde {CSV_FILENAME}...")
    filas = []
    with open(CSV_FILENAME, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            filas.append(row)

    total_filas = len(filas)
    print(f"Total registros cargados: {total_filas}")

    # Forzar fecha y hora actual de hoy a las 20:00 del 12 de junio de 2026
    hoy = datetime.datetime.now().replace(year=2026, month=6, day=12, hour=20, minute=0, second=0, microsecond=0)

    # Enviar las primeras 240 filas rápidamente
    batch_size = min(240, total_filas)
    print(f"Poblando historial del Dashboard con {batch_size} horas alineadas al día de hoy ({hoy.strftime('%Y-%m-%d %H:%M')})...")
    
    for i in range(batch_size):
        row = filas[i]
        # Alinear fecha: ir hacia atrás en horas para cada elemento del lote inicial
        fecha_alineada = hoy - datetime.timedelta(hours=(batch_size - 1 - i))
        
        payload = {
            "date": fecha_alineada.isoformat(),
            "wave_height": float(row["wave_height"] or 0.1),
            "swell_wave_height": float(row["swell_wave_height"] or 0.05),
            "wind_wave_height": float(row["wind_wave_height"] or 0.05),
            "wind_speed_10m": float(row["wind_speed_10m"] or 5),
            "wind_gusts_10m": float(row["wind_gusts_10m"] or 8),
            "pressure_msl": float(row["pressure_msl"] or 1013),
            "ocean_current_velocity": float(row["ocean_current_velocity"] or 0.1),
            "precipitation": float(row["precipitation"] or 0),
            "temperature_2m": float(row["temperature_2m"] or 10),
            "cloud_cover": int(float(row["cloud_cover"] or 50))
        }
        
        try:
            requests.post(API_URL, json=payload)
        except requests.exceptions.ConnectionError:
            print("[ERROR] No se pudo conectar al Dashboard. ¿Está 'npm run dev' activo?")
            return

    print("¡Historial inicial poblado! El Dashboard ha cambiado a modo 'API SENSORS CONNECTED'.")

    # Bucle infinito: enviar 1 nueva fila cada 1 hora (3600 segundos) para simular tiempo real continuo
    print("\nIniciando transmisión en vivo. Enviando 1 nuevo dato cada 1 hora (3600s)...")
    index = batch_size
    
    while index < total_filas:
        row = filas[index]
        # Calcular fecha del siguiente punto (sumar horas desde hoy a las 20:00)
        fecha_alineada = hoy + datetime.timedelta(hours=(index - batch_size + 1))
        
        payload = {
            "date": fecha_alineada.isoformat(),
            "wave_height": float(row["wave_height"] or 0.1),
            "swell_wave_height": float(row["swell_wave_height"] or 0.05),
            "wind_wave_height": float(row["wind_wave_height"] or 0.05),
            "wind_speed_10m": float(row["wind_speed_10m"] or 5),
            "wind_gusts_10m": float(row["wind_gusts_10m"] or 8),
            "pressure_msl": float(row["pressure_msl"] or 1013),
            "ocean_current_velocity": float(row["ocean_current_velocity"] or 0.1),
            "precipitation": float(row["precipitation"] or 0),
            "temperature_2m": float(row["temperature_2m"] or 10),
            "cloud_cover": int(float(row["cloud_cover"] or 50))
        }
        
        try:
            res = requests.post(API_URL, json=payload)
            if res.status_code == 200:
                print(f"[{fecha_alineada.strftime('%Y-%m-%d %H:%M')}] Dato enviado. Olas: {row['wave_height']}m | Viento: {row['wind_speed_10m']}km/h")
            else:
                print(f"Error al enviar: {res.text}")
        except requests.exceptions.ConnectionError:
            print("Error de conexión con el Dashboard. Reintentando en 10 segundos...")
        
        index += 1
        time.sleep(3600)

if __name__ == "__main__":
    enviar_datos_dashboard()
