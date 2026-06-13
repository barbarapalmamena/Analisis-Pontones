"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  generateSeriesData, 
  DEFAULT_THRESHOLDS, 
  Thresholds, 
  getPontonState, 
  calculateFinancialSummary, 
  calculateLogistics, 
  calculateStructuralStress, 
  getMaintenanceWindows, 
  getOxygenationRiskEpisodes, 
  calculateFanRisk, 
  getFanAlertPeriods, 
  getHarvestWindows,
  MeteorologicalData
} from '../lib/data';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';

import { 
  Ship, 
  Anchor, 
  Activity, 
  Thermometer, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  Wind, 
  Clock, 
  Layers, 
  ShieldAlert, 
  Cpu,
  Waves,
  TrendingDown,
  Info
} from 'lucide-react';

export default function DashboardPage() {
  // 1. Estados de navegación y simulación
  const [activeTab, setActiveTab] = useState<'telemetria' | 'jaulas' | 'logistica' | 'alertas' | 'sensibilidad'>('telemetria');
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [selectedCage, setSelectedCage] = useState<number>(101);

  // 2. Base de datos reactiva para simular tiempo real
  const [baseData, setBaseData] = useState<MeteorologicalData[]>([]);
  const [dataSourceMode, setDataSourceMode] = useState<'SIMULACION' | 'API_REAL'>('SIMULACION');
  
  // Lista de jaulas reactiva
  const [cageList, setCageList] = useState([
    { id: 101, status: 'OPERATIVO', oxygen: 8.2, temp: 10.2, fishCount: 42000, avgWeight: 3.8, feedingRate: 98 },
    { id: 102, status: 'OPERATIVO', oxygen: 7.9, temp: 10.3, fishCount: 41500, avgWeight: 3.9, feedingRate: 95 },
    { id: 103, status: 'ALERTA', oxygen: 6.1, temp: 10.4, fishCount: 43000, avgWeight: 4.1, feedingRate: 75 },
    { id: 104, status: 'OPERATIVO', oxygen: 8.0, temp: 10.1, fishCount: 40800, avgWeight: 3.7, feedingRate: 99 },
    { id: 105, status: 'OPERATIVO', oxygen: 8.3, temp: 10.2, fishCount: 42500, avgWeight: 3.9, feedingRate: 96 },
    { id: 106, status: 'CERRADO', oxygen: 5.2, temp: 10.5, fishCount: 44000, avgWeight: 4.2, feedingRate: 0 },
    { id: 107, status: 'OPERATIVO', oxygen: 7.8, temp: 10.2, fishCount: 41200, avgWeight: 3.8, feedingRate: 94 },
    { id: 108, status: 'OPERATIVO', oxygen: 8.1, temp: 10.3, fishCount: 41900, avgWeight: 3.9, feedingRate: 97 },
    { id: 109, status: 'ALERTA', oxygen: 6.4, temp: 10.3, fishCount: 42200, avgWeight: 4.0, feedingRate: 80 },
    { id: 110, status: 'OPERATIVO', oxygen: 8.2, temp: 10.1, fishCount: 40900, avgWeight: 3.7, feedingRate: 98 },
    { id: 111, status: 'OPERATIVO', oxygen: 7.9, temp: 10.2, fishCount: 43100, avgWeight: 4.1, feedingRate: 95 },
    { id: 112, status: 'OPERATIVO', oxygen: 8.0, temp: 10.2, fishCount: 42800, avgWeight: 4.0, feedingRate: 96 }
  ]);

  // Inicializar cargando datos de la simulación temporal local
  useEffect(() => {
    setBaseData(generateSeriesData());
  }, []);

  // Consultar periódicamente la API y manejar la transición de Simulación a API Real
  useEffect(() => {
    async function chequearAPI() {
      try {
        const res = await fetch('/api/telemetria');
        const apiData = await res.json();
        
        if (apiData && apiData.length > 0) {
          // Si la API contiene datos reales cargados, cambiar a modo API Real
          setBaseData(apiData);
          setDataSourceMode('API_REAL');
        }
      } catch (err) {
        console.error("Error al consultar /api/telemetria", err);
      }
    }

    // Comprobar la API inicialmente
    chequearAPI();

    // Consultar cada 4 segundos
    const apiInterval = setInterval(chequearAPI, 4000);
    return () => clearInterval(apiInterval);
  }, []);

  // Simulación local activa SOLO si no hay datos reales en la API
  useEffect(() => {
    if (baseData.length === 0 || dataSourceMode === 'API_REAL') return;

    const simInterval = setInterval(() => {
      setBaseData(prevData => {
        const lastPoint = prevData[prevData.length - 1];
        const nextDate = new Date(new Date(lastPoint.date).getTime() + 60 * 60 * 1000);
        
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
          wave_height_roll3: 0,
          wind_gusts_roll3: 0,
          swell_roll3: 0,
          pressure_change_3h: 0,
          pressure_change_6h: 0,
          pressure_std_6h: 0.1,
          wave_height_forecast: Math.max(0.05, Math.round((nextWave + (Math.random() - 0.5) * 0.05) * 100) / 100)
        };
        
        const newSeries = [...prevData.slice(1), nextPoint];
        
        const lastIdx = newSeries.length - 1;
        const slice3 = newSeries.slice(lastIdx - 2, lastIdx + 1);
        newSeries[lastIdx].wave_height_roll3 = Math.round((slice3.reduce((sum, item) => sum + item.wave_height, 0) / 3) * 100) / 100;
        newSeries[lastIdx].wind_gusts_roll3 = Math.round((slice3.reduce((sum, item) => sum + item.wind_gusts_10m, 0) / 3) * 10) / 10;
        newSeries[lastIdx].swell_roll3 = Math.round((slice3.reduce((sum, item) => sum + item.swell_wave_height, 0) / 3) * 100) / 100;
        
        newSeries[lastIdx].pressure_change_3h = Math.round((newSeries[lastIdx].pressure_msl - newSeries[lastIdx - 3].pressure_msl) * 10) / 10;
        newSeries[lastIdx].pressure_change_6h = Math.round((newSeries[lastIdx].pressure_msl - newSeries[lastIdx - 6].pressure_msl) * 10) / 10;

        const slice6 = newSeries.slice(lastIdx - 5, lastIdx + 1);
        const meanPress = slice6.reduce((sum, item) => sum + item.pressure_msl, 0) / 6;
        const variance = slice6.reduce((sum, item) => sum + Math.pow(item.pressure_msl - meanPress, 2), 0) / 5;
        newSeries[lastIdx].pressure_std_6h = Math.round(Math.sqrt(variance) * 100) / 100;

        return newSeries;
      });

      // Fluctuar los sensores de las jaulas
      setCageList(prevCages => {
        return prevCages.map(cage => {
          if (cage.status === 'CERRADO') return cage;
          
          const o2Delta = (Math.random() - 0.5) * 0.18;
          const newO2 = Math.max(4.2, Math.min(9.8, Math.round((cage.oxygen + o2Delta) * 10) / 10));
          
          let status = 'OPERATIVO';
          if (newO2 < 6.5) {
            status = 'ALERTA';
          }
          
          const feedDelta = (Math.random() - 0.5) * 1.5;
          const newFeed = Math.max(60, Math.min(100, Math.round((cage.feedingRate + feedDelta))));
          
          return {
            ...cage,
            oxygen: newO2,
            feedingRate: status === 'ALERTA' ? Math.max(45, newFeed - 8) : newFeed,
            status
          };
        });
      });
    }, 3600000);

    return () => clearInterval(simInterval);
  }, [baseData, dataSourceMode]);

  if (baseData.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#16161A', color: '#F0EFFF' }}>
        <div style={{ textAlign: 'center' }}>
          <Activity size={48} className="statusDot" style={{ color: '#7F77DD', animation: 'pulse 1.5s infinite', margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontFamily: 'var(--font-title)' }}>Inicializando boya oceanográfica...</h2>
        </div>
      </div>
    );
  }

  // Cálculos reactivos
  const dynamicSummary = calculateFinancialSummary(baseData, thresholds);
  const latestData = baseData[baseData.length - 1];
  const latestState = getPontonState(latestData, thresholds);

  const logisticsState = calculateLogistics(latestData);
  const percentNavegable = Math.round((baseData.filter(d => calculateLogistics(d) === 'NAVEGAR').length / baseData.length) * 100);

  const structuralStress = calculateStructuralStress(latestData);
  const maintenanceWindows = getMaintenanceWindows(baseData);
  const oxygenationEpisodes = getOxygenationRiskEpisodes(baseData);
  const fanRisk = calculateFanRisk(latestData);
  const fanAlertPeriods = getFanAlertPeriods(baseData);
  const harvestWindows = getHarvestWindows(baseData, thresholds);

  const handleThresholdChange = (key: keyof Thresholds, value: number) => {
    setThresholds(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const formatCLP = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="appContainer">
      {/* Barra de navegación lateral */}
      <aside className="sidebar">
        <div className="logoArea">
          <Cpu size={28} color="#7F77DD" />
          <span className="logoText">Salmonera X</span>
        </div>

        <div className="sidebarCenterInfo">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Centro Activo</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-light)' }}>Canal Tenglo I</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-soft)', display: 'block' }}>ID: PM-849-01</span>
        </div>

        <nav className="navMenu">
          <button 
            className={`navItem ${activeTab === 'telemetria' ? 'navActive' : ''}`}
            onClick={() => setActiveTab('telemetria')}
          >
            <Activity size={18} />
            <span>Telemetría</span>
          </button>

          <button 
            className={`navItem ${activeTab === 'jaulas' ? 'navActive' : ''}`}
            onClick={() => setActiveTab('jaulas')}
          >
            <Layers size={18} />
            <span>Jaulas</span>
          </button>
          
          <button 
            className={`navItem ${activeTab === 'logistica' ? 'navActive' : ''}`}
            onClick={() => setActiveTab('logistica')}
          >
            <Ship size={18} />
            <span>Logística</span>
          </button>
          
          <button 
            className={`navItem ${activeTab === 'alertas' ? 'navActive' : ''}`}
            onClick={() => setActiveTab('alertas')}
          >
            <ShieldAlert size={18} />
            <span>Alertas</span>
          </button>
          
          <button 
            className={`navItem ${activeTab === 'sensibilidad' ? 'navActive' : ''}`}
            onClick={() => setActiveTab('sensibilidad')}
          >
            <DollarSign size={18} />
            <span>Riesgo</span>
          </button>
        </nav>

        <div className="sidebarFooter">
          <div className="badge badgeStatus" style={{ display: 'block', textAlign: 'center' }}>
            Servidor Local Online
          </div>
        </div>
      </aside>

      {/* Contenedor principal de contenidos */}
      <main className="mainContent">
        
        {/* Cabecera Móvil (sólo visible en móviles) */}
        <div className="mobileTopBar">
          <div className="logoArea">
            <Cpu size={22} color="#7F77DD" />
            <span className="logoText">Salmonera X</span>
          </div>
          <span className="mobileCenterBadge">Tenglo I</span>
        </div>
        
        {/* Cabecera del Dashboard */}
        <header className="header">
          <div className="titleArea">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              Panel de Control de Telemetría
              {dataSourceMode === 'API_REAL' ? (
                <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid #10B981', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '6px', height: '6px', backgroundColor: '#10B981', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
                  API SENSORS CONNECTED
                </span>
              ) : (
                <span className="badge" style={{ backgroundColor: 'rgba(127, 119, 221, 0.1)', color: '#AFA9EC', border: '1px solid #7F77DD', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '6px', height: '6px', backgroundColor: '#7F77DD', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  SIMULATION ACTIVE (WAITING FOR API)
                </span>
              )}
            </h1>
            <p>Monitoreo climático, oceanográfico e IoT para la toma de decisiones en el centro de cultivo.</p>
          </div>
          
          <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={16} color="#AFA9EC" />
            <span style={{ fontSize: '0.9rem', color: '#F0EFFF' }}>
              Transmisión en vivo: <strong>{latestData.dateStr}</strong>
            </span>
          </div>
        </header>

        {/* Semáforo de Estado Operativo del Centro (Pontón + Faenas) */}
        <div className="statusBanner" style={{
          backgroundColor: latestState === 'CERRADO' ? 'rgba(239, 68, 68, 0.15)' : latestState === 'ALERTA' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${latestState === 'CERRADO' ? '#EF4444' : latestState === 'ALERTA' ? '#F59E0B' : '#10B981'}`,
          color: latestState === 'CERRADO' ? '#FEE2E2' : latestState === 'ALERTA' ? '#FEF3C7' : '#D1FAE5'
        }}>
          <div className="statusIndicator">
            <div className="statusDot" style={{
              color: latestState === 'CERRADO' ? '#EF4444' : latestState === 'ALERTA' ? '#F59E0B' : '#10B981',
              backgroundColor: latestState === 'CERRADO' ? '#EF4444' : latestState === 'ALERTA' ? '#F59E0B' : '#10B981'
            }} />
            <div className="statusInfo">
              <h2>ESTADO DEL PONTÓN: {latestState}</h2>
              <p>
                {latestState === 'CERRADO' 
                  ? 'EVACUACIÓN PREVENTIVA ACTIVA. Queda estrictamente prohibida la permanencia de operarios en el pontón.' 
                  : latestState === 'ALERTA' 
                    ? 'ALERTA METEOROLÓGICA. Operaciones en pasillos limitadas. Uso obligatorio de arnés de seguridad.' 
                    : 'CONDICIONES ÓPTIMAS. Pontón operativo. Tareas de alimentación e inspección autorizadas.'}
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.7, display: 'block', textTransform: 'uppercase' }}>Altura de Ola</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 700 }}>{latestData.wave_height} m</span>
          </div>
        </div>



        {/* PESTAÑA 1: TELEMETRÍA Y CLIMA */}
        {activeTab === 'telemetria' && (
          <div>
            {/* KPI Cards Grid */}
            <div className="gridKpi">
              <div className="card kpiCard">
                <span className="kpiTitle">Oleaje Máximo</span>
                <span className="kpiValue">{latestData.wave_height} m</span>
                <div className="kpiMeta">
                  <Waves size={14} />
                  <span>Swell: {latestData.swell_wave_height} m</span>
                </div>
              </div>
              <div className="card kpiCard">
                <span className="kpiTitle">Rachas de Viento</span>
                <span className="kpiValue">{latestData.wind_gusts_10m} km/h</span>
                <div className="kpiMeta">
                  <Wind size={14} />
                  <span>Viento Medio: {latestData.wind_speed_10m} km/h</span>
                </div>
              </div>
              <div className="card kpiCard">
                <span className="kpiTitle">Presión del Aire</span>
                <span className="kpiValue">{latestData.pressure_msl} hPa</span>
                <div className="kpiMeta">
                  <Activity size={14} />
                  <span>Tendencia 3h: {latestData.pressure_change_3h} hPa</span>
                </div>
              </div>
              <div className="card kpiCard">
                <span className="kpiTitle">Corriente Oceanográfica</span>
                <span className="kpiValue">{latestData.ocean_current_velocity} m/s</span>
                <div className="kpiMeta">
                  <Thermometer size={14} />
                  <span>Temp. Agua: {latestData.temperature_2m} °C</span>
                </div>
              </div>
            </div>

            {/* Dashboard Sections */}
            <div className="dashboardSection">
              <div className="largeSection">
                {/* Gráfico de Oleaje y Swell con Pronóstico */}
                <div className="card">
                  <h3>Altura de Olas y Pronóstico de Oleaje (+3h)</h3>
                  <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1rem' }}>
                    Historial de sensores de boya oceanográfica y predicción para planificación de cosechas.
                  </p>
                  
                  <div className="chartContainer">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={baseData.slice(-48)}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorWave" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7F77DD" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#7F77DD" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(175,169,236,0.1)" />
                        <XAxis dataKey="dateStr" stroke="#94A3B8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#2C2C2A', border: '1px solid rgba(175,169,236,0.2)', color: '#F0EFFF' }} />
                        <Legend verticalAlign="top" height={36}/>
                        <Area type="monotone" dataKey="wave_height" name="Oleaje Real (m)" stroke="#7F77DD" fillOpacity={1} fill="url(#colorWave)" strokeWidth={2} />
                        <Line type="monotone" dataKey="wave_height_forecast" name="Proyección de Oleaje (+3h)" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfico de Viento Medio y Ráfagas */}
                <div className="card">
                  <h3>Anemómetro: Viento y Rachas Máximas (km/h)</h3>
                  <div className="chartContainer">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={baseData.slice(-48)}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(175,169,236,0.1)" />
                        <XAxis dataKey="dateStr" stroke="#94A3B8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#2C2C2A', border: '1px solid rgba(175,169,236,0.2)', color: '#F0EFFF' }} />
                        <Legend verticalAlign="top" height={36}/>
                        <Line type="monotone" dataKey="wind_speed_10m" name="Velocidad del Viento (km/h)" stroke="#F59E0B" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="wind_gusts_10m" name="Rachas (km/h)" stroke="#EF4444" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="sidebarSection">
                {/* Distribución de Estados en el Periodo */}
                <div className="card">
                  <h3>Resumen Operativo (10 días)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#10B981' }}>Operativo:</span>
                      <strong>{dynamicSummary.horasOperativo} hrs ({(dynamicSummary.horasOperativo / 2.4).toFixed(1)}%)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#F59E0B' }}>Alerta:</span>
                      <strong>{dynamicSummary.horasAlerta} hrs ({(dynamicSummary.horasAlerta / 2.4).toFixed(1)}%)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#EF4444' }}>Cerrado:</span>
                      <strong>{dynamicSummary.horasCerrado} hrs ({(dynamicSummary.horasCerrado / 2.4).toFixed(1)}%)</strong>
                    </div>
                  </div>
                </div>

                {/* Pérdidas Económicas Recurrentes */}
                <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EF4444' }}>
                    <AlertTriangle size={18} />
                    <span>Costo de No-Operación</span>
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    Pérdidas estimadas por demoras logísticas y detención de sistemas de alimentación.
                  </p>
                  <div style={{ margin: '1.25rem 0 0.5rem 0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>PÉRDIDA TOTAL ESTIMADA</span>
                    <h2 style={{ fontSize: '1.85rem', color: '#EF4444', fontWeight: 700 }}>{formatCLP(dynamicSummary.perdidaTotalCLP)}</h2>
                  </div>
                </div>

                {/* Telemetría Atmosférica */}
                <div className="card">
                  <h3>Boya Telemetría</h3>
                  <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Estación base:</span>
                      <span>Canal Tenglo I</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Sensor de Corriente:</span>
                      <span>{latestData.ocean_current_velocity} m/s</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Precipitaciones:</span>
                      <span>{latestData.precipitation} mm</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Cobertura nubes:</span>
                      <span>{latestData.cloud_cover}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: ESTADO DE JAULAS */}
        {activeTab === 'jaulas' && (
          <div>
            <div className="dashboardSection" style={{ gridTemplateColumns: '1fr' }}>
              <div className="card">
                <h2>Estado Sanitario y de Alimentación de Jaulas (Módulo A)</h2>
                <p style={{ color: '#94A3B8', marginBottom: '1.5rem' }}>
                  Sensores IoT sumergidos en tiempo real por cada jaula. Monitoreo de oxígeno disuelto y consumo de alimento. Los valores varían en vivo simulando telemetría real.
                </p>

                <div className="cageGrid">
                  {cageList.map((cage) => {
                    const isLowO2 = cage.oxygen < 6.5;
                    const isFast = cage.feedingRate === 0;
                    
                    return (
                      <div 
                        key={cage.id} 
                        className="card" 
                        onClick={() => setSelectedCage(cage.id)}
                        style={{ 
                          cursor: 'pointer',
                          borderColor: selectedCage === cage.id 
                            ? 'var(--accent-color)' 
                            : cage.status === 'CERRADO' 
                              ? '#EF4444' 
                              : cage.status === 'ALERTA' 
                                ? '#F59E0B' 
                                : 'var(--glass-border)',
                          backgroundColor: selectedCage === cage.id ? 'rgba(127,119,221,0.08)' : 'var(--glass-bg)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <h4 style={{ fontSize: '1.15rem' }}>Jaula {cage.id}</h4>
                          <span className="badge" style={{
                            backgroundColor: cage.status === 'CERRADO' ? 'rgba(239, 68, 68, 0.1)' : cage.status === 'ALERTA' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: cage.status === 'CERRADO' ? '#EF4444' : cage.status === 'ALERTA' ? '#F59E0B' : '#10B981'
                          }}>
                            {cage.status === 'CERRADO' ? 'Ayuno / Alerta' : cage.status === 'ALERTA' ? 'Oxígeno Bajo' : 'Alimentando'}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94A3B8' }}>Oxígeno Disuelto:</span>
                            <span style={{ color: isLowO2 ? '#EF4444' : '#10B981', fontWeight: 600 }}>{cage.oxygen} mg/L</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94A3B8' }}>Tasa Alimentación:</span>
                            <span style={{ color: isFast ? '#EF4444' : '#10B981', fontWeight: 600 }}>{cage.feedingRate}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94A3B8' }}>Peso Promedio:</span>
                            <span>{cage.avgWeight} kg</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Ficha técnica detallada de jaula seleccionada */}
            {selectedCage && (
              <div className="card" style={{ marginTop: '2rem' }}>
                <h3>Detalle de Telemetría: Jaula {selectedCage}</h3>
                <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Visualización de parámetros avanzados del sistema de alimentación neumático y sensores biológicos.</p>
                
                {(() => {
                  const cageObj = cageList.find(c => c.id === selectedCage);
                  if (!cageObj) return null;
                  return (
                    <div className="cageDetailGrid">
                      <div className="card kpiCard" style={{ backgroundColor: '#16161A' }}>
                        <span className="kpiTitle">Biomasa Estimada</span>
                        <span className="kpiValue">{(cageObj.fishCount * cageObj.avgWeight / 1000).toFixed(1)} Ton</span>
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Peces: {cageObj.fishCount.toLocaleString('es-CL')} ind.</span>
                      </div>
                      
                      <div className="card kpiCard" style={{ backgroundColor: '#16161A' }}>
                        <span className="kpiTitle">Tasa de Alimentación FFC</span>
                        <span className="kpiValue" style={{ color: cageObj.feedingRate > 0 ? '#10B981' : '#EF4444' }}>
                          {cageObj.feedingRate} %
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Método: Cámaras infrarrojas SFC</span>
                      </div>

                      <div className="card kpiCard" style={{ backgroundColor: '#16161A' }}>
                        <span className="kpiTitle">Nivel de Oxígeno</span>
                        <span className="kpiValue" style={{ color: cageObj.oxygen < 6.5 ? '#EF4444' : '#10B981' }}>
                          {cageObj.oxygen} mg/L
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Óptimo: &gt; 7.0 mg/L</span>
                      </div>

                      <div className="card kpiCard" style={{ backgroundColor: '#16161A' }}>
                        <span className="kpiTitle">Temperatura del Agua</span>
                        <span className="kpiValue">{cageObj.temp} °C</span>
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Sensor: 5m de profundidad</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: LOGÍSTICA Y FAENAS */}
        {activeTab === 'logistica' && (
          <div>
            <div className="gridKpi">
              <div className="card kpiCard">
                <span className="kpiTitle">Disponibilidad de Navegación</span>
                <span className="kpiValue" style={{ color: '#10B981' }}>{percentNavegable}%</span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Rutas operables en Puerto Montt</span>
              </div>
              <div className="card kpiCard">
                <span className="kpiTitle">wellboats en Ruta</span>
                <span className="kpiValue">2 Activos</span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>"Cabo de Hornos" / "Don Pedro"</span>
              </div>
              <div className="card kpiCard">
                <span className="kpiTitle">Zarpe Actual</span>
                <span className="kpiValue" style={{ color: logisticsState === 'NO NAVEGAR' ? '#EF4444' : '#10B981' }}>
                  {logisticsState === 'NO NAVEGAR' ? 'RESTRINGIDO' : 'AUTORIZADO'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Según Capitanía de Puerto</span>
              </div>
            </div>

            <div className="dashboardSection">
              <div className="largeSection">
                {/* Caso de uso 5: Cosecha */}
                <div className="card">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={18} color="#10B981" />
                    <span>Planificación de Ventanas de Cosecha (wellboats)</span>
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
                    Bloques de tiempo continuos en estado <strong>OPERATIVO</strong> para programar el traslado y descarga de salmones a plantas de proceso sin interrupción climática.
                  </p>

                  <div className="tableWrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Recomendación</th>
                          <th>Inicio Ventana</th>
                          <th>Fin Ventana</th>
                          <th>Duración Continua</th>
                          <th>Oleaje Máximo</th>
                          <th>Riesgo Medio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {harvestWindows.slice(0, 3).map((win, idx) => (
                          <tr key={idx} style={{ backgroundColor: idx === 0 ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                            <td data-label="Recomendación" style={{ fontWeight: 600 }}>{idx === 0 ? '🏆 Prioritaria' : `Alternativa ${idx}`}</td>
                            <td data-label="Inicio Ventana">{win.inicio}</td>
                            <td data-label="Fin Ventana">{win.fin}</td>
                            <td data-label="Duración" style={{ color: '#10B981', fontWeight: 600 }}>{win.horas} horas</td>
                            <td data-label="Oleaje Máx">{win.oleajeMax} m</td>
                            <td data-label="Riesgo Medio">{(win.riesgoPromedio * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Caso de uso 2: Buceo */}
                <div className="card">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Anchor size={18} color="#7F77DD" />
                    <span>Ventanas Recomendadas para Buceo y Mantenimiento de Redes</span>
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
                    Ventanas seguras con nivel de estrés físico bajo para sumergir buzos para limpieza de redes pecera/lobera o revisión de anclajes.
                  </p>

                  <div className="tableWrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Rango Horario</th>
                          <th>Término Ventana</th>
                          <th>Duración de Seguridad</th>
                          <th>Categoría Operación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {maintenanceWindows.slice(0, 3).map((win, idx) => (
                          <tr key={idx}>
                            <td data-label="Rango Horario">{win.inicio}</td>
                            <td data-label="Término Ventana">{win.fin}</td>
                            <td data-label="Duración"><strong>{win.horas} horas</strong></td>
                            <td data-label="Categoría">
                              <span className="badge" style={{ backgroundColor: 'rgba(127,119,221,0.1)', color: '#AFA9EC' }}>
                                Buceo Seguro
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="sidebarSection">
                <div className="card">
                  <h4>Reglas de Zarpe</h4>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', lineHeight: '1.5' }}>
                    Las lanchas rápidas de alimentación no pueden zarpar si:
                  </p>
                  <ul style={{ fontSize: '0.8rem', color: '#EF4444', marginLeft: '1.25rem', marginTop: '0.5rem', lineHeight: '1.5' }}>
                    <li>Altura de ola ≥ 0.4 metros</li>
                    <li>Rachas de viento ≥ 45 km/h</li>
                  </ul>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '1rem', lineHeight: '1.5' }}>
                    El wellboat tolera oleajes mayores pero requiere ventanas libres de cierre para atraque seguro a jaulas de cosecha.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: ALERTAS TEMPRANAS */}
        {activeTab === 'alertas' && (
          <div>
            <div className="dashboardSection">
              <div className="largeSection">
                {/* Oxigenación */}
                <div className="card">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EF4444' }}>
                    <Thermometer size={18} />
                    <span>Riesgo de Oxigenación y Bienestar Animal</span>
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
                    Sensores IOT registran caídas críticas de corrientes marinas por debajo de 0.12 m/s sostenidas por más de 3 horas.
                  </p>

                  <div className="tableWrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Fecha Inicio</th>
                          <th>Fecha Fin</th>
                          <th>Duración Crítica</th>
                          <th>Vel. Mínima</th>
                          <th>Contingencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {oxygenationEpisodes.slice(0, 3).map((ep, idx) => (
                          <tr key={idx}>
                            <td data-label="Fecha Inicio">{ep.inicio}</td>
                            <td data-label="Fecha Fin">{ep.fin}</td>
                            <td data-label="Duración Crítica" style={{ color: '#EF4444', fontWeight: 600 }}>{ep.horas} horas</td>
                            <td data-label="Vel. Mínima">{ep.corrienteMin} m/s</td>
                            <td data-label="Contingencia">
                              <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                                Activar Difusores O2
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* FAN Proxy */}
                <div className="card">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F59E0B' }}>
                    <AlertTriangle size={18} />
                    <span>Índice Proxy de Floración Algal Nociva (FAN / Marea Roja)</span>
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
                    Condiciones físicas óptimas para proliferación de algas: viento bajo (calma vertical), corriente marina baja y temperatura cálida del aire.
                  </p>

                  <div className="tableWrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Periodo Detectado</th>
                          <th>Fin Periodo</th>
                          <th>Horas Acumuladas</th>
                          <th>Índice de Riesgo Máx</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fanAlertPeriods.slice(0, 3).map((p, idx) => (
                          <tr key={idx}>
                            <td data-label="Periodo Detectado">{p.inicio}</td>
                            <td data-label="Fin Periodo">{p.fin}</td>
                            <td data-label="Horas Acumuladas">{p.horas} horas</td>
                            <td data-label="Riesgo Máx" style={{ color: '#F59E0B', fontWeight: 600 }}>{(p.indiceMax * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="sidebarSection">
                <div className="card" style={{ borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                  <h4>¿Qué es el FAN Proxy?</h4>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', lineHeight: '1.5' }}>
                    Las marea rojas provocan asfixia masiva de salmones. Este modelo de alerta temprana física clasifica las variables para saber cuándo aumentar los muestreos microbiológicos obligatorios de fitoplancton.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 5: SIMULACIÓN FINANCIERA */}
        {activeTab === 'sensibilidad' && (
          <div className="card">
            <h2>Simulación Financiera y Límites de Seguridad</h2>
            <p style={{ color: '#94A3B8', marginBottom: '2rem' }}>
              Herramienta de simulación para planificadores de la Gerencia de Operaciones. Modifica los parámetros de costos horarios de detención y los límites de oleaje/viento para evaluar el impacto en pérdidas esperadas.
            </p>

            <div className="dashboardSection">
              <div className="largeSection">
                <div>
                  <h4 style={{ color: '#AFA9EC', marginBottom: '1.25rem' }}>Costos por hora de Inactividad (CLP)</h4>
                  
                  <div className="sliderGroup">
                    <div className="sliderHeader">
                      <span>Costo por hora CERRADO:</span>
                      <strong style={{ color: '#EF4444' }}>{formatCLP(thresholds.costHourClosed)}</strong>
                    </div>
                    <input 
                      type="range" 
                      min="100000" 
                      max="1500000" 
                      step="50000"
                      className="sliderInput" 
                      value={thresholds.costHourClosed} 
                      onChange={(e) => handleThresholdChange('costHourClosed', Number(e.target.value))}
                    />
                  </div>

                  <div className="sliderGroup">
                    <div className="sliderHeader">
                      <span>Costo por hora ALERTA:</span>
                      <strong style={{ color: '#F59E0B' }}>{formatCLP(thresholds.costHourAlert)}</strong>
                    </div>
                    <input 
                      type="range" 
                      min="50000" 
                      max="500000" 
                      step="10000"
                      className="sliderInput" 
                      value={thresholds.costHourAlert} 
                      onChange={(e) => handleThresholdChange('costHourAlert', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ color: '#AFA9EC', marginBottom: '1.25rem' }}>Umbrales Críticos de Operación</h4>
                  
                  <div className="sliderGroup">
                    <div className="sliderHeader">
                      <span>Límite de Oleaje Cierre (m):</span>
                      <strong>{thresholds.waveClosed} m</strong>
                    </div>
                    <input 
                      type="range" 
                      min="0.3" 
                      max="1.0" 
                      step="0.05"
                      className="sliderInput" 
                      value={thresholds.waveClosed} 
                      onChange={(e) => handleThresholdChange('waveClosed', Number(e.target.value))}
                    />
                  </div>

                  <div className="sliderGroup">
                    <div className="sliderHeader">
                      <span>Límite de Rachas Cierre (km/h):</span>
                      <strong>{thresholds.gustsClosed} km/h</strong>
                    </div>
                    <input 
                      type="range" 
                      min="35" 
                      max="75" 
                      step="5"
                      className="sliderInput" 
                      value={thresholds.gustsClosed} 
                      onChange={(e) => handleThresholdChange('gustsClosed', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="sidebarSection">
                <div className="card" style={{ backgroundColor: 'rgba(127,119,221,0.05)' }}>
                  <h4>Cálculo del Escenario</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>PÉRDIDA SIMULADA TOTAL</span>
                      <h2 style={{ fontSize: '1.85rem', color: '#EF4444', fontWeight: 700 }}>
                        {formatCLP(dynamicSummary.perdidaTotalCLP)}
                      </h2>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'block' }}>Días del Periodo:</span>
                      <strong>10 Días</strong>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h4>Optimización del Protocolo</h4>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', lineHeight: '1.4' }}>
                    Un límite permisivo disminuye las horas de inactividad técnica, pero expone los activos a mayor estrés mecánico, aumentando la tasa de fuga de salmones (mortalidad estructural).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
