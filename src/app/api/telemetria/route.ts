// src/app/api/telemetria/route.ts
import { NextResponse } from 'next/server';
import { MeteorologicalData, generateSeriesData } from '@/lib/data';

// Simulación de base de datos temporal en memoria
// Inicializado con el historial base de 240 horas
let historialTelemetria: MeteorologicalData[] = [];

// Función para sincronizar el historial con el tiempo real transcurrido
function syncRealTimeData() {
  if (historialTelemetria.length === 0) {
    historialTelemetria = generateSeriesData();
  }

  const now = new Date();
  
  // Obtener la fecha del último punto de datos
  let lastPoint = historialTelemetria[historialTelemetria.length - 1];
  let lastDate = new Date(lastPoint.date);

  // Generar datos horarios faltantes si el tiempo real ha avanzado más allá del último punto
  while (now.getTime() - lastDate.getTime() >= 60 * 60 * 1000) {
    const nextDate = new Date(lastDate.getTime() + 60 * 60 * 1000);
    
    // Generar el siguiente punto con un paseo aleatorio basado en el último punto
    const waveDelta = (Math.random() - 0.5) * 0.04;
    const nextWave = Math.max(0.06, Math.min(1.25, Math.round((lastPoint.wave_height + waveDelta) * 100) / 100));
    
    const swellDelta = (Math.random() - 0.5) * 0.02;
    const nextSwell = Math.max(0.01, Math.min(0.5, Math.round((lastPoint.swell_wave_height + swellDelta) * 100) / 100));
    
    const windDelta = (Math.random() - 0.5) * 2.5;
    const nextWind = Math.max(3, Math.min(55, Math.round((lastPoint.wind_speed_10m + windDelta) * 10) / 10));
    const nextGusts = Math.max(nextWind, Math.round((nextWind * (1.2 + Math.random() * 0.22)) * 10) / 10);
    
    const pressDelta = (Math.random() - 0.5) * 0.8;
    const nextPress = Math.max(985, Math.min(1025, Math.round((lastPoint.pressure_msl + pressDelta) * 10) / 10));
    
    const currentDelta = (Math.random() - 0.5) * 0.03;
    const nextCurrent = Math.max(0.02, Math.min(0.45, Math.round((lastPoint.ocean_current_velocity + currentDelta) * 100) / 100));
    
    const tempDelta = (Math.random() - 0.5) * 0.12;
    const nextTemp = Math.max(4, Math.min(16, Math.round((lastPoint.temperature_2m + tempDelta) * 10) / 10));
    
    const nextPrecip = Math.random() > 0.9 ? Math.round((Math.random() * 3) * 10) / 10 : 0;
    
    const nextPoint: MeteorologicalData = {
      date: nextDate,
      dateStr: nextDate.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      wave_height: nextWave,
      swell_wave_height: nextSwell,
      wind_wave_height: Math.max(0, Math.round((nextWave - nextSwell) * 100) / 100),
      wind_speed_10m: nextWind,
      wind_gusts_10m: nextGusts,
      pressure_msl: nextPress,
      ocean_current_velocity: nextCurrent,
      precipitation: nextPrecip,
      temperature_2m: nextTemp,
      cloud_cover: Math.round(Math.min(100, Math.max(0, lastPoint.cloud_cover + (Math.random() - 0.5) * 8))),
      
      wave_height_roll3: nextWave,
      wind_gusts_roll3: nextGusts,
      swell_roll3: nextSwell,
      pressure_change_3h: 0,
      pressure_change_6h: 0,
      pressure_std_6h: 0.1,
      wave_height_forecast: Math.max(0.05, Math.round((nextWave + (Math.random() - 0.5) * 0.05) * 100) / 100)
    };

    historialTelemetria.push(nextPoint);
    if (historialTelemetria.length > 240) {
      historialTelemetria.shift();
    }
    
    // Recalcular promedios móviles
    const lastIdx = historialTelemetria.length - 1;
    if (lastIdx >= 2) {
      const slice3 = historialTelemetria.slice(lastIdx - 2, lastIdx + 1);
      historialTelemetria[lastIdx].wave_height_roll3 = Math.round((slice3.reduce((sum, item) => sum + item.wave_height, 0) / 3) * 100) / 100;
      historialTelemetria[lastIdx].wind_gusts_roll3 = Math.round((slice3.reduce((sum, item) => sum + item.wind_gusts_10m, 0) / 3) * 10) / 10;
      historialTelemetria[lastIdx].swell_roll3 = Math.round((slice3.reduce((sum, item) => sum + item.swell_wave_height, 0) / 3) * 100) / 100;
    }
    if (lastIdx >= 3) {
      historialTelemetria[lastIdx].pressure_change_3h = Math.round((historialTelemetria[lastIdx].pressure_msl - historialTelemetria[lastIdx - 3].pressure_msl) * 10) / 10;
    }
    if (lastIdx >= 6) {
      historialTelemetria[lastIdx].pressure_change_6h = Math.round((historialTelemetria[lastIdx].pressure_msl - historialTelemetria[lastIdx - 6].pressure_msl) * 10) / 10;
      const slice6 = historialTelemetria.slice(lastIdx - 5, lastIdx + 1);
      const meanPress = slice6.reduce((sum, item) => sum + item.pressure_msl, 0) / 6;
      const variance = slice6.reduce((sum, item) => sum + Math.pow(item.pressure_msl - meanPress, 2), 0) / 5;
      historialTelemetria[lastIdx].pressure_std_6h = Math.round(Math.sqrt(variance) * 100) / 100;
    }

    lastPoint = nextPoint;
    lastDate = nextDate;
  }
}

// 1. GET: Retorna todo el historial acumulado (sincronizado con tiempo real)
export async function GET() {
  syncRealTimeData();
  return NextResponse.json(historialTelemetria);
}

// 2. POST: Permite que tu API externa o sensores inyecten nuevos datos automáticamente
export async function POST(request: Request) {
  try {
    syncRealTimeData();
    
    const nuevoRegistro = await request.json();
    
    // Validamos campos mínimos requeridos
    if (
      nuevoRegistro.wave_height === undefined || 
      nuevoRegistro.wind_speed_10m === undefined ||
      nuevoRegistro.wind_gusts_10m === undefined
    ) {
      return NextResponse.json(
        { success: false, error: "Faltan campos críticos (wave_height, wind_speed_10m, wind_gusts_10m)" }, 
        { status: 400 }
      );
    }

    const nextDate = nuevoRegistro.date ? new Date(nuevoRegistro.date) : new Date();
    
    // Evitar duplicados si el script envía datos repetidos o antiguos
    if (historialTelemetria.length > 0) {
      const lastPoint = historialTelemetria[historialTelemetria.length - 1];
      const lastDate = new Date(lastPoint.date);
      if (nextDate.getTime() <= lastDate.getTime()) {
        return NextResponse.json({ 
          success: true, 
          message: "Dato omitido: ya existe un registro más reciente en el historial",
          data: lastPoint
        });
      }
    }

    // Estructurar el dato conforme a la interfaz del sistema
    const datoFormateado: MeteorologicalData = {
      date: nextDate,
      dateStr: nextDate.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      wave_height: Number(nuevoRegistro.wave_height),
      swell_wave_height: Number(nuevoRegistro.swell_wave_height || nuevoRegistro.wave_height * 0.3),
      wind_wave_height: Number(nuevoRegistro.wind_wave_height || nuevoRegistro.wave_height * 0.7),
      wind_speed_10m: Number(nuevoRegistro.wind_speed_10m),
      wind_gusts_10m: Number(nuevoRegistro.wind_gusts_10m),
      pressure_msl: Number(nuevoRegistro.pressure_msl || 1013),
      ocean_current_velocity: Number(nuevoRegistro.ocean_current_velocity || 0.15),
      precipitation: Number(nuevoRegistro.precipitation || 0),
      temperature_2m: Number(nuevoRegistro.temperature_2m || 10),
      cloud_cover: Number(nuevoRegistro.cloud_cover || 50),
      
      // Inicializar campos calculados con valores razonables
      wave_height_roll3: Number(nuevoRegistro.wave_height),
      wind_gusts_roll3: Number(nuevoRegistro.wind_gusts_10m),
      swell_roll3: Number(nuevoRegistro.swell_wave_height || nuevoRegistro.wave_height * 0.3),
      pressure_change_3h: 0,
      pressure_change_6h: 0,
      pressure_std_6h: 0.1,
      wave_height_forecast: Number(nuevoRegistro.wave_height)
    };

    // Agregar al historial
    historialTelemetria.push(datoFormateado);

    // Limitar tamaño del búfer
    if (historialTelemetria.length > 240) {
      historialTelemetria.shift();
    }

    return NextResponse.json({ 
      success: true, 
      message: "Sensor registrado con éxito", 
      data: datoFormateado 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Formato JSON inválido o error interno" }, 
      { status: 500 }
    );
  }
}
