// src/lib/data.ts

export interface MeteorologicalData {
  date: Date;
  dateStr: string;
  wave_height: number;
  swell_wave_height: number;
  wind_wave_height: number;
  wind_speed_10m: number;
  wind_gusts_10m: number;
  pressure_msl: number;
  ocean_current_velocity: number;
  precipitation: number;
  temperature_2m: number;
  cloud_cover: number;
  
  // Campos calculados dinámicamente o por defecto
  wave_height_roll3: number;
  wind_gusts_roll3: number;
  swell_roll3: number;
  pressure_change_3h: number;
  pressure_change_6h: number;
  pressure_std_6h: number;
  
  // Campos de predicción simulados (para forecasting t+3h)
  wave_height_forecast: number;
}

// Generador de la serie temporal de 10 días (240 registros horarios)
export function generateSeriesData(): MeteorologicalData[] {
  const data: MeteorologicalData[] = [];
  // Alinear fecha final con hoy: 12 de junio de 2026 a las 20:00 (lote termina exactamente en esa fecha)
  const today = new Date(2026, 5, 12, 20, 0, 0);
  const startDate = new Date(today.getTime() - 239 * 60 * 60 * 1000);

  for (let i = 0; i < 240; i++) {
    const currentDate = new Date(startDate.getTime() + i * 60 * 60 * 1000);
    
    // El clima se deteriora progresivamente a partir de la mitad de la serie (hora 144, o sea, 9 de junio)
    const isStormPeriod = i >= 135; 
    
    // Perfil base con ciclos y tendencias
    const t = i / 24; // días transcurridos
    const dailyCycle = Math.sin((i % 24) * Math.PI / 12);
    
    // Variables meteorológicas
    let pressure_msl = 1018 - (isStormPeriod ? (i - 135) * 0.35 + dailyCycle * 1.5 : dailyCycle * 0.8);
    // Limitar presión
    pressure_msl = Math.max(988, Math.min(1026, pressure_msl));

    let wind_speed_base = isStormPeriod ? 32 + (i - 135) * 0.18 + dailyCycle * 6 : 12 + dailyCycle * 3;
    wind_speed_base = Math.max(4, Math.min(52, wind_speed_base));
    const wind_speed_10m = Math.round(wind_speed_base * 10) / 10;

    const wind_gusts_10m = Math.round((wind_speed_10m * (1.3 + Math.random() * 0.25)) * 10) / 10;

    let wave_base = isStormPeriod ? 0.45 + (i - 135) * 0.0055 + dailyCycle * 0.12 : 0.16 + dailyCycle * 0.04;
    wave_base = Math.max(0.08, Math.min(1.1, wave_base));
    const wave_height = Math.round(wave_base * 100) / 100;

    const swell_wave_height = Math.round((wave_height * (0.28 + Math.sin(i * 0.05) * 0.08)) * 100) / 100;
    const wind_wave_height = Math.round((wave_height - swell_wave_height) * 100) / 100;

    let ocean_current_base = 0.22 + Math.sin(i * 0.15) * 0.14 + (isStormPeriod ? 0.05 : 0);
    ocean_current_base = Math.max(0.03, Math.min(0.42, ocean_current_base));
    const ocean_current_velocity = Math.round(ocean_current_base * 100) / 100;

    let temp_base = 9 + dailyCycle * 3.5 - (isStormPeriod ? 2 : 0);
    const temperature_2m = Math.round(temp_base * 10) / 10;

    const precipitation = isStormPeriod && Math.random() > 0.4 
      ? Math.round((Math.random() * 4.5 + (dailyCycle > 0 ? dailyCycle * 2 : 0)) * 10) / 10 
      : 0;

    const cloud_cover = isStormPeriod ? Math.min(100, Math.round(85 + Math.random() * 15)) : Math.round(40 + dailyCycle * 20 + Math.random() * 20);

    data.push({
      date: currentDate,
      dateStr: currentDate.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      wave_height,
      swell_wave_height,
      wind_wave_height,
      wind_speed_10m,
      wind_gusts_10m,
      pressure_msl: Math.round(pressure_msl * 10) / 10,
      ocean_current_velocity,
      precipitation,
      temperature_2m,
      cloud_cover,
      // Se inicializarán después las medias móviles y diferencias
      wave_height_roll3: 0,
      wind_gusts_roll3: 0,
      swell_roll3: 0,
      pressure_change_3h: 0,
      pressure_change_6h: 0,
      pressure_std_6h: 0,
      wave_height_forecast: 0
    });
  }

  // Calcular métricas rodantes (rolling/diffs)
  for (let i = 0; i < data.length; i++) {
    // Medias móviles 3h
    const slice3 = data.slice(Math.max(0, i - 2), i + 1);
    data[i].wave_height_roll3 = Math.round((slice3.reduce((sum, item) => sum + item.wave_height, 0) / slice3.length) * 100) / 100;
    data[i].wind_gusts_roll3 = Math.round((slice3.reduce((sum, item) => sum + item.wind_gusts_10m, 0) / slice3.length) * 10) / 10;
    data[i].swell_roll3 = Math.round((slice3.reduce((sum, item) => sum + item.swell_wave_height, 0) / slice3.length) * 100) / 100;

    // Cambios de presión
    if (i >= 3) {
      data[i].pressure_change_3h = Math.round((data[i].pressure_msl - data[i - 3].pressure_msl) * 10) / 10;
    }
    if (i >= 6) {
      data[i].pressure_change_6h = Math.round((data[i].pressure_msl - data[i - 6].pressure_msl) * 10) / 10;
      
      const slice6 = data.slice(i - 5, i + 1);
      const meanPress = slice6.reduce((sum, item) => sum + item.pressure_msl, 0) / 6;
      const variance = slice6.reduce((sum, item) => sum + Math.pow(item.pressure_msl - meanPress, 2), 0) / 5;
      data[i].pressure_std_6h = Math.round(Math.sqrt(variance) * 100) / 100;
    } else {
      data[i].pressure_std_6h = 0.1; // fallback
    }

    // Forecasting simulado (oleaje +3h)
    // Usamos el oleaje real 3 horas más adelante con un pequeño error aleatorio simulado
    const targetIdx = Math.min(data.length - 1, i + 3);
    const simulatedError = (Math.random() - 0.5) * 0.06;
    data[i].wave_height_forecast = Math.max(0.05, Math.round((data[targetIdx].wave_height + simulatedError) * 100) / 100);
  }

  return data;
}

// Variables para los umbrales configurables por el usuario (Análisis de Sensibilidad)
export interface Thresholds {
  waveClosed: number;      // por defecto 0.5
  waveAlert: number;       // por defecto 0.3
  gustsClosed: number;     // por defecto 50
  gustsAlert: number;      // por defecto 35
  swellClosed: number;     // por defecto 0.15
  costHourClosed: number;  // CLP, por defecto 500,000
  costHourAlert: number;   // CLP, por defecto 150,000
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  waveClosed: 0.5,
  waveAlert: 0.3,
  gustsClosed: 50,
  gustsAlert: 35,
  swellClosed: 0.15,
  costHourClosed: 500000,
  costHourAlert: 150000
};

// Determinar el estado del pontón en base a umbrales configurables
export type PontonState = 'OPERATIVO' | 'ALERTA' | 'CERRADO';

export function getPontonState(row: MeteorologicalData, thresholds: Thresholds): PontonState {
  if (
    row.wave_height >= thresholds.waveClosed || 
    row.wind_gusts_10m >= thresholds.gustsClosed || 
    row.swell_wave_height >= thresholds.swellClosed
  ) {
    return 'CERRADO';
  } else if (
    row.wave_height >= thresholds.waveAlert || 
    row.wind_gusts_10m >= thresholds.gustsAlert
  ) {
    return 'ALERTA';
  } else {
    return 'OPERATIVO';
  }
}

// ----------------------------------------------------
// CÁLCULOS CASOS DE USO ADICIONALES (Parte 2)
// ----------------------------------------------------

// 1. Riesgo Logístico para embarcaciones de apoyo
// NAVEGAR / NO NAVEGAR
export interface LogisticoResult {
  state: 'NAVEGAR' | 'NO NAVEGAR';
  percentNavegable: number;
}

export function calculateLogistics(row: MeteorologicalData): 'NAVEGAR' | 'NO NAVEGAR' {
  // Criterio: NO NAVEGAR si oleaje >= 0.4 m o rachas >= 45 km/h
  if (row.wave_height >= 0.4 || row.wind_gusts_10m >= 45) {
    return 'NO NAVEGAR';
  }
  return 'NAVEGAR';
}

// 2. Estrés estructural sobre redes y fondeo
// Índice ponderado normalizado (0 a 1) y clasificado en BAJO, MEDIO, ALTO
export type NivelEstres = 'BAJO' | 'MEDIO' | 'ALTO';

export interface EstresEstructuralResult {
  index: number;
  nivel: NivelEstres;
}

// Normalización rápida basada en mínimos/máximos conocidos de la serie
function scale(val: number, min: number, max: number): number {
  return Math.min(1, Math.max(0, (val - min) / (max - min)));
}

export function calculateStructuralStress(row: MeteorologicalData): EstresEstructuralResult {
  // Normalizar variables clave
  const wHeightNorm = scale(row.wave_height, 0.08, 1.1);
  const swellNorm = scale(row.swell_wave_height, 0.02, 0.5);
  const gustsNorm = scale(row.wind_gusts_10m, 10, 80);

  // Criterio: 0.5 * oleaje + 0.3 * swell + 0.2 * racha
  const index = 0.5 * wHeightNorm + 0.3 * swellNorm + 0.2 * gustsNorm;
  
  // Umbrales aproximados por terciles (0.22, 0.48)
  let nivel: NivelEstres = 'BAJO';
  if (index > 0.48) {
    nivel = 'ALTO';
  } else if (index > 0.22) {
    nivel = 'MEDIO';
  }

  return {
    index: Math.round(index * 100) / 100,
    nivel
  };
}

// Encontrar ventanas recomendadas para mantenimiento (Estrés BAJO >= 4h consecutivas)
export interface MantenimientoWindow {
  inicio: string;
  fin: string;
  horas: number;
}

export function getMaintenanceWindows(series: MeteorologicalData[]): MantenimientoWindow[] {
  const windows: MantenimientoWindow[] = [];
  let currentWindow: MeteorologicalData[] = [];

  for (let i = 0; i < series.length; i++) {
    const stress = calculateStructuralStress(series[i]);
    if (stress.nivel === 'BAJO') {
      currentWindow.push(series[i]);
    } else {
      if (currentWindow.length >= 4) {
        windows.push({
          inicio: currentWindow[0].dateStr,
          fin: currentWindow[currentWindow.length - 1].dateStr,
          horas: currentWindow.length
        });
      }
      currentWindow = [];
    }
  }
  
  // Si la última ventana cumple al final
  if (currentWindow.length >= 4) {
    windows.push({
      inicio: currentWindow[0].dateStr,
      fin: currentWindow[currentWindow.length - 1].dateStr,
      horas: currentWindow.length
    });
  }

  return windows.sort((a, b) => b.horas - a.horas); // De mayor a menor duración
}

// 3. Riesgo de oxigenación y bienestar animal
// Corriente por debajo del percentil 25 (umbral ~0.12 m/s) sostenida por >=3h
export interface OxigenoEpisodio {
  inicio: string;
  fin: string;
  horas: number;
  corrienteMin: number;
}

export function getOxygenationRiskEpisodes(series: MeteorologicalData[]): OxigenoEpisodio[] {
  // Calculamos el percentil 25 de la velocidad de corriente. En la simulación ronda los 0.12 m/s.
  const currents = series.map(d => d.ocean_current_velocity).sort((a, b) => a - b);
  const p25Idx = Math.floor(currents.length * 0.25);
  const p25Threshold = currents[p25Idx];

  const episodios: OxigenoEpisodio[] = [];
  let currentGroup: MeteorologicalData[] = [];

  for (let i = 0; i < series.length; i++) {
    if (series[i].ocean_current_velocity <= p25Threshold) {
      currentGroup.push(series[i]);
    } else {
      if (currentGroup.length >= 3) {
        const minCurrent = Math.min(...currentGroup.map(item => item.ocean_current_velocity));
        episodios.push({
          inicio: currentGroup[0].dateStr,
          fin: currentGroup[currentGroup.length - 1].dateStr,
          horas: currentGroup.length,
          corrienteMin: minCurrent
        });
      }
      currentGroup = [];
    }
  }

  if (currentGroup.length >= 3) {
    const minCurrent = Math.min(...currentGroup.map(item => item.ocean_current_velocity));
    episodios.push({
      inicio: currentGroup[0].dateStr,
      fin: currentGroup[currentGroup.length - 1].dateStr,
      horas: currentGroup.length,
      corrienteMin: minCurrent
    });
  }

  return episodios.sort((a, b) => b.horas - a.horas);
}

// 4. Riesgo de Floración Algal Nociva (FAN) - Proxy físico
// Índice ponderado (0 a 1) y clasificado en NORMAL, VIGILANCIA, ALERTA TEMPRANA
export type NivelFan = 'NORMAL' | 'VIGILANCIA' | 'ALERTA TEMPRANA';

export interface FanRiskResult {
  index: number;
  nivel: NivelFan;
}

export function calculateFanRisk(row: MeteorologicalData): FanRiskResult {
  // Corriente baja (renovación lenta) -> mayor riesgo
  const currentRisk = 1 - scale(row.ocean_current_velocity, 0.03, 0.42);
  // Viento bajo (aguas calmas) -> mayor riesgo
  const windRisk = 1 - scale(row.wind_speed_10m, 4, 52);
  // Temperatura alta (calor solar) -> mayor riesgo
  const tempRisk = scale(row.temperature_2m, 5, 15);
  // Presión estable (cambios std 6h muy bajos) -> mayor riesgo
  const pressStabilityRisk = 1 - scale(row.pressure_std_6h, 0.05, 3.2);

  // Combinación ponderada
  const index = 0.35 * currentRisk + 0.25 * windRisk + 0.25 * tempRisk + 0.15 * pressStabilityRisk;

  // Umbrales basados en percentiles del notebook (vigilancia en 0.58, alerta temprana en 0.70)
  let nivel: NivelFan = 'NORMAL';
  if (index >= 0.68) {
    nivel = 'ALERTA TEMPRANA';
  } else if (index >= 0.52) {
    nivel = 'VIGILANCIA';
  }

  return {
    index: Math.round(index * 100) / 100,
    nivel
  };
}

// Obtener periodos de alerta temprana de FAN (marea roja)
export interface AlertaFanPeriod {
  inicio: string;
  fin: string;
  horas: number;
  indiceMax: number;
}

export function getFanAlertPeriods(series: MeteorologicalData[]): AlertaFanPeriod[] {
  const periodos: AlertaFanPeriod[] = [];
  let currentGroup: MeteorologicalData[] = [];

  for (let i = 0; i < series.length; i++) {
    const fan = calculateFanRisk(series[i]);
    if (fan.nivel === 'ALERTA TEMPRANA') {
      currentGroup.push(series[i]);
    } else {
      if (currentGroup.length > 0) {
        const maxIdx = Math.max(...currentGroup.map(item => calculateFanRisk(item).index));
        periodos.push({
          inicio: currentGroup[0].dateStr,
          fin: currentGroup[currentGroup.length - 1].dateStr,
          horas: currentGroup.length,
          indiceMax: maxIdx
        });
      }
      currentGroup = [];
    }
  }

  if (currentGroup.length > 0) {
    const maxIdx = Math.max(...currentGroup.map(item => calculateFanRisk(item).index));
    periodos.push({
      inicio: currentGroup[0].dateStr,
      fin: currentGroup[currentGroup.length - 1].dateStr,
      horas: currentGroup.length,
      indiceMax: maxIdx
    });
  }

  return periodos.sort((a, b) => b.horas - a.horas);
}

// 5. Planificación de ventanas de cosecha
// Bloques de horas consecutivas en estado OPERATIVO con menor riesgo_index promedio
export interface VentanaCosecha {
  inicio: string;
  fin: string;
  horas: number;
  oleajeMax: number;
  riesgoPromedio: number;
}

export function getHarvestWindows(series: MeteorologicalData[], thresholds: Thresholds): VentanaCosecha[] {
  const windows: VentanaCosecha[] = [];
  let currentGroup: MeteorologicalData[] = [];

  for (let i = 0; i < series.length; i++) {
    const state = getPontonState(series[i], thresholds);
    if (state === 'OPERATIVO') {
      currentGroup.push(series[i]);
    } else {
      if (currentGroup.length >= 4) {
        // Calcular índice de riesgo simple (0-1) para el bloque
        const risks = currentGroup.map(row => {
          const wHeightNorm = scale(row.wave_height, 0.08, 1.1);
          const gustsNorm = scale(row.wind_gusts_10m, 10, 80);
          const swellNorm = scale(row.swell_wave_height, 0.02, 0.5);
          return 0.35 * wHeightNorm + 0.25 * gustsNorm + 0.25 * swellNorm;
        });
        const avgRisk = risks.reduce((sum, r) => sum + r, 0) / risks.length;
        const maxWave = Math.max(...currentGroup.map(row => row.wave_height));

        windows.push({
          inicio: currentGroup[0].dateStr,
          fin: currentGroup[currentGroup.length - 1].dateStr,
          horas: currentGroup.length,
          oleajeMax: maxWave,
          riesgoPromedio: Math.round(avgRisk * 100) / 100
        });
      }
      currentGroup = [];
    }
  }

  if (currentGroup.length >= 4) {
    const risks = currentGroup.map(row => {
      const wHeightNorm = scale(row.wave_height, 0.08, 1.1);
      const gustsNorm = scale(row.wind_gusts_10m, 10, 80);
      const swellNorm = scale(row.swell_wave_height, 0.02, 0.5);
      return 0.35 * wHeightNorm + 0.25 * gustsNorm + 0.25 * swellNorm;
    });
    const avgRisk = risks.reduce((sum, r) => sum + r, 0) / risks.length;
    const maxWave = Math.max(...currentGroup.map(row => row.wave_height));

    windows.push({
      inicio: currentGroup[0].dateStr,
      fin: currentGroup[currentGroup.length - 1].dateStr,
      horas: currentGroup.length,
      oleajeMax: maxWave,
      riesgoPromedio: Math.round(avgRisk * 100) / 100
    });
  }

  // Ordenar primero por mayor cantidad de horas, luego por menor riesgo promedio
  return windows.sort((a, b) => b.horas - a.horas || a.riesgoPromedio - b.riesgoPromedio);
}

// ----------------------------------------------------
// RESUMEN ECONÓMICO Y DE ESTADOS
// ----------------------------------------------------
export interface FinancialSummary {
  horasOperativo: number;
  horasAlerta: number;
  horasCerrado: number;
  perdidaTotalCLP: number;
  perdidaPromedioDiariaCLP: number;
}

export function calculateFinancialSummary(series: MeteorologicalData[], thresholds: Thresholds): FinancialSummary {
  let horasOperativo = 0;
  let horasAlerta = 0;
  let horasCerrado = 0;
  let perdidaTotalCLP = 0;

  series.forEach(row => {
    const state = getPontonState(row, thresholds);
    if (state === 'CERRADO') {
      horasCerrado++;
      perdidaTotalCLP += thresholds.costHourClosed;
    } else if (state === 'ALERTA') {
      horasAlerta++;
      perdidaTotalCLP += thresholds.costHourAlert;
    } else {
      horasOperativo++;
    }
  });

  return {
    horasOperativo,
    horasAlerta,
    horasCerrado,
    perdidaTotalCLP,
    perdidaPromedioDiariaCLP: Math.round(perdidaTotalCLP / 10) // 10 días cubiertos
  };
}
