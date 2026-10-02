import { useState } from "react";

// ═══════════════════════════════════════════════════════════════
// LÓGICA OACI — Anexo 14, Vol. I, 9ª edición (julio 2022)
// Tablas y motor de auditoría verificados contra el texto oficial.
// ═══════════════════════════════════════════════════════════════

const getARCNumber = (length) => {
  const l = parseFloat(length);
  if (isNaN(l) || l <= 0) return null;
  if (l < 800) return 1;
  if (l < 1200) return 2;
  if (l < 1800) return 3;
  return 4;
};

// §3.1.13 — Pendiente media máxima (max-min / longitud total)
const MEAN_SLOPE_LIMITS = { 1: 2.0, 2: 2.0, 3: 1.0, 4: 1.0 };

// §3.1.14 — Pendiente local máxima y restricción de cuartos
// CAMBIO 9ª ed.: restricción 0.8% en cuartos para código 3 SOLO en CAT II/III
const SLOPE_LIMITS = {
  1: { maxLong: 2.0, quarter: 2.0, transverse: 2.0 },
  2: { maxLong: 2.0, quarter: 2.0, transverse: 2.0 },
  3: { maxLong: 1.5, quarter: 1.5, transverse: 1.5 },  // cuarto 0.8 solo CAT II/III
  4: { maxLong: 1.25, quarter: 0.8, transverse: 1.5 },
};

// Retorna el límite de cuartos según código y categoría de operación (9ª ed.)
const getQuarterLimit = (arcNum, opCat) => {
  if (arcNum === 4) return 0.8;
  if (arcNum === 3 && (opCat === "cat2" || opCat === "cat3")) return 0.8;
  if (arcNum === 3) return 1.5;
  return 2.0; // códigos 1 y 2
};

const MIN_WIDTHS = {
  1: { A: 18, B: 18, C: 23 },
  2: { A: 23, B: 23, C: 30 },
  3: { A: 30, B: 30, C: 30, D: 45 },
  4: { C: 45, D: 45, E: 45, F: 60 },
};

const MIN_LENGTHS = { 1: 0, 2: 800, 3: 1200, 4: 1800 };

// ═══════════════════════════════════════════════════════════════
// SUPERFICIES LIMITADORAS DE OBSTÁCULOS (OLS) — Anexo 14, Vol. I, Cap. 4
// Tabla 4-1 (pistas para aproximaciones) y Tabla 4-2 (pistas destinadas al
// despegue). Transcrita y verificada contra Anexo 14 Vol. I, enmienda
// vigente al 3/11/22 (misma edición que cita el resto de esta app).
// Todas las dimensiones en metros salvo pendientes (%).
// ═══════════════════════════════════════════════════════════════

const OLS_TABLE = {
  // ── Aproximación visual ──
  vis1: {
    label: "Visual — núm. clave 1",
    conica: { pendiente: 5, altura: 35 },
    horizInterna: { altura: 45, radio: 2000 },
    aprox: { bordeInterior: 60, distUmbral: 30, divergencia: 10,
      primera: { longitud: 1600, pendiente: 5 } },
    transicion: { pendiente: 20 },
  },
  vis2: {
    label: "Visual — núm. clave 2",
    conica: { pendiente: 5, altura: 55 },
    horizInterna: { altura: 45, radio: 2500 },
    aprox: { bordeInterior: 80, distUmbral: 60, divergencia: 10,
      primera: { longitud: 2500, pendiente: 4 } },
    transicion: { pendiente: 20 },
  },
  vis3: {
    label: "Visual — núm. clave 3",
    conica: { pendiente: 5, altura: 75 },
    horizInterna: { altura: 45, radio: 4000 },
    aprox: { bordeInterior: 150, distUmbral: 60, divergencia: 10,
      primera: { longitud: 3000, pendiente: 3.33 } },
    transicion: { pendiente: 14.3 },
  },
  vis4: {
    label: "Visual — núm. clave 4",
    conica: { pendiente: 5, altura: 100 },
    horizInterna: { altura: 45, radio: 4000 },
    aprox: { bordeInterior: 150, distUmbral: 60, divergencia: 10,
      primera: { longitud: 3000, pendiente: 2.5 } },
    transicion: { pendiente: 14.3 },
  },
  // ── Aproximación que no es de precisión (NPA) ──
  npa12: {
    label: "NPA — núm. clave 1 ó 2",
    conica: { pendiente: 5, altura: 60 },
    horizInterna: { altura: 45, radio: 3500 },
    aprox: { bordeInterior: 140, distUmbral: 60, divergencia: 15,
      primera: { longitud: 2500, pendiente: 3.33 } },
    transicion: { pendiente: 20 },
  },
  npa3: {
    label: "NPA — núm. clave 3",
    conica: { pendiente: 5, altura: 75 },
    horizInterna: { altura: 45, radio: 4000 },
    aprox: { bordeInterior: 280, distUmbral: 60, divergencia: 15,
      primera: { longitud: 3000, pendiente: 2 },
      segunda: { longitud: 3600, pendiente: 2.5, notaLongitudVariable: true },
      seccionHorizontal: { longitudTotal: 15000 } },
    transicion: { pendiente: 14.3 },
  },
  npa4: {
    label: "NPA — núm. clave 4",
    conica: { pendiente: 5, altura: 100 },
    horizInterna: { altura: 45, radio: 4000 },
    aprox: { bordeInterior: 280, distUmbral: 60, divergencia: 15,
      primera: { longitud: 3000, pendiente: 2 },
      segunda: { longitud: 3600, pendiente: 2.5, notaLongitudVariable: true },
      seccionHorizontal: { longitudTotal: 15000 } },
    transicion: { pendiente: 14.3 },
  },
  // ── Aproximación de precisión CAT I ──
  cat1_12: {
    label: "CAT I — núm. clave 1 ó 2",
    conica: { pendiente: 5, altura: 60 },
    horizInterna: { altura: 45, radio: 3500 },
    aproxInterna: { anchura: 90, distUmbral: 60, longitud: 900, pendiente: 2.5 },
    aprox: { bordeInterior: 140, distUmbral: 60, divergencia: 15,
      primera: { longitud: 3000, pendiente: 2.5 },
      segunda: { longitud: 12000, pendiente: 3 },
      seccionHorizontal: { longitudTotal: 15000 } },
    transicion: { pendiente: 14.3 },
    transicionInterna: { pendiente: 40 },
    aterrInterrump: { bordeInterior: 90, distUmbral: "hasta extremo de franja", divergencia: 10, pendiente: 4 },
  },
  cat1_34: {
    label: "CAT I — núm. clave 3 ó 4",
    conica: { pendiente: 5, altura: 100 },
    horizInterna: { altura: 45, radio: 4000 },
    aproxInterna: { anchura: 120, anchuraNota: "120 m; 140 m si letra de clave F (salvo aviónica digital con mando de dirección para motor-y-al-aire)",
      distUmbral: 60, longitud: 900, pendiente: 2 },
    aprox: { bordeInterior: 280, distUmbral: 60, divergencia: 15,
      primera: { longitud: 3000, pendiente: 2 },
      segunda: { longitud: 3600, pendiente: 2.5, notaLongitudVariable: true },
      seccionHorizontal: { longitudTotal: 15000 } },
    transicion: { pendiente: 14.3 },
    transicionInterna: { pendiente: 33.3 },
    aterrInterrump: { bordeInterior: 120, distUmbral: 1800, divergencia: 10, pendiente: 3.33,
      distUmbralNota: "1800 m, o hasta el extremo de pista si esa distancia es menor" },
  },
  // ── Aproximación de precisión CAT II / III (solo núm. clave 3 ó 4) ──
  cat23_34: {
    label: "CAT II/III — núm. clave 3 ó 4",
    conica: { pendiente: 5, altura: 100 },
    horizInterna: { altura: 45, radio: 4000 },
    aproxInterna: { anchura: 120, distUmbral: 60, longitud: 900, pendiente: 2 },
    aprox: { bordeInterior: 280, distUmbral: 60, divergencia: 15,
      primera: { longitud: 3000, pendiente: 2 },
      segunda: { longitud: 3600, pendiente: 2.5, notaLongitudVariable: true },
      seccionHorizontal: { longitudTotal: 15000 } },
    transicion: { pendiente: 14.3 },
    transicionInterna: { pendiente: 33.3 },
    aterrInterrump: { bordeInterior: 120, distUmbral: 1800, divergencia: 10, pendiente: 3.33,
      distUmbralNota: "1800 m, o hasta el extremo de pista si esa distancia es menor" },
  },
};

// Selecciona la columna de la Tabla 4-1 según categoría de aproximación + número de clave
const getOLSKey = (opCat, arcNum) => {
  const n = parseInt(arcNum);
  if (opCat === "visual") return "vis" + Math.min(Math.max(n, 1), 4);
  if (opCat === "npa") return n <= 2 ? "npa12" : (n === 3 ? "npa3" : "npa4");
  if (opCat === "cat1") return n <= 2 ? "cat1_12" : "cat1_34";
  if (opCat === "cat2" || opCat === "cat3") return "cat23_34"; // solo definida para código 3/4
  return null;
};

// Tabla 4-2 — Superficie de ascenso en el despegue (solo depende del número de clave)
const TOCS_TABLE = {
  1: { bordeInterior: 60, distExtremo: 30, divergencia: 10, anchuraFinal: 380, longitud: 1600, pendiente: 5 },
  2: { bordeInterior: 80, distExtremo: 60, divergencia: 10, anchuraFinal: 580, longitud: 2500, pendiente: 4 },
  3: { bordeInterior: 180, distExtremo: 60, divergencia: 12.5, anchuraFinal: 1200,
    anchuraFinalNota: "1200 m; 1800 m si la derrota prevista incluye cambios de rumbo > 15° en IMC o en VMC nocturno",
    longitud: 15000, pendiente: 2 },
  4: { bordeInterior: 180, distExtremo: 60, divergencia: 12.5, anchuraFinal: 1200,
    anchuraFinalNota: "1200 m; 1800 m si la derrota prevista incluye cambios de rumbo > 15° en IMC o en VMC nocturno",
    longitud: 15000, pendiente: 2 },
};

const getCompatibleLetters = (arcNum) =>
  Object.keys(MIN_WIDTHS[parseInt(arcNum)] || {}).sort();

const inferLetter = (width, arcNum) => {
  const w = parseFloat(width);
  const widths = MIN_WIDTHS[arcNum];
  if (!widths || isNaN(w)) return "?";
  const compatible = Object.entries(widths)
    .filter(([, min]) => w >= min)
    .map(([l]) => l)
    .sort();
  if (!compatible.length) return "<" + Object.keys(widths).sort()[0];
  // El ancho de pista es un requisito MÍNIMO por letra de clave (Anexo 14, Tabla 3-1);
  // varias letras comparten el mismo mínimo (p.ej. código 4: C/D/E = 45 m). La letra real
  // depende de la envergadura y/o separación entre ruedas exteriores del tren principal
  // (OMGWS) de la aeronave crítica, no solo del ancho de pista. Sin ese dato, se infiere
  // la letra MÁS CONSERVADORA compatible (p.ej. 45 m en código 4 ⇒ "C", no "E").
  return compatible[0];
};

// ═══════════════════════════════════════════════════════════════
// GEORREFERENCIACIÓN Y CHEQUEO DE OBSTÁCULOS — Anexo 14, Vol. I, Cap. 4
//
// Convención de ejes por cabecera (p.ej. "02", rumbo verdadero 022°):
//   Origen = umbral de esa cabecera. El eje +X apunta en el RECÍPROCO del
//   rumbo verdadero (p.ej. 202° para la cabecera "02") — es decir, hacia
//   AFUERA de la pista, alejándose de la cabecera opuesta.
//   +Y = lateral, perpendicular a X (a la derecha mirando en esa dirección).
//
// Por qué el despegue usa el MISMO (X,Y) que la aproximación de esta cabecera:
//   La superficie de aproximación de "02" y la superficie de ascenso en el
//   despegue de los vuelos que despegan por la cabecera OPUESTA ("20") ocupan
//   el mismo lado del aeródromo (el espacio aéreo más allá del umbral "02"),
//   así que ambas se evalúan con el mismo sistema de coordenadas — solo
//   cambian las dimensiones de la Tabla 4-1 (aproximación) vs Tabla 4-2 (ascenso).
//   La franja/pista física, en cambio, queda del lado NEGATIVO de X (entre
//   X=0 y X=-longitudPista, hacia la cabecera opuesta).
//
// Aproximación de tierra plana (equirectangular) — válida para los alcances
// de las superficies OLS (≤ 15 km). No reemplaza un levantamiento geodésico.
// ═══════════════════════════════════════════════════════════════

const dmsToDec = (deg, min, sec, hemi) => {
  const dd = parseFloat(deg) || 0, mm = parseFloat(min) || 0, ss = parseFloat(sec) || 0;
  const val = Math.abs(dd) + mm / 60 + ss / 3600;
  return (hemi === "S" || hemi === "W") ? -val : val;
};

const R_EARTH = 6378137; // radio ecuatorial WGS84 (m)

// ── UTM (WGS84) → latitud/longitud ──
// Fórmula inversa estándar (Snyder, "Map Projections: A Working Manual").
// Validada por round-trip (ida y vuelta) con coordenadas reales de pista: error < 1 mm.
const utmToLatLon = (zone, hemi, easting, northing) => {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const e = Math.sqrt(e2);
  const x = easting - 500000;
  const y = hemi === "S" ? northing - 10000000 : northing;
  const m = y / k0;
  const mu = m / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu
    + (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu)
    + (21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu)
    + (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu)
    + (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);
  const n1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) * Math.sin(phi1));
  const t1 = Math.tan(phi1) * Math.tan(phi1);
  const c1 = ep2 * Math.cos(phi1) * Math.cos(phi1);
  const r1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1) * Math.sin(phi1), 1.5);
  const d = x / (n1 * k0);
  const lat = phi1 - (n1 * Math.tan(phi1) / r1) * (
    d * d / 2
    - (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * ep2) * Math.pow(d, 4) / 24
    + (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * ep2 - 3 * c1 * c1) * Math.pow(d, 6) / 720
  );
  const lon = (d
    - (1 + 2 * t1 + c1) * Math.pow(d, 3) / 6
    + (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * ep2 + 24 * t1 * t1) * Math.pow(d, 5) / 120
  ) / Math.cos(phi1);
  const lon0 = (zone - 1) * 6 - 180 + 3;
  return { lat: lat * 180 / Math.PI, lon: lon0 + lon * 180 / Math.PI };
};

// Convierte un punto (lat1,lon1) a coordenadas locales X/Y respecto a un
// origen (lat0,lon0), con el eje X orientado según bearingDeg (rumbo verdadero, °).
const geoToLocalXY = (lat0, lon0, lat1, lon1, bearingDeg) => {
  const latRad0 = lat0 * Math.PI / 180;
  const north = (lat1 - lat0) * Math.PI / 180 * R_EARTH;
  const east  = (lon1 - lon0) * Math.PI / 180 * R_EARTH * Math.cos(latRad0);
  const brg = bearingDeg * Math.PI / 180;
  const X = north * Math.cos(brg) + east * Math.sin(brg);
  const Y = east * Math.cos(brg) - north * Math.sin(brg);
  return { X, Y };
};

// ── Superficie de aproximación (y de ascenso en el despegue, misma forma) ──
// Ancho TOTAL a distancia x (≥0) más allá del borde interior.
const approachWidthAt = (aprox, x) => aprox.bordeInterior + 2 * (aprox.divergencia / 100) * Math.max(x, 0);

// Longitud total cubierta por la superficie de aproximación (hasta donde se especifica en la tabla).
const approachTotalLength = (aprox) =>
  aprox.seccionHorizontal ? aprox.seccionHorizontal.longitudTotal :
  aprox.segunda ? (aprox.primera.longitud + aprox.segunda.longitud) :
  aprox.primera.longitud;

// Elevación de la superficie de aproximación en el eje, a distancia x (≥0) desde el borde interior.
const approachElevAt = (aprox, thrElev, x) => {
  const xx = Math.max(x, 0);
  if (xx <= aprox.primera.longitud) return thrElev + (aprox.primera.pendiente / 100) * xx;
  let elev = thrElev + (aprox.primera.pendiente / 100) * aprox.primera.longitud;
  let rem = xx - aprox.primera.longitud;
  if (aprox.segunda) {
    if (rem <= aprox.segunda.longitud) return elev + (aprox.segunda.pendiente / 100) * rem;
    elev += (aprox.segunda.pendiente / 100) * aprox.segunda.longitud;
  }
  return elev; // sección horizontal: se mantiene la elevación alcanzada
};

// Evalúa un punto (X,Y), en el sistema de la cabecera dada, contra SU superficie de aproximación.
const checkApproach = (ols, thrElev, X, Y) => {
  const { aprox } = ols;
  const xRel = X - aprox.distUmbral;
  if (xRel < 0) return { aplica: false, motivo: "Antes del borde interior de la superficie de aproximación (a " + aprox.distUmbral + " m del umbral)" };
  const longTotal = approachTotalLength(aprox);
  if (xRel > longTotal) return { aplica: false, motivo: "Más allá del alcance de la superficie de aproximación (" + longTotal + " m desde el borde interior)" };
  const semiancho = approachWidthAt(aprox, xRel) / 2;
  if (Math.abs(Y) > semiancho) return { aplica: false, motivo: "Fuera del ancho de la superficie en ese punto (semiancho " + semiancho.toFixed(1) + " m)" };
  return { aplica: true, elevSuperficie: approachElevAt(aprox, thrElev, xRel), distancia: xRel, semiancho };
};

// ── Superficie de ascenso en el despegue (Tabla 4-2) ──
// Se evalúa con el MISMO (X,Y) que la aproximación de esta cabecera (ver nota arriba):
// corresponde a los despegues realizados por la cabecera OPUESTA, que climban
// más allá de este umbral.
const tocsWidthAt = (tocs, x) => Math.min(tocs.bordeInterior + 2 * (tocs.divergencia / 100) * Math.max(x, 0), tocs.anchuraFinal);
const tocsElevAt = (tocs, thrElev, x) => thrElev + (tocs.pendiente / 100) * Math.max(x, 0);

const checkTakeoff = (tocs, thrElev, X, Y) => {
  const xRel = X - tocs.distExtremo;
  if (xRel < 0) return { aplica: false, motivo: "Antes del borde interior de la superficie de ascenso (a " + tocs.distExtremo + " m del extremo)" };
  if (xRel > tocs.longitud) return { aplica: false, motivo: "Más allá del alcance de la superficie de ascenso (" + tocs.longitud + " m)" };
  const semiancho = tocsWidthAt(tocs, xRel) / 2;
  if (Math.abs(Y) > semiancho) return { aplica: false, motivo: "Fuera del ancho de la superficie en ese punto (semiancho " + semiancho.toFixed(1) + " m)" };
  return { aplica: true, elevSuperficie: tocsElevAt(tocs, thrElev, xRel), distancia: xRel, semiancho };
};

// ── Superficie de transición ──
// Corre a lo largo del borde de la franja (lado NEGATIVO de X, hacia la
// cabecera opuesta) y del borde de la superficie de aproximación (lado
// POSITIVO de X), ascendiendo con "pendienteTransicion" en el plano
// perpendicular al eje, hasta el nivel de la superficie horizontal interna
// (§4.1.13-4.1.16). Simplificación: perfil de pista recto entre ambos
// umbrales (sin curvatura ni pendiente transversal).
const checkTransitional = (ols, thrElev, otherThrElev, runwayLength, pendienteTransicion, innerHorizElev, X, Y) => {
  let bordeY, bordeElev;
  if (X <= 0 && X >= -(runwayLength || 0)) {
    // Adyacente a la franja: borde = semiancho de franja; elevación interpolada linealmente entre umbrales
    bordeY = (ols.franjaAncho || 0) / 2;
    const t = runwayLength > 0 ? (-X) / runwayLength : 0; // 0 en este umbral, 1 en el opuesto
    bordeElev = thrElev + (otherThrElev - thrElev) * t;
  } else if (X < -(runwayLength || 0)) {
    // Más allá del umbral opuesto: no cubierto por la transición de esta cabecera
    return { aplica: false, motivo: "Más allá del umbral opuesto — no cubierto por la transición de esta cabecera" };
  } else {
    // X > 0: adyacente a la superficie de aproximación de esta cabecera
    const xRel = X - ols.aprox.distUmbral;
    if (xRel < 0) return { aplica: false, motivo: "Antes del borde interior de la superficie de aproximación" };
    const longTotal = approachTotalLength(ols.aprox);
    if (xRel > longTotal) return { aplica: false, motivo: "Más allá del alcance de la superficie de aproximación" };
    bordeY = approachWidthAt(ols.aprox, xRel) / 2;
    bordeElev = approachElevAt(ols.aprox, thrElev, xRel);
  }
  const offset = Math.abs(Y) - bordeY;
  if (offset < 0) return { aplica: false, motivo: "Dentro de la franja o de la superficie de aproximación (no es zona de transición)" };
  let elevSuperficie = bordeElev + (pendienteTransicion / 100) * offset;
  let limitadaPorHorizInterna = false;
  if (innerHorizElev !== null && elevSuperficie > innerHorizElev) {
    elevSuperficie = innerHorizElev;
    limitadaPorHorizInterna = true;
  }
  return { aplica: true, elevSuperficie, offset, bordeElev, bordeY, limitadaPorHorizInterna };
};



const OP_CATS = {
  visual: {
    label: "Visual",
    short: "VIS",
    approachSlope: "5% (1:20)",
    stripHalfWidth: 75,         // §3.4.5 — no-instrumento código 3/4
    minLength: null,
    dhRvr: "—",
    notes: "Sin requisitos ILS. Operación diurna básica.",
    color: "#4DC88A",
    quarterLimitCode3: false,   // no aplica restricción 0.8% en cuartos código 3
  },
  npa: {
    label: "No Precisión (NPA)",
    short: "NPA",
    approachSlope: "3.33% (1:30)",
    stripHalfWidth: 140,        // §3.4.4 recomendado — igual que precisión en 9ª ed.
    minLength: null,
    dhRvr: "MDA según procedimiento",
    notes: "VOR / NDB / RNAV-LNAV. Sin glideslope.",
    color: "#5B9BD5",
    quarterLimitCode3: false,
  },
  cat1: {
    label: "Precisión CAT I",
    short: "CAT I",
    approachSlope: "2% (1:50)",
    stripHalfWidth: 140,        // §3.4.3 — código 3/4
    minLength: 1800,
    dhRvr: "DH ≥ 60 m | RVR ≥ 550 m",
    notes: "ILS obligatorio. HIAL. Zonas críticas ILS.",
    color: "#F0C040",
    quarterLimitCode3: false,   // código 3 CAT I: cuartos hasta 1.5%
  },
  cat2: {
    label: "Precisión CAT II",
    short: "CAT II",
    approachSlope: "2% (1:50)",
    stripHalfWidth: 140,        // §3.4.3
    minLength: 1800,
    dhRvr: "30 m ≤ DH < 60 m | RVR ≥ 300 m",
    notes: "ILS CAT II. HIAL + luces de zona de contacto y eje.",
    color: "#F0A040",
    quarterLimitCode3: true,    // código 3 CAT II: cuartos ≤ 0.8% (§3.1.14)
  },
  cat3: {
    label: "Precisión CAT III",
    short: "CAT III",
    approachSlope: "2% (1:50)",
    stripHalfWidth: 140,        // §3.4.3
    minLength: 1800,
    dhRvr: "DH < 30 m o sin DH | RVR < 300 m",
    notes: "Requisitos maximos. Autoland. RVR critico.",
    color: "#E85555",
    quarterLimitCode3: true,    // código 3 CAT III: cuartos ≤ 0.8% (§3.1.14)
  },
};
const getElevationAlert = (elev) => {
  const e = parseFloat(elev);
  if (isNaN(e)) return null;
  if (e >= 3000) return { level: "danger",  label: "Aeródromo de muy alta altitud (≥ 3 000 m)", note: "La longitud de campo de referencia puede ser 1,5× a 2× la requerida a nivel del mar. El ARC efectivo puede ser mayor al inferido. Se requiere análisis de performance con aeronave crítica." };
  if (e >= 1500) return { level: "warn",    label: "Aeródromo de alta altitud (≥ 1 500 m)", note: "La longitud de campo de referencia aumenta significativamente con la altitud. Verificar con datos de performance de la aeronave crítica." };
  if (e >= 600)  return { level: "info",    label: "Aeródromo por encima del nivel base (≥ 600 m)", note: "Considerar corrección por altitud en longitud de campo de referencia." };
  return null;
};
const runAudit = (data, arcNum, arcLetter, dd) => {
  const findings = [];
  let counter = 1;
  const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

  const addFinding = (severity, param, ref, found, required, description, recommendation) => {
    const prefix = severity === "NC" ? "NC" : "OB";
    findings.push({ id: `${prefix}-${String(counter++).padStart(3, "0")}`, severity, param, ref, found, required, description, recommendation });
  };

  const length     = parseFloat(data.length);
  const width      = parseFloat(data.width);
  const slopeMax   = parseFloat(data.slopeMax);
  const slopeQ1    = parseFloat(data.slopeQ1);
  const slopeQ4    = parseFloat(data.slopeQ4);
  const slopeTrans = parseFloat(data.slopeTrans);
  const limits     = SLOPE_LIMITS[arcNum];
  const minWidth   = (MIN_WIDTHS[arcNum] && MIN_WIDTHS[arcNum][arcLetter]);

  // ── Ancho de pista ─────────────────────────────────────────
  if (minWidth && !isNaN(width) && width < minWidth) {
    addFinding("NC", "Ancho de pista", "§3.1.12",
      `${width} m`, `${minWidth} m mín. para ARC ${arcNum}${arcLetter}`,
      `El ancho de pista declarado (${width} m) es inferior al mínimo requerido de ${minWidth} m para el ARC ${arcNum}${arcLetter}.`,
      `Ampliar el ancho de pista en ${minWidth - width} m mediante obras de ensanche lateral.`
    );
  }

  // ── Pendientes ─────────────────────────────────────────────
  if (!isNaN(slopeMax)) {
    if (slopeMax > limits.maxLong)
      addFinding("NC", "Pendiente longitudinal máxima", "§3.1.15",
        `${slopeMax}%`, `≤ ${limits.maxLong}% para núm. ref. ${arcNum}`,
        `La pendiente longitudinal máxima (${slopeMax}%) supera el límite de ${limits.maxLong}% para número de referencia ${arcNum}.`,
        `Corregir el perfil longitudinal mediante fresado, recapado o renivelación.`
      );
  } else {
    addFinding("OB", "Pendiente longitudinal máxima", "§3.1.15",
      "No declarada", "—", "No se declaró la pendiente longitudinal máxima.", "Declarar el dato para completar la evaluación.");
  }

  if (!isNaN(slopeQ1)) {
    if (slopeQ1 > limits.quarter)
      addFinding("NC", "Pendiente longitudinal — 1° cuarto", "§3.1.15",
        `${slopeQ1}%`, `≤ ${limits.quarter}%`,
        `La pendiente del primer cuarto de pista (${slopeQ1}%) supera el límite de ${limits.quarter}%.`,
        `Corregir el perfil longitudinal en el primer cuarto de pista.`
      );
  } else {
    addFinding("OB", "Pendiente longitudinal — 1° cuarto", "§3.1.15",
      "No declarada", "—", "No se declaró la pendiente del primer cuarto de pista.", "Declarar el dato para completar la evaluación.");
  }

  if (!isNaN(slopeQ4)) {
    if (slopeQ4 > limits.quarter)
      addFinding("NC", "Pendiente longitudinal — último cuarto", "§3.1.15",
        `${slopeQ4}%`, `≤ ${limits.quarter}%`,
        `La pendiente del último cuarto de pista (${slopeQ4}%) supera el límite de ${limits.quarter}%.`,
        `Corregir el perfil longitudinal en el último cuarto de pista.`
      );
  } else {
    addFinding("OB", "Pendiente longitudinal — último cuarto", "§3.1.15",
      "No declarada", "—", "No se declaró la pendiente del último cuarto de pista.", "Declarar el dato para completar la evaluación.");
  }

  if (!isNaN(slopeTrans) && slopeTrans > limits.transverse)
    addFinding("NC", "Pendiente transversal", "§3.1.17",
      `${slopeTrans}%`, `≤ ${limits.transverse}%`,
      `La pendiente transversal (${slopeTrans}%) excede el límite de ${limits.transverse}%.`,
      `Corregir el perfil transversal de la superficie de pista.`
    );

  // ── Distancias declaradas por RWY ──────────────────────────
  dd.forEach(item => {
    if (!item.coherent)
      addFinding("NC", `Coherencia de distancias — ${item.label}`, "§3.6.1",
        "Inconsistencia detectada", "TODA ≥ TORA, ASDA ≥ TORA, LDA ≤ TORA",
        `Las distancias declaradas para ${item.label} son inconsistentes. Verificar que TODA ≥ TORA, ASDA ≥ TORA y LDA ≤ TORA.`,
        `Revisar y corregir las distancias declaradas publicadas en el AIP.`
      );

    if (item.clearway > 0 && item.clearway > item.tora * 0.5)
      addFinding("NC", `Clearway — ${item.label}`, "§3.4.2",
        `${item.clearway} m`, `≤ ${item.tora * 0.5} m (50% TORA)`,
        `El clearway de ${item.label} (${item.clearway} m) supera el 50% de la TORA (${item.tora * 0.5} m).`,
        `Ajustar la longitud declarada del clearway o revisar la TORA.`
      );

    // ── Verificación por categoría de operación ───────────────
    if (item.opCat) {
      const cat = OP_CATS[item.opCat];
      const halfW = cat.stripHalfWidth;
      const stripRef = (item.opCat === "visual") ? "§3.4.5" : (item.opCat === "npa") ? "§3.4.4" : "§3.4.3";

      // Usar franja declarada si está disponible; sino usar ancho de pista como proxy
      const stripHalfActual = item.stripDeclared ? item.stripDeclared / 2 : width;
      const stripSource = item.stripDeclared ? "franja declarada " + item.stripDeclared + " m total (" + (item.stripDeclared/2) + " m c/lado)" : "ancho de pista " + width + " m (proxy)";

      if (!isNaN(stripHalfActual) && stripHalfActual < halfW)
        addFinding("NC", "Semiancho de franja - " + item.label, stripRef,
          stripSource, halfW + " m c/lado para " + cat.short + " (Anexo 14 9a ed.)",
          "El semiancho de franja disponible (" + stripHalfActual + " m) es inferior al minimo de " + halfW + " m a cada lado del eje requerido para " + cat.short + " en " + item.label + ".",
          "Ampliar la franja libre de obstaculos a " + halfW + " m a cada lado del eje de pista (" + (halfW*2) + " m total)."
        );

      if (cat.minLength && !isNaN(length) && length < cat.minLength)
        addFinding("OB", "Longitud referencial - " + item.label, "§3.1",
          length + " m", ">= " + cat.minLength + " m ref. para " + cat.short,
          "La longitud de pista (" + length + " m) es inferior a la longitud referencial minima (" + cat.minLength + " m) para " + cat.short + ". Sujeto a confirmacion con aeronave critica.",
          "Verificar longitud de campo de referencia de la aeronave critica. Puede requerirse extension de pista."
        );
    }
  });

  // ── Alerta por elevación del aeródromo ────────────────────
  const elevAlert = getElevationAlert(data.elevation);
  if (elevAlert && elevAlert.level === "danger") {
    addFinding("OB", "Aeródromo de muy alta altitud - corrección por elevación", "§3.1",
      parseFloat(data.elevation) + " m AMSL", "Análisis de performance requerido",
      "La elevación del aeródromo (" + parseFloat(data.elevation).toFixed(0) + " m AMSL) requiere corrección significativa de la longitud de campo de referencia. El ARC inferido puede subestimar los requisitos reales.",
      "Realizar análisis de performance con aeronave crítica a la elevación e ISA+" + (data.tempRef ? (parseFloat(data.tempRef) - (15 - parseFloat(data.elevation)*0.0065)).toFixed(1) : "X") + " para determinar el ARC efectivo."
    );
  } else if (elevAlert && elevAlert.level === "warn") {
    addFinding("OB", "Aeródromo de alta altitud - verificar corrección por elevación", "§3.1",
      parseFloat(data.elevation) + " m AMSL", "Verificar con datos de performance",
      "La elevación del aeródromo (" + parseFloat(data.elevation).toFixed(0) + " m AMSL) puede requerir corrección en la longitud de campo de referencia.",
      "Verificar longitud de campo de referencia de la aeronave crítica a la elevación real del aeródromo."
    );
  }

  const ncs = findings.filter(f => f.severity === "NC");
  const obs = findings.filter(f => f.severity === "OB");
  const status = ncs.length > 0 ? "no-conforme" : obs.length > 0 ? "conforme-obs" : "conforme";

  return { findings, ncs, obs, status, date: today };
};

// ═══════════════════════════════════════════════════════════════
// WRAPPERS DE CÓMPUTO — portados 1:1 de handleAnalyze / handleCheckObstacle
// (misma lógica que corría en el navegador; aquí corre en el servidor)
// ═══════════════════════════════════════════════════════════════

function computeResults(d) {
  const arcNum = getARCNumber(d.length);
  if (!arcNum) return { error: "No se pudo determinar el número de clave (revisa la longitud de pista)." };
  const limits = SLOPE_LIMITS[arcNum];
  const declaredLetter = (d.arcLetterKnown || "").trim().toUpperCase();
  const arcLetterIsDeclared = !!declaredLetter;
  const arcLetter = declaredLetter || inferLetter(parseFloat(d.width), arcNum);

  const analyzeDD = (prefix, fallback) => {
    const tora = parseFloat(d[prefix + "tora"]);
    if (isNaN(tora)) return null;
    const toda = parseFloat(d[prefix + "toda"]) || tora;
    const asda = parseFloat(d[prefix + "asda"]) || tora;
    const lda = parseFloat(d[prefix + "lda"]) || tora;
    const label = d[prefix + "label"] || fallback;
    const opCat = d[prefix + "opCat"] || "";
    const stripRwy = parseFloat(d[prefix + "strip"]) || parseFloat(d.stripDeclared) || null;
    return {
      label, opCat, tora, toda, asda, lda,
      stripDeclared: stripRwy,
      clearway: toda > tora ? toda - tora : 0,
      stopway: asda > tora ? asda - tora : 0,
      displaced: lda < tora ? tora - lda : 0,
      coherent: toda >= tora && asda >= tora && lda <= tora,
    };
  };

  const dd = [analyzeDD("c1", "RWY 1"), analyzeDD("c2", "RWY 2")].filter(Boolean);
  const opCats = dd.map(r => r.opCat).filter(Boolean);
  const hasCat23 = opCats.some(c => c === "cat2" || c === "cat3");
  const quarterLimit = getQuarterLimit(arcNum, hasCat23 ? "cat2" : (opCats[0] || ""));
  const meanLimit = MEAN_SLOPE_LIMITS[arcNum];

  const olsPerThreshold = dd.map(r => {
    const key = getOLSKey(r.opCat, arcNum);
    return { label: r.label, opCat: r.opCat, olsKey: key, ols: key ? OLS_TABLE[key] : null };
  });
  const olsWithData = olsPerThreshold.filter(e => e.ols);
  const olsAerodrome = olsWithData.length
    ? olsWithData.reduce((max, e) => (!max || e.ols.horizInterna.radio > max.ols.horizInterna.radio) ? e : max, null).ols
    : null;
  const tocs = TOCS_TABLE[arcNum] || null;

  // Metadatos de categoría (solo etiqueta/color/short — sin umbrales numéricos)
  // ya resueltos aquí, para que el frontend nunca necesite ver OP_CATS completo.
  const ddWithMeta = dd.map(r => ({
    ...r,
    catShort: r.opCat && OP_CATS[r.opCat] ? OP_CATS[r.opCat].short : null,
    catLabel: r.opCat && OP_CATS[r.opCat] ? OP_CATS[r.opCat].label : null,
    catColor: r.opCat && OP_CATS[r.opCat] ? OP_CATS[r.opCat].color : null,
    catDhRvr: r.opCat && OP_CATS[r.opCat] ? OP_CATS[r.opCat].dhRvr : null,
    catStripHalfWidth: r.opCat && OP_CATS[r.opCat] ? OP_CATS[r.opCat].stripHalfWidth : null,
  }));

  const elevAlert = getElevationAlert(d.elevation);

  let catSummary = null;
  if (d.opCat && OP_CATS[d.opCat]) {
    const cat = OP_CATS[d.opCat];
    const length = parseFloat(d.length);
    const lengthOk = !cat.minLength || length >= cat.minLength;
    // NOTA: el código original comparaba contra "cat.stripWidth", un campo que
    // nunca existió en OP_CATS (el campo real es "stripHalfWidth") — esa
    // comparación siempre daba "undefined"/false. Se corrige aquí para
    // comparar contra el campo real; avisar al usuario del cambio.
    const stripOk = parseFloat(d.width) >= cat.stripHalfWidth;
    catSummary = {
      short: cat.short, label: cat.label, notes: cat.notes, color: cat.color,
      approachSlope: cat.approachSlope, stripHalfWidth: cat.stripHalfWidth,
      dhRvr: cat.dhRvr, minLength: cat.minLength,
      lengthOk, stripOk,
    };
  }

  const results = {
    arcNum, arcLetter, arcLetterIsDeclared, limits, meanLimit, quarterLimit, hasCat23,
    dd: ddWithMeta,
    ols: { perThreshold: olsPerThreshold, aerodrome: olsAerodrome, tocs },
    elevAlert, catSummary,
  };
  const audit = runAudit(d, arcNum, arcLetter, dd);
  return { results, audit };
}

function computeObstacleCheck(d, og) {
  const base = computeResults(d);
  if (base.error) return { error: "No se pudo evaluar: " + base.error };
  const results = base.results;

  const cab = og.obsCabecera === "c2" ? "c2" : "c1";
  const otherCab = cab === "c1" ? "c2" : "c1";
  const opCat = d[cab + "opCat"];
  const key = getOLSKey(opCat, results.arcNum);
  const ols = key ? OLS_TABLE[key] : null;
  if (!ols) return { error: "La cabecera seleccionada no tiene categoría de aproximación declarada." };

  const thrElev = parseFloat(og[cab + "ThrElev"]);
  const otherThrElev = parseFloat(og[otherCab + "ThrElev"]);
  const runwayLength = parseFloat(d.length) || 0;
  const stripWidth = parseFloat(d[cab + "strip"]) || parseFloat(d.stripDeclared) || 0;
  const innerHorizElev = results.ols && results.ols.aerodrome
    ? (parseFloat(d.elevation) || thrElev) + results.ols.aerodrome.horizInterna.altura
    : null;

  let X, Y;
  if (og.coordMode === "rect") {
    X = parseFloat(og.obsX);
    Y = parseFloat(og.obsY);
  } else {
    const rumbo = parseFloat(og[cab + "RumboVerdadero"]);
    let thrLat, thrLon, obsLat, obsLon;
    if (og.coordMode === "dec") {
      thrLat = parseFloat(og[cab + "LatDec"]); thrLon = parseFloat(og[cab + "LonDec"]);
      obsLat = parseFloat(og.obsLatDec); obsLon = parseFloat(og.obsLonDec);
    } else if (og.coordMode === "utm") {
      const thrP = utmToLatLon(parseInt(og[cab + "UtmZone"]), og[cab + "UtmHemi"], parseFloat(og[cab + "UtmE"]), parseFloat(og[cab + "UtmN"]));
      const obsP = utmToLatLon(parseInt(og.obsUtmZone), og.obsUtmHemi, parseFloat(og.obsUtmE), parseFloat(og.obsUtmN));
      thrLat = thrP.lat; thrLon = thrP.lon;
      obsLat = obsP.lat; obsLon = obsP.lon;
    } else {
      thrLat = dmsToDec(og[cab + "LatDeg"], og[cab + "LatMin"], og[cab + "LatSec"], og[cab + "LatHemi"]);
      thrLon = dmsToDec(og[cab + "LonDeg"], og[cab + "LonMin"], og[cab + "LonSec"], og[cab + "LonHemi"]);
      obsLat = dmsToDec(og.obsLatDeg, og.obsLatMin, og.obsLatSec, og.obsLatHemi);
      obsLon = dmsToDec(og.obsLonDeg, og.obsLonMin, og.obsLonSec, og.obsLonHemi);
    }
    if ([thrLat, thrLon, obsLat, obsLon, rumbo].some(v => isNaN(v))) {
      return { error: "Completa coordenadas del umbral, del obstáculo y el rumbo verdadero de la cabecera." };
    }
    const bearingEje = (rumbo + 180) % 360;
    const xy = geoToLocalXY(thrLat, thrLon, obsLat, obsLon, bearingEje);
    X = xy.X; Y = xy.Y;
  }

  let obsElev = parseFloat(og.obsElev);
  if (isNaN(obsElev)) {
    const b = parseFloat(og.obsBaseElev);
    const alt = parseFloat(og.obsAltura);
    if (!isNaN(b) && !isNaN(alt)) obsElev = b + alt;
  }
  if (isNaN(X) || isNaN(Y) || isNaN(obsElev) || isNaN(thrElev)) {
    return { error: "Faltan datos: verifica coordenadas, elevación del umbral, y la elevación de la cima del obstáculo (directa, o base + altura)." };
  }

  const tocs = TOCS_TABLE[results.arcNum] || null;
  const rAprox = checkApproach(ols, thrElev, X, Y);
  const rTocs = tocs ? checkTakeoff(tocs, thrElev, X, Y) : { aplica: false, motivo: "Sin datos de Tabla 4-2 para este número de clave" };
  const rTrans = !isNaN(otherThrElev)
    ? checkTransitional({ ...ols, franjaAncho: stripWidth }, thrElev, otherThrElev, runwayLength, ols.transicion.pendiente, innerHorizElev, X, Y)
    : { aplica: false, motivo: "Falta la elevación del umbral opuesto para evaluar la transición" };

  const surfaces = [
    { nombre: "Aproximación", ref: "Tabla 4-1", r: rAprox },
    { nombre: "Transición", ref: "§4.1.13-16", r: rTrans },
    { nombre: "Ascenso en el Despegue", ref: "Tabla 4-2", r: rTocs },
  ].map(s => ({
    ...s,
    ...(s.r.aplica ? { margen: s.r.elevSuperficie - obsElev, penetra: obsElev > s.r.elevSuperficie } : {}),
  }));

  return {
    obsResult: {
      X, Y, obsElev,
      surfaces,
      cabLabel: d[cab + "label"] || (cab === "c1" ? "Cabecera 1" : "Cabecera 2"),
      olsLabel: ols.label,
    },
  };
}

function computeGapAnalysis(d, results, target) {
  if (!results || !target || !target.num || !target.letter) return { error: "Faltan datos del objetivo (número/letra de clave)." };
  const tNum = parseInt(target.num);
  const tLetter = target.letter;
  const tLimits = SLOPE_LIMITS[tNum];
  const tMinWidth = (MIN_WIDTHS[tNum] ? MIN_WIDTHS[tNum][tLetter] : null);
  const tMinLength = MIN_LENGTHS[tNum];
  const length = parseFloat(d.length);
  const width = parseFloat(d.width);
  const rows = [];

  rows.push({
    param: "Longitud física",
    current: `${length} m`,
    required: `≥ ${tMinLength} m`,
    delta: length >= tMinLength ? "—" : `+${tMinLength - length} m`,
    ok: length >= tMinLength,
    action: length >= tMinLength ? "Sin intervención" : "Extensión de pista",
  });
  if (tMinWidth !== null) {
    rows.push({
      param: "Ancho de pista",
      current: `${width} m`,
      required: `${tMinWidth} m`,
      delta: width >= tMinWidth ? "—" : `+${tMinWidth - width} m`,
      ok: width >= tMinWidth,
      action: width >= tMinWidth ? "Sin intervención" : "Ensanche de pista",
    });
  }
  [
    { key: "slopeMax", label: "Pendiente long. máx.", limit: (tLimits && tLimits.maxLong) },
    { key: "slopeQ1", label: "Pendiente 1° cuarto", limit: (tLimits && tLimits.quarter) },
    { key: "slopeQ4", label: "Pendiente último cuarto", limit: (tLimits && tLimits.quarter) },
    { key: "slopeTrans", label: "Pendiente transversal", limit: 1.5 },
  ].forEach(({ key, label, limit }) => {
    const val = parseFloat(d[key]);
    if (isNaN(val) || limit === undefined) return;
    const exceeds = val > limit;
    rows.push({
      param: label,
      current: `${val}%`,
      required: `≤ ${limit}%`,
      delta: exceeds ? `+${(val - limit).toFixed(2)}%` : "—",
      ok: !exceeds,
      action: exceeds ? "Corrección de perfil" : "Sin intervención",
    });
  });

  const fromCat = d.opCat && OP_CATS[d.opCat] ? OP_CATS[d.opCat].short : null;
  const toCat = target.opCat && OP_CATS[target.opCat] ? OP_CATS[target.opCat].short : null;

  const catRows = (() => {
    if (!target.opCat || !d.opCat || d.opCat === target.opCat) return [];
    if (!OP_CATS[d.opCat] || !OP_CATS[target.opCat]) return [];
    const from = OP_CATS[d.opCat];
    const to = OP_CATS[target.opCat];
    const catR = [];
    catR.push({
      param: "Sup. de aproximación",
      current: from.approachSlope,
      required: to.approachSlope,
      delta: "—",
      ok: true,
      action: "Actualización de procedimiento",
    });
    catR.push({
      param: "Ancho de franja",
      current: `${from.stripHalfWidth} m`,
      required: `${to.stripHalfWidth} m`,
      delta: width >= to.stripHalfWidth ? "—" : `+${to.stripHalfWidth - from.stripHalfWidth} m`,
      ok: from.stripHalfWidth >= to.stripHalfWidth,
      action: from.stripHalfWidth >= to.stripHalfWidth ? "Sin intervención" : "Ampliación de franja",
    });
    if (to.minLength) {
      catR.push({
        param: "Longitud referencial",
        current: `${length} m`,
        required: `≥ ${to.minLength} m`,
        delta: length >= to.minLength ? "—" : `+${to.minLength - length} m`,
        ok: length >= to.minLength,
        action: length >= to.minLength ? "Sin intervención" : "Extensión de pista",
      });
    }
    catR.push({
      param: "Sistema de aproximación",
      current: from.label,
      required: to.label,
      delta: "—",
      ok: null,
      action: "Instalación ILS / equipos NavAids",
    });
    catR.push({
      param: "DH / RVR",
      current: from.dhRvr,
      required: to.dhRvr,
      delta: "—",
      ok: null,
      action: "Certificación operacional",
    });
    return catR;
  })();

  return {
    gaps: {
      from: `${results.arcNum}${results.arcLetter}`,
      to: `${tNum}${tLetter}`,
      fromCat, toCat, rows, catRows,
      critical: rows.filter(r => !r.ok),
    },
  };
}


const C = {
  bg: "#0F1E30",
  surf: "#162840",
  surf2: "#1C3350",
  surf3: "#223C5E",
  border: "#2A4F78",
  borderBright: "#3A6898",
  accent: "#6AAEE0",
  accentDim: "#0F2F52",
  ok: "#4DC88A",
  okDim: "#083520",
  warn: "#F0C040",
  warnDim: "#2A1E00",
  danger: "#E85555",
  dangerDim: "#2A0808",
  text: "#8BADC8",
  textMid: "#B8CDE0",
  textBright: "#E0EEF8",
  white: "#F4FAFF",
  mono: '"Courier New", "Courier", monospace',
};

// ═══════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// AEROPUERTOS DE EJEMPLO — datos referenciales AIP Perú
// ═══════════════════════════════════════════════════════════════

// ─── Datos referenciales AIP Perú — verificar contra AIP vigente ───
const AIRPORTS = {
  aqp: {
    _name: "AQP — Arequipa / Alfredo Rodríguez Ballón",
    airport: "Aeropuerto Internacional Alfredo Rodríguez Ballón", city: "Arequipa", icao: "SPQU",
    runway: "10/28", opCat: "cat1", elevation: "2560", tempRef: "22.3",
    length: "2980", width: "45", arcLetterKnown: "D", stripDeclared: "150",
    slopeMean: "1.381", slopeMax: "2.0", slopeQ1: "2.0", slopeQ4: "0.85", slopeTrans: "",
    c1label: "RWY 10", c1opCat: "cat1", c1strip: "150",
    c1tora: "2980", c1toda: "2980", c1asda: "3040", c1lda: "2980",
    c2label: "RWY 28", c2opCat: "npa", c2strip: "150",
    c2tora: "2980", c2toda: "2980", c2asda: "3040", c2lda: "2530",
    // Georreferenciación (AD 2.12 SPQU, AMDT 31/22). Se usa BRG GEO (verdadero), no MAG.
    // RWY28 tiene umbral desplazado 450 m — se usa la posición del DTHR28 (umbral de
    // aterrizaje real) en vez del THR28 físico (16°20'28.74"S-071°33'24.79"W), ya que
    // es el punto relevante para la superficie de aproximación.
    geo: {
      c1RumboVerdadero: "93.00", c1ThrElev: "2521",
      c1LatDeg: "16", c1LatMin: "20", c1LatSec: "23.42", c1LatHemi: "S",
      c1LonDeg: "71", c1LonMin: "35", c1LonSec: "4.99", c1LonHemi: "W",
      c2RumboVerdadero: "273.00", c2ThrElev: "2560",
      c2LatDeg: "16", c2LatMin: "20", c2LatSec: "27.95", c2LatHemi: "S",
      c2LonDeg: "71", c2LonMin: "33", c2LonSec: "39.86", c2LonHemi: "W",
    },
  },
  ayp: {
    _name: "AYP — Ayacucho / Alfredo Mendívil Duarte",
    airport: "Aeropuerto Coronel FAP Alfredo Mendívil Duarte", city: "Ayacucho", icao: "SPHO",
    // Fuente: AIP Perú AD 2 SPHO, AMDT 34/2025 (15 DIC 2025) — CORPAC S.A.
    runway: "02/20", opCat: "npa", elevation: "2743", tempRef: "27.1",
    length: "2800", width: "45", arcLetterKnown: "C", stripDeclared: "100",
    // AD 2.12: pendiente RWY-SWY publicada +0.256% (THR02 2736 m → THR20 2743 m).
    // No hay desglose de cuartos/transversal en el AIP (requiere estudio topográfico).
    slopeMean: "0.256", slopeMax: "", slopeQ1: "", slopeQ4: "", slopeTrans: "",
    // AD 2.2(7): tránsito autorizado declarado "VFR". AD 2.12 remarks: RWY20 admite
    // LDG por NPA y aproximación visual; RWY02 solo TKOF (LDG no disponible). Verificar vigencia del procedimiento NPA.
    c1label: "RWY 02", c1opCat: "visual", c1strip: "100",
    c1tora: "2800", c1toda: "2800", c1asda: "2800", c1lda: "2800",
    c2label: "RWY 20", c2opCat: "npa", c2strip: "100",
    c2tora: "2800", c2toda: "2800", c2asda: "2800", c2lda: "2800",
    // Georreferenciación (AD 2.12, misma fuente): rumbo verdadero y coordenadas de umbral.
    geo: {
      c1RumboVerdadero: "22.00", c1ThrElev: "2736",
      c1LatDeg: "13", c1LatMin: "9", c1LatSec: "59.11", c1LatHemi: "S",
      c1LonDeg: "74", c1LonMin: "12", c1LonSec: "33.74", c1LonHemi: "W",
      c2RumboVerdadero: "202.00", c2ThrElev: "2743",
      c2LatDeg: "13", c2LatMin: "8", c2LatSec: "34.96", c2LatHemi: "S",
      c2LonDeg: "74", c2LonMin: "11", c2LonSec: "58.00", c2LonHemi: "W",
    },
  },
  jul: {
    _name: "JUL — Juliaca / Inca Manco Cápac",
    airport: "Aeropuerto Internacional Inca Manco Cápac", city: "Juliaca", icao: "SPJL",
    runway: "12/30", opCat: "npa", elevation: "3826", tempRef: "19.8",
    // Letra ARC declarada por el usuario (lista consolidada de los 5 aeropuertos).
    // Nota: en un mensaje previo se había indicado "4C" para Juliaca; se adopta "4D"
    // por venir de la lista completa/más reciente — confirmar si hay discrepancia real.
    length: "4200", width: "45", arcLetterKnown: "D", stripDeclared: "150",
    slopeMean: "0.05", slopeMax: "0.22", slopeQ1: "0.04", slopeQ4: "0.07", slopeTrans: "",
    c1label: "RWY 12", c1opCat: "visual", c1strip: "150",
    c1tora: "4200", c1toda: "4200", c1asda: "4260", c1lda: "4200",
    c2label: "RWY 30", c2opCat: "npa", c2strip: "150",
    c2tora: "4200", c2toda: "4200", c2asda: "4260", c2lda: "4200",
    // Georreferenciación (AD 2.12 SPJL, AMDT 25/18). BRG GEO (verdadero).
    geo: {
      c1RumboVerdadero: "112.00", c1ThrElev: "3825.95",
      c1LatDeg: "15", c1LatMin: "27", c1LatSec: "35.13", c1LatHemi: "S",
      c1LonDeg: "70", c1LonMin: "10", c1LonSec: "33.68", c1LonHemi: "W",
      c2RumboVerdadero: "292.00", c2ThrElev: "3824.09",
      c2LatDeg: "15", c2LatMin: "28", c2LatSec: "26.24", c2LatHemi: "S",
      c2LonDeg: "70", c2LonMin: "8", c2LonSec: "23.08", c2LonHemi: "W",
    },
  },
  pem: {
    _name: "PEM — Pto. Maldonado / Padre Aldamiz",
    airport: "Aeropuerto Internacional Padre Aldamiz", city: "Puerto Maldonado", icao: "SPTU",
    // Fuente: AIP Perú AD 2A-15 SPTU, AMDT 32/24 (30 SEP 2024) — CORPAC S.A.
    runway: "01/19", opCat: "cat1", elevation: "201", tempRef: "33.1",
    length: "3500", width: "45", arcLetterKnown: "C", stripDeclared: "150",
    // Pendiente de pista publicada: 0.072%. RESA 90x90 m (no modelado en esta versión).
    // Sin desglose de cuartos/transversal en el AIP (requiere estudio topográfico).
    slopeMean: "0.072", slopeMax: "", slopeQ1: "", slopeQ4: "", slopeTrans: "",
    // ILS CAT I (LOC IPJA 109.7 MHz / GP-DME) + VOR/DME PDO en campo. RWY19 con
    // SALS+RTHL+REDL+RENL vs RWY01 solo RTHL+REDL+RENL ⇒ RWY19 es el lado de precisión.
    // TKOF y LDG sin restricción en ambos sentidos (declaradas = longitud total).
    c1label: "RWY 01", c1opCat: "npa", c1strip: "150",
    c1tora: "3500", c1toda: "3500", c1asda: "3500", c1lda: "3500",
    c2label: "RWY 19", c2opCat: "cat1", c2strip: "150",
    c2tora: "3500", c2toda: "3500", c2asda: "3500", c2lda: "3500",
    // Georreferenciación (misma fuente AD 2A-15):
    // ⚠ "Orientación de la pista: 001°/190°" en el AIP no está etiquetado explícitamente
    // como verdadero (a diferencia del "TRUE BRG" de SPHO) — se usa como aproximación.
    // ⚠ El AIP solo da una elevación de aeródromo (659 ft ≈ 201 m), no por umbral —
    // se usa el mismo valor para ambas cabeceras a falta de dato más preciso.
    geo: {
      c1RumboVerdadero: "1.00", c1ThrElev: "201",
      c1LatDeg: "12", c1LatMin: "37", c1LatSec: "46.71", c1LatHemi: "S",
      c1LonDeg: "69", c1LonMin: "13", c1LonSec: "45.67", c1LonHemi: "W",
      c2RumboVerdadero: "190.00", c2ThrElev: "201",
      c2LatDeg: "12", c2LatMin: "35", c2LatSec: "52.87", c2LatHemi: "S",
      c2LonDeg: "69", c2LonMin: "13", c2LonSec: "40.82", c2LonHemi: "W",
    },
  },
  tcq: {
    _name: "TCQ — Tacna / Coronel FAP Ciriani Santa Rosa",
    airport: "Aeropuerto Internacional Coronel FAP Carlos Ciriani Santa Rosa", city: "Tacna", icao: "SPTN",
    runway: "02/20", opCat: "cat1", elevation: "469", tempRef: "28.9",
    length: "2500", width: "45", arcLetterKnown: "D", stripDeclared: "150",
    slopeMean: "1.99", slopeMax: "2.207", slopeQ1: "2.207", slopeQ4: "2.07", slopeTrans: "",
    c1label: "RWY 02", c1opCat: "cat1", c1strip: "150",
    c1tora: "2500", c1toda: "2714", c1asda: "2560", c1lda: "2500",
    c2label: "RWY 20", c2opCat: "npa", c2strip: "150",
    c2tora: "2500", c2toda: "2720", c2asda: "2560", c2lda: "2500",
    // Georreferenciación (AD 2.12 SPTN, AMDT 26/19). BRG GEO (verdadero).
    geo: {
      c1RumboVerdadero: "19.00", c1ThrElev: "419",
      c1LatDeg: "18", c1LatMin: "3", c1LatSec: "50.17", c1LatHemi: "S",
      c1LonDeg: "70", c1LonMin: "16", c1LonSec: "47.13", c1LonHemi: "W",
      c2RumboVerdadero: "199.00", c2ThrElev: "469",
      c2LatDeg: "18", c2LatMin: "2", c2LatSec: "33.49", c2LatHemi: "S",
      c2LonDeg: "70", c2LonMin: "16", c2LonSec: "18.78", c2LonHemi: "W",
    },
  },
};

const EMPTY = {
  airport: "", city: "", icao: "", runway: "", opCat: "", elevation: "", tempRef: "",
  length: "", width: "", arcLetterKnown: "", stripDeclared: "",
  slopeMean: "", slopeMax: "", slopeQ1: "", slopeQ4: "", slopeTrans: "",
  c1label: "", c1opCat: "", c1strip: "", c1tora: "", c1toda: "", c1asda: "", c1lda: "",
  c2label: "", c2opCat: "", c2strip: "", c2tora: "", c2toda: "", c2asda: "", c2lda: "",
};


// ═══════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════

const Label = ({ children }) => (
  <div style={{ fontSize: 10, color: C.text, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "number", suffix }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min="0"
      step="any"
      style={{
        flex: 1, background: C.surf3, border: `1px solid ${C.border}`, borderRadius: 5,
        padding: "7px 10px", color: C.white, fontSize: 13, fontFamily: C.mono,
        outline: "none", width: "100%",
      }}
    />
    {suffix && <span style={{ fontSize: 11, color: C.text, width: 20 }}>{suffix}</span>}
  </div>
);

const Field = ({ label, value, onChange, placeholder, type, suffix }) => (
  <div>
    <Label>{label}</Label>
    <Input value={value} onChange={onChange} placeholder={placeholder} type={type} suffix={suffix} />
  </div>
);

const Card = ({ eyebrow, title, children, style = {} }) => (
  <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, ...style }}>
    {eyebrow && <div style={{ fontSize: 10, color: C.accent, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 2 }}>{eyebrow}</div>}
    {title && <div style={{ fontSize: 14, color: C.white, fontWeight: 800, marginBottom: 14, letterSpacing: "-0.01em" }}>{title}</div>}
    {children}
  </div>
);

const Pill = ({ label, color, bg }) => (
  <span style={{ display: "inline-block", background: bg || C.accentDim, color: color || C.accent, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, fontFamily: C.mono }}>
    {label}
  </span>
);

const StatusIcon = ({ ok }) => (
  <span style={{ fontSize: 14, color: ok ? C.ok : C.danger }}>{ok ? "✓" : "✗"}</span>
);

const OLSRow = ({ label, items, note }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: C.textBright, marginBottom: 3 }}>{label}</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 10px" }}>
      {items.map(([k, v], i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
          <span style={{ color: C.text }}>{k}</span>
          <span style={{ color: C.textMid, fontFamily: C.mono }}>{v}</span>
        </div>
      ))}
    </div>
    {note && <div style={{ fontSize: 9, color: C.text, marginTop: 2, fontStyle: "italic" }}>{note}</div>}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// RUNWAY SVG DIAGRAM — signature element
// ═══════════════════════════════════════════════════════════════

const RunwayDiagram = ({ dd }) => {
  if (!dd) return null;
  const { tora, toda, asda, lda, clearway, stopway, displaced, label } = dd;
  if (!tora) return null;

  const W = 520, H = 90;
  const maxLen = Math.max(toda || tora, asda || tora, tora) * 1.05;
  const scale = (W * 0.82) / maxLen;
  const ox = 24; // origin x

  const toraW = tora * scale;
  const clearW = (clearway || 0) * scale;
  const stopW = (stopway || 0) * scale;
  const dispW = (displaced || 0) * scale;

  const dashCount = Math.floor(toraW / 28);

  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
      <div style={{ fontSize: 10, color: C.text, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{label} — Planta esquemática</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        {/* Clearway */}
        {clearW > 0 && (
          <g>
            <rect x={ox + toraW} y={30} width={clearW} height={30} fill="none" stroke={C.accent} strokeWidth={1} strokeDasharray="5 4" opacity={0.5} />
            <text x={ox + toraW + clearW / 2} y={26} textAnchor="middle" fill={C.accent} fontSize={8} fontFamily="monospace" opacity={0.8}>CWY {clearway}m</text>
          </g>
        )}
        {/* Stopway */}
        {stopW > 0 && (
          <g>
            <rect x={ox + toraW} y={30} width={stopW} height={30} fill={C.okDim} stroke={C.ok} strokeWidth={1} />
            <text x={ox + toraW + stopW / 2} y={74} textAnchor="middle" fill={C.ok} fontSize={8} fontFamily="monospace">SWY {stopway}m</text>
          </g>
        )}
        {/* Runway surface */}
        <rect x={ox} y={30} width={toraW} height={30} fill={C.surf3} stroke={C.border} strokeWidth={1} rx={2} />
        {/* Displaced threshold zone */}
        {dispW > 0 && (
          <rect x={ox} y={30} width={dispW} height={30} fill={C.warnDim} opacity={0.9} rx={2} />
        )}
        {/* Centerline dashes */}
        {Array.from({ length: dashCount }).map((_, i) => (
          <rect key={i} x={ox + dispW + 4 + i * 28} y={44} width={16} height={2} fill={C.accent} opacity={0.3} />
        ))}
        {/* Threshold markings */}
        {[0, 1, 2, 3].map(i => (
          <rect key={i} x={ox + dispW + 3} y={31 + i * 7} width={7} height={5} fill={C.warn} opacity={0.85} />
        ))}
        {/* End threshold */}
        <rect x={ox + toraW - 4} y={30} width={3} height={30} fill={C.textMid} opacity={0.4} />

        {/* TORA bracket */}
        <line x1={ox} y1={68} x2={ox + toraW} y2={68} stroke={C.text} strokeWidth={0.8} />
        <line x1={ox} y1={65} x2={ox} y2={71} stroke={C.text} strokeWidth={0.8} />
        <line x1={ox + toraW} y1={65} x2={ox + toraW} y2={71} stroke={C.text} strokeWidth={0.8} />
        <text x={ox + toraW / 2} y={78} textAnchor="middle" fill={C.text} fontSize={8} fontFamily="monospace">TORA {tora}m</text>

        {/* LDA indicator */}
        {displaced > 0 && lda && (
          <g>
            <line x1={ox + dispW} y1={20} x2={ox + lda * scale} y2={20} stroke={C.warn} strokeWidth={0.8} />
            <text x={ox + dispW + (lda * scale) / 2} y={17} textAnchor="middle" fill={C.warn} fontSize={8} fontFamily="monospace">LDA {lda}m</text>
          </g>
        )}
        {/* Displaced label */}
        {dispW > 0 && (
          <text x={ox + dispW / 2} y={49} textAnchor="middle" fill={C.warn} fontSize={7} fontFamily="monospace">DSPL</text>
        )}
      </svg>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ARC BADGE
// ═══════════════════════════════════════════════════════════════

const ARCBadge = ({ num, letter }) => (
  <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
    <div style={{ fontSize: 10, color: C.accent, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
      Código de Referencia de Aeródromo
    </div>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", lineHeight: 1 }}>
      <span style={{ fontSize: 80, fontWeight: 900, color: C.white, fontFamily: C.mono, lineHeight: 1 }}>{num}</span>
      <span style={{ fontSize: 64, fontWeight: 900, color: C.accent, fontFamily: C.mono, lineHeight: 1 }}>{letter}</span>
    </div>
    <div style={{ fontSize: 11, color: C.text, marginTop: 8, lineHeight: 1.5 }}>
      Letra inferida por ancho de pista.<br />Confirmar con aeronave crítica.
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// PESTAÑA: VERIFICADOR DE OBSTÁCULOS (Cap. 4)
// ═══════════════════════════════════════════════════════════════

const ObstaculosTab = ({ og, updO, d, results, obsResult, handleCheckObstacle }) => {
  const selStyle = { background: C.surf3, border: "1px solid " + C.border, borderRadius: 5, padding: "7px 6px", color: C.white, fontSize: 12, fontFamily: C.mono };
  const mode = og.coordMode;

  const thrGeoCard = (prefix, label) => (
    <div style={{ padding: "10px 12px", background: C.surf2, borderRadius: 8, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.white, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {mode !== "rect" && (
          <Field label="Rumbo verdadero" value={og[prefix + "RumboVerdadero"]} onChange={updO(prefix + "RumboVerdadero")} placeholder="022.00" suffix="°" />
        )}
        <Field label="Elevación del umbral" value={og[prefix + "ThrElev"]} onChange={updO(prefix + "ThrElev")} placeholder="2736" suffix="m" />
        {mode === "dms" && (
          <>
            <div>
              <Label>Latitud (G° M' S")</Label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 54px", gap: 6 }}>
                <Input type="text" value={og[prefix + "LatDeg"]} onChange={updO(prefix + "LatDeg")} placeholder="13" />
                <Input type="text" value={og[prefix + "LatMin"]} onChange={updO(prefix + "LatMin")} placeholder="09" />
                <Input type="text" value={og[prefix + "LatSec"]} onChange={updO(prefix + "LatSec")} placeholder="59.11" />
                <select value={og[prefix + "LatHemi"]} onChange={e => updO(prefix + "LatHemi")(e.target.value)} style={selStyle}>
                  <option value="S">S</option><option value="N">N</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Longitud (G° M' S")</Label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 54px", gap: 6 }}>
                <Input type="text" value={og[prefix + "LonDeg"]} onChange={updO(prefix + "LonDeg")} placeholder="74" />
                <Input type="text" value={og[prefix + "LonMin"]} onChange={updO(prefix + "LonMin")} placeholder="12" />
                <Input type="text" value={og[prefix + "LonSec"]} onChange={updO(prefix + "LonSec")} placeholder="33.74" />
                <select value={og[prefix + "LonHemi"]} onChange={e => updO(prefix + "LonHemi")(e.target.value)} style={selStyle}>
                  <option value="W">W</option><option value="E">E</option>
                </select>
              </div>
            </div>
          </>
        )}
        {mode === "dec" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Latitud (decimal)" value={og[prefix + "LatDec"]} onChange={updO(prefix + "LatDec")} placeholder="-13.1664" type="text" />
            <Field label="Longitud (decimal)" value={og[prefix + "LonDec"]} onChange={updO(prefix + "LonDec")} placeholder="-74.2094" type="text" />
          </div>
        )}
        {mode === "utm" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px", gap: 8 }}>
              <Field label="Zona UTM" value={og[prefix + "UtmZone"]} onChange={updO(prefix + "UtmZone")} placeholder="18" type="text" />
              <div>
                <Label>Hemisf.</Label>
                <select value={og[prefix + "UtmHemi"]} onChange={e => updO(prefix + "UtmHemi")(e.target.value)} style={{ ...selStyle, width: "100%" }}>
                  <option value="S">S</option><option value="N">N</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Este (Easting)" value={og[prefix + "UtmE"]} onChange={updO(prefix + "UtmE")} placeholder="585682" suffix="m" type="text" />
              <Field label="Norte (Northing)" value={og[prefix + "UtmN"]} onChange={updO(prefix + "UtmN")} placeholder="8544326" suffix="m" type="text" />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── SUPERFICIES LIMITADORAS DE OBSTÁCULOS (Cap. 4) — dimensiones de referencia ── */}
      {!results || !results.ols ? (
        <Card eyebrow="Superficies Limitadoras de Obstáculos — Anexo 14, Cap. 4" title="Dimensiones OLS (Tabla 4-1 / 4-2)">
          <div style={{ fontSize: 12, color: C.text }}>
            Corre "Analizar" en la pestaña <strong style={{ color: C.textMid }}>Auditoría de Pista</strong> primero — se necesita el número
            de clave y la categoría de aproximación por cabecera para determinar las superficies.
          </div>
        </Card>
      ) : (
        <Card eyebrow="Superficies Limitadoras de Obstáculos — Anexo 14, Cap. 4" title="Dimensiones OLS (Tabla 4-1 / 4-2)">
          {results.ols.aerodrome && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 10, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 10, color: C.accent, fontFamily: C.mono, fontWeight: 700, textTransform: "uppercase" }}>Superficie Cónica</div>
                <div style={{ fontSize: 13, color: C.white, marginTop: 4 }}>Pendiente {results.ols.aerodrome.conica.pendiente}% · Altura {results.ols.aerodrome.conica.altura} m</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.accent, fontFamily: C.mono, fontWeight: 700, textTransform: "uppercase" }}>Horizontal Interna</div>
                <div style={{ fontSize: 13, color: C.white, marginTop: 4 }}>Altura {results.ols.aerodrome.horizInterna.altura} m · Radio {results.ols.aerodrome.horizInterna.radio} m</div>
              </div>
            </div>
          )}
          <div style={{ fontSize: 9, color: C.text, marginBottom: 12 }}>
            Cónica y Horizontal Interna se establecen para todo el aeródromo — se muestra la combinación más exigente entre las cabeceras con categoría declarada.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: results.ols.perThreshold.length > 1 ? "1fr 1fr" : "1fr", gap: 14 }}>
            {results.ols.perThreshold.map((t, i) => (
              <div key={i} style={{ padding: "10px 12px", background: C.surf2, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.white, marginBottom: 6 }}>{t.label}</div>
                {!t.ols ? (
                  <div style={{ fontSize: 11, color: C.text }}>Sin categoría de aproximación declarada para esta cabecera — no se pueden determinar las superficies.</div>
                ) : (
                  <>
                    <div style={{ fontSize: 10, color: C.accent, marginBottom: 8 }}>{t.ols.label}</div>
                    <OLSRow label="De Aproximación" items={[
                      ["Long. borde interior", t.ols.aprox.bordeInterior + " m"],
                      ["Distancia desde umbral", t.ols.aprox.distUmbral + " m"],
                      ["Divergencia (c/lado)", t.ols.aprox.divergencia + "%"],
                      ["1ª sección", t.ols.aprox.primera.longitud + " m @ " + t.ols.aprox.primera.pendiente + "%"],
                      ...(t.ols.aprox.segunda ? [["2ª sección", t.ols.aprox.segunda.longitud + " m @ " + t.ols.aprox.segunda.pendiente + "%"]] : []),
                      ...(t.ols.aprox.seccionHorizontal ? [["Longitud total", t.ols.aprox.seccionHorizontal.longitudTotal + " m"]] : []),
                    ]} />
                    {t.ols.aproxInterna && (
                      <OLSRow label="De Aproximación Interna" items={[
                        ["Anchura", t.ols.aproxInterna.anchura + " m"],
                        ["Distancia desde umbral", t.ols.aproxInterna.distUmbral + " m"],
                        ["Longitud", t.ols.aproxInterna.longitud + " m"],
                        ["Pendiente", t.ols.aproxInterna.pendiente + "%"],
                      ]} note={t.ols.aproxInterna.anchuraNota} />
                    )}
                    <OLSRow label="De Transición" items={[["Pendiente", t.ols.transicion.pendiente + "%"]]} />
                    {t.ols.transicionInterna && (
                      <OLSRow label="De Transición Interna" items={[["Pendiente", t.ols.transicionInterna.pendiente + "%"]]} />
                    )}
                    {t.ols.aterrInterrump && (
                      <OLSRow label="De Aterrizaje Interrumpido" items={[
                        ["Long. borde interior", t.ols.aterrInterrump.bordeInterior + " m"],
                        ["Distancia desde umbral", typeof t.ols.aterrInterrump.distUmbral === "number" ? t.ols.aterrInterrump.distUmbral + " m" : t.ols.aterrInterrump.distUmbral],
                        ["Divergencia (c/lado)", t.ols.aterrInterrump.divergencia + "%"],
                        ["Pendiente", t.ols.aterrInterrump.pendiente + "%"],
                      ]} note={t.ols.aterrInterrump.distUmbralNota} />
                    )}
                    {t.opCat === "cat1" && (
                      <div style={{ fontSize: 9, color: C.text, marginTop: 4, fontStyle: "italic" }}>
                        Aproximación interna, transición interna y aterrizaje interrumpido son RECOMENDACIÓN (no obligatorias) en CAT I — Anexo 14 §4.2.14.
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {results.ols.tocs && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.white, marginBottom: 6 }}>
                De Ascenso en el Despegue{" "}
                <span style={{ fontSize: 10, color: C.text, fontWeight: 400 }}>(cabecera usada para despegue — depende solo del número de clave)</span>
              </div>
              <OLSRow label={`Número de clave ${results.arcNum}`} items={[
                ["Long. borde interior", results.ols.tocs.bordeInterior + " m"],
                ["Distancia desde extremo", results.ols.tocs.distExtremo + " m"],
                ["Divergencia (c/lado)", results.ols.tocs.divergencia + "%"],
                ["Anchura final", results.ols.tocs.anchuraFinal + " m"],
                ["Longitud", results.ols.tocs.longitud + " m"],
                ["Pendiente", results.ols.tocs.pendiente + "%"],
              ]} note={results.ols.tocs.anchuraFinalNota} />
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 10, color: C.text, lineHeight: 1.5 }}>
            ⚠ Dimensiones de referencia (Tabla 4-1 / 4-2, Anexo 14 Vol. I, Cap. 4). El verificador de obstáculos, debajo,
            evalúa Aproximación, Transición y Ascenso en el Despegue — Cónica, Horizontal Interna, Aproximación Interna,
            Transición Interna y Aterrizaje Interrumpido todavía no tienen chequeo geométrico (ver fases siguientes).
          </div>
        </Card>
      )}

      <Card eyebrow="Formato de Coordenadas" title="Verificador de Obstáculos">
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { key: "dms", label: "Grados/Min/Seg" },
            { key: "dec", label: "Decimales" },
            { key: "utm", label: "UTM" },
            { key: "rect", label: "Rectangulares (X/Y)" },
          ].map(o => (
            <button key={o.key} onClick={() => updO("coordMode")(o.key)}
              style={{
                flex: 1, padding: "8px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: mode === o.key ? C.accentDim : C.surf3,
                border: "1px solid " + (mode === o.key ? C.accent : C.border),
                color: mode === o.key ? C.accent : C.text,
              }}>
              {o.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: C.text, marginTop: 8, lineHeight: 1.5 }}>
          {mode === "rect"
            ? "Modo rectangular: ingresa directamente la posición del obstáculo en X (a lo largo del eje, positivo alejándose de la cabecera hacia afuera) e Y (lateral, m) respecto al umbral elegido — sin coordenadas geográficas ni rumbo. Suele ser el más rápido para levantar en campo."
            : mode === "utm"
            ? "UTM WGS84 (zona + hemisferio + Este/Norte, en metros) — el formato típico de un GPS de mano o estación total. Se convierte a coordenadas locales usando el rumbo verdadero de la cabecera."
            : "Se convierte la posición geográfica del obstáculo a coordenadas locales respecto al umbral, usando el rumbo verdadero de la cabecera (aproximación de tierra plana, válida para los alcances de las superficies OLS)."}
        </div>
      </Card>

      <Card eyebrow="Georreferenciación" title={mode === "rect" ? "Elevación de Umbrales" : "Umbrales de Pista"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {thrGeoCard("c1", d.c1label || "Cabecera 1")}
          {thrGeoCard("c2", d.c2label || "Cabecera 2")}
        </div>
      </Card>

      <Card eyebrow="Obstáculo" title="Datos del Obstáculo a Verificar">
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
            <Field label="Nombre / descripción" value={og.obsNombre} onChange={updO("obsNombre")} placeholder="ej. Torre, árbol, edificio" type="text" />
            <div>
              <Label>Cabecera más cercana al obstáculo</Label>
              <select value={og.obsCabecera} onChange={e => updO("obsCabecera")(e.target.value)} style={{ ...selStyle, width: "100%", padding: "7px 10px" }}>
                <option value="c1">{d.c1label || "Cabecera 1"}</option>
                <option value="c2">{d.c2label || "Cabecera 2"}</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11 }}>
            <Field label="Elevación de la base (terreno)" value={og.obsBaseElev} onChange={updO("obsBaseElev")} placeholder="2740" suffix="m" />
            <Field label="Altura del obstáculo (AGL)" value={og.obsAltura} onChange={updO("obsAltura")} placeholder="60" suffix="m" />
            <Field label="Elevación de la cima (o déjalo vacío)" value={og.obsElev} onChange={updO("obsElev")} placeholder="auto" suffix="m" />
          </div>
          {(() => {
            const b = parseFloat(og.obsBaseElev), a = parseFloat(og.obsAltura), c = parseFloat(og.obsElev);
            if (isNaN(c) && !isNaN(b) && !isNaN(a)) {
              return <div style={{ fontSize: 10, color: C.accent, marginTop: -5 }}>Cima calculada (base + altura) = {(b + a).toFixed(1)} m — se usará este valor.</div>;
            }
            return (
              <div style={{ fontSize: 10, color: C.text, marginTop: -5 }}>
                Completa la elevación de la cima directamente, o la base (terreno) + altura del obstáculo y se calcula sola.
              </div>
            );
          })()}
          {mode === "rect" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
              <Field label="X (a lo largo del eje, desde umbral)" value={og.obsX} onChange={updO("obsX")} placeholder="500" suffix="m" type="text" />
              <Field label="Y (lateral, + derecha)" value={og.obsY} onChange={updO("obsY")} placeholder="0" suffix="m" type="text" />
            </div>
          ) : mode === "dec" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
              <Field label="Latitud (decimal)" value={og.obsLatDec} onChange={updO("obsLatDec")} placeholder="-13.16" type="text" />
              <Field label="Longitud (decimal)" value={og.obsLonDec} onChange={updO("obsLonDec")} placeholder="-74.20" type="text" />
            </div>
          ) : mode === "utm" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 70px", gap: 8 }}>
                <Field label="Zona UTM" value={og.obsUtmZone} onChange={updO("obsUtmZone")} placeholder="18" type="text" />
                <div>
                  <Label>Hemisf.</Label>
                  <select value={og.obsUtmHemi} onChange={e => updO("obsUtmHemi")(e.target.value)} style={{ ...selStyle, width: "100%" }}>
                    <option value="S">S</option><option value="N">N</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Field label="Este (Easting)" value={og.obsUtmE} onChange={updO("obsUtmE")} placeholder="585900" suffix="m" type="text" />
                <Field label="Norte (Northing)" value={og.obsUtmN} onChange={updO("obsUtmN")} placeholder="8544600" suffix="m" type="text" />
              </div>
            </div>
          ) : (
            <>
              <div>
                <Label>Latitud (G° M' S")</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 54px", gap: 6 }}>
                  <Input type="text" value={og.obsLatDeg} onChange={updO("obsLatDeg")} placeholder="13" />
                  <Input type="text" value={og.obsLatMin} onChange={updO("obsLatMin")} placeholder="09" />
                  <Input type="text" value={og.obsLatSec} onChange={updO("obsLatSec")} placeholder="30" />
                  <select value={og.obsLatHemi} onChange={e => updO("obsLatHemi")(e.target.value)} style={selStyle}>
                    <option value="S">S</option><option value="N">N</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Longitud (G° M' S")</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 54px", gap: 6 }}>
                  <Input type="text" value={og.obsLonDeg} onChange={updO("obsLonDeg")} placeholder="74" />
                  <Input type="text" value={og.obsLonMin} onChange={updO("obsLonMin")} placeholder="12" />
                  <Input type="text" value={og.obsLonSec} onChange={updO("obsLonSec")} placeholder="10" />
                  <select value={og.obsLonHemi} onChange={e => updO("obsLonHemi")(e.target.value)} style={selStyle}>
                    <option value="W">W</option><option value="E">E</option>
                  </select>
                </div>
              </div>
            </>
          )}
          <button
            onClick={handleCheckObstacle}
            style={{ marginTop: 6, background: C.accentDim, border: "1px solid " + C.accent, borderRadius: 6, padding: "10px 20px", color: C.accent, fontSize: 13, fontWeight: 800, cursor: "pointer" }}
          >
            Verificar Obstáculo
          </button>
        </div>
      </Card>

      {obsResult && (
        <Card eyebrow="Resultado" title={obsResult.error ? "No se pudo evaluar" : "Chequeo de Penetración de Superficies"}>
          {obsResult.error ? (
            <div style={{ fontSize: 13, color: C.danger }}>{obsResult.error}</div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: C.text, marginBottom: 12, fontFamily: C.mono }}>
                {obsResult.cabLabel} ({obsResult.olsLabel}) · X = {obsResult.X.toFixed(1)} m · Y = {obsResult.Y.toFixed(1)} m · Elev. obstáculo = {obsResult.obsElev.toFixed(1)} m
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {obsResult.surfaces.map((s, i) => (
                  <div key={i} style={{
                    padding: "10px 12px", borderRadius: 8,
                    background: !s.r.aplica ? C.surf2 : s.penetra ? C.dangerDim : C.okDim,
                    border: "1px solid " + (!s.r.aplica ? C.border : s.penetra ? C.danger : C.ok),
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.white }}>{s.nombre} <span style={{ fontSize: 10, color: C.text, fontWeight: 400 }}>({s.ref})</span></span>
                      {s.r.aplica ? (
                        <span style={{ fontSize: 11, fontWeight: 900, color: s.penetra ? C.danger : C.ok }}>
                          {s.penetra ? "⚠ PENETRA" : "✓ LIBRE"}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: C.text }}>No aplica en este punto</span>
                      )}
                    </div>
                    {s.r.aplica ? (
                      <div style={{ fontSize: 11, color: C.textMid, marginTop: 4, fontFamily: C.mono }}>
                        Elev. superficie: {s.r.elevSuperficie.toFixed(1)} m &nbsp;|&nbsp; Margen: {s.margen >= 0 ? "+" : ""}{s.margen.toFixed(1)} m
                        {s.r.limitadaPorHorizInterna ? " (limitada por Horizontal Interna)" : ""}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: C.text, marginTop: 4 }}>{s.r.motivo}</div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 10, color: C.text, lineHeight: 1.5 }}>
                ⚠ Chequeo geométrico simplificado (perfil de pista recto, tierra plana equirectangular). No sustituye un levantamiento
                geodésico ni un estudio aeronáutico formal de obstáculos. Cónica, Horizontal Interna, Aproximación Interna,
                Transición Interna y Aterrizaje Interrumpido aún no están incluidas en este chequeo.
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function App() {
  const [d, setD] = useState(EMPTY);
  const [results, setResults] = useState(null);
  const [target, setTarget] = useState({ num: "", letter: "", opCat: "" });
  const [gaps, setGaps] = useState(null);
  const [audit, setAudit] = useState(null);
  const [tab, setTab] = useState("auditoria"); // "auditoria" | "obstaculos"

  const upd = (field) => (val) => setD(prev => ({ ...prev, [field]: val }));

  // ── Estado del verificador de obstáculos (Cap. 4) ──
  const OBS_EMPTY = {
    coordMode: "dms", // "dms" | "dec" | "utm" | "rect"
    // Georreferenciación cabecera 1 y 2
    c1RumboVerdadero: "", c1ThrElev: "",
    c1LatDeg: "", c1LatMin: "", c1LatSec: "", c1LatHemi: "S",
    c1LonDeg: "", c1LonMin: "", c1LonSec: "", c1LonHemi: "W",
    c1LatDec: "", c1LonDec: "",
    c1UtmZone: "18", c1UtmHemi: "S", c1UtmE: "", c1UtmN: "",
    c2RumboVerdadero: "", c2ThrElev: "",
    c2LatDeg: "", c2LatMin: "", c2LatSec: "", c2LatHemi: "S",
    c2LonDeg: "", c2LonMin: "", c2LonSec: "", c2LonHemi: "W",
    c2LatDec: "", c2LonDec: "",
    c2UtmZone: "18", c2UtmHemi: "S", c2UtmE: "", c2UtmN: "",
    // Obstáculo
    obsNombre: "", obsCabecera: "c1",
    obsBaseElev: "", obsAltura: "", obsElev: "",
    obsLatDeg: "", obsLatMin: "", obsLatSec: "", obsLatHemi: "S",
    obsLonDeg: "", obsLonMin: "", obsLonSec: "", obsLonHemi: "W",
    obsLatDec: "", obsLonDec: "",
    obsUtmZone: "18", obsUtmHemi: "S", obsUtmE: "", obsUtmN: "",
    obsX: "", obsY: "",
  };
  const [og, setOg] = useState(OBS_EMPTY);
  const [obsResult, setObsResult] = useState(null);
  const updO = (field) => (val) => setOg(prev => ({ ...prev, [field]: val }));

  const handleAnalyze = () => {
    const out = computeResults(d);
    if (out.error) return;
    setResults(out.results);
    setAudit(out.audit);
    setGaps(null);
    setTarget({ num: "", letter: "", opCat: "" });
  };

  // ── Verificador de obstáculos (pestaña "Obstáculos") ──
  const handleCheckObstacle = () => {
    if (!results || !results.arcNum) {
      setObsResult({ error: "Primero corre \"Analizar\" en la pestaña Auditoría de Pista (se necesita el número de clave)." });
      return;
    }
    const out = computeObstacleCheck(d, og);
    if (out.error) { setObsResult({ error: out.error }); return; }
    setObsResult(out.obsResult);
  };

  const handlePrint = () => {
    if (!audit || !results) return;

    const statusCfg = {
      "conforme":     { label: "CONFORME",                   color: "#2d7a4f", icon: "&#10003;" },
      "conforme-obs": { label: "CONFORME CON OBSERVACIONES", color: "#b7791f", icon: "&#9888;" },
      "no-conforme":  { label: "NO CONFORME",                color: "#c0392b", icon: "&#10007;" },
    }[audit.status];

    // ── Helpers HTML ──────────────────────────────────────────
    const section = (title) => "<div style='font-size:11px;font-weight:800;color:#0a1e3c;text-transform:uppercase;letter-spacing:.08em;margin:20px 0 10px;padding-bottom:4px;border-bottom:2px solid #1a3a6a'>" + title + "</div>";
    const tRow = (label, val, ok) => "<tr style='border-bottom:1px solid #e8eef6'><td style='padding:5px 8px;color:#555;width:40%'>" + label + "</td><td style='padding:5px 8px;font-family:monospace;font-weight:700;color:#111'>" + (val || "—") + "</td>" + (ok !== undefined ? "<td style='padding:5px 8px;text-align:center'>" + (ok === true ? "<span style='color:#2d7a4f'>&#10003;</span>" : ok === false ? "<span style='color:#c0392b'>&#10007;</span>" : "") + "</td>" : "") + "</tr>";
    const table = (rows, headers) => "<table style='width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px'>" + (headers ? "<thead><tr>" + headers.map(h => "<th style='padding:5px 8px;text-align:left;font-weight:800;color:#fff;background:#1a3a6a;font-size:10px'>" + h + "</th>").join("") + "</tr></thead>" : "") + "<tbody>" + rows + "</tbody></table>";

    // ── 1. Encabezado ─────────────────────────────────────────
    const elevAlert = results.elevAlert;

    const encabezado = "<div style='border-bottom:2px solid #1a3a6a;padding-bottom:16px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:flex-start'>" +
      "<div>" +
        "<div style='font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px'>Informe de Auditoria Preliminar · OACI Anexo 14, Vol. I, 9a edicion (julio 2022)</div>" +
        "<div style='font-size:22px;font-weight:900;color:#0a1e3c;margin:2px 0'>" + (d.airport || "Aeropuerto sin nombre") + "</div>" +
        "<div style='color:#444;font-size:12px;margin-top:2px'>" + (d.city ? d.city + " &nbsp;|&nbsp; " : "") + "Pista " + (d.runway || "—") + " &nbsp;|&nbsp; ARC <strong>" + results.arcNum + results.arcLetter + "</strong> &nbsp;|&nbsp; " + audit.date + "</div>" +
        (d.elevation ? "<div style='color:#555;font-size:11px;margin-top:2px'>Elevacion AD: <strong>" + parseFloat(d.elevation).toFixed(0) + " m AMSL (" + (parseFloat(d.elevation)*3.28084).toFixed(0) + " ft)</strong>" + (d.tempRef ? " &nbsp;|&nbsp; T ref: <strong>" + d.tempRef + "°C</strong>" : "") + "</div>" : "") +
        "<div style='margin-top:8px'>" + results.dd.filter(r => r.opCat && OP_CATS[r.opCat]).map(r => "<span style='border:1px solid #1a3a6a;color:#1a3a6a;padding:2px 8px;border-radius:3px;font-weight:700;font-size:10px;margin-right:6px'>" + r.label + ": " + OP_CATS[r.opCat].short + "</span>").join("") + "</div>" +
      "</div>" +
      "<div style='text-align:center;border:2px solid " + statusCfg.color + ";border-radius:8px;padding:12px 18px;min-width:140px'>" +
        "<div style='font-size:24px;font-weight:900;color:" + statusCfg.color + "'>" + statusCfg.icon + "</div>" +
        "<div style='font-size:9px;font-weight:900;color:" + statusCfg.color + ";text-transform:uppercase;margin-top:2px;max-width:120px'>" + statusCfg.label + "</div>" +
        "<div style='font-size:11px;color:#555;margin-top:4px'>" + audit.ncs.length + " NC &nbsp;·&nbsp; " + audit.obs.length + " OB</div>" +
      "</div>" +
    "</div>";

    // ── 2. Alerta de elevación ────────────────────────────────
    const elevSection = elevAlert ? "<div style='margin:12px 0;padding:8px 12px;background:" + (elevAlert.level === "danger" ? "#fdf0f0" : "#fef3c7") + ";border-left:3px solid " + (elevAlert.level === "danger" ? "#c0392b" : "#b7791f") + ";border-radius:4px;font-size:11px;color:#333'><strong>" + (elevAlert.level === "danger" ? "&#9888; AERÓDROMO DE MUY ALTA ALTITUD: " : "&#9888; AERÓDROMO DE ALTA ALTITUD: ") + "</strong>" + elevAlert.note + "</div>" : "";

    // ── 3. Características físicas ────────────────────────────
    const fisicas = section("1. Características Físicas de la Pista") +
      table(
        tRow("Longitud física", d.length ? d.length + " m" : null) +
        tRow("Ancho", d.width ? d.width + " m" : null) +
        tRow("Ancho franja declarada AIP", d.stripDeclared ? d.stripDeclared + " m total (" + (parseFloat(d.stripDeclared)/2).toFixed(0) + " m c/lado)" : null) +
        tRow("ARC determinado", results.arcNum + results.arcLetter + (results.arcLetterIsDeclared ? " (letra declarada)" : " (letra estimada por ancho — verificar aeronave crítica real)")),
        ["Parámetro", "Valor"]
      );

    // ── 4. Pendientes ─────────────────────────────────────────
    const slopeRows = [
      { label: "Pendiente media §3.1.13 (max-min/long)", val: d.slopeMean ? d.slopeMean + "%" : null, limit: results.meanLimit, ok: d.slopeMean ? parseFloat(d.slopeMean) <= results.meanLimit : undefined },
      { label: "Pendiente long. máxima local §3.1.14",   val: d.slopeMax ? d.slopeMax + "%" : null,   limit: results.limits.maxLong,   ok: d.slopeMax ? parseFloat(d.slopeMax) <= results.limits.maxLong : undefined },
      { label: "Pendiente 1° cuarto §3.1.14",            val: d.slopeQ1 ? d.slopeQ1 + "%" : null,     limit: results.quarterLimit,     ok: d.slopeQ1 ? parseFloat(d.slopeQ1) <= results.quarterLimit : undefined },
      { label: "Pendiente último cuarto §3.1.14",        val: d.slopeQ4 ? d.slopeQ4 + "%" : null,     limit: results.quarterLimit,     ok: d.slopeQ4 ? parseFloat(d.slopeQ4) <= results.quarterLimit : undefined },
      { label: "Pendiente transversal §3.1.19",          val: d.slopeTrans ? d.slopeTrans + "%" : null, limit: results.limits.transverse, ok: d.slopeTrans ? parseFloat(d.slopeTrans) <= results.limits.transverse : undefined },
    ];
    const pendientes = section("2. Verificación de Pendientes (ARC " + results.arcNum + ")") +
      table(
        slopeRows.map(r => tRow(r.label, r.val ? r.val + " (límite: " + r.limit + "%)" : "No declarada", r.ok)).join(""),
        ["Parámetro", "Valor declarado / Límite", "Cumple"]
      );

    // ── 5. Distancias declaradas ──────────────────────────────
    const ddSection = section("3. Distancias Declaradas") +
      table(
        "<tr style='background:#e8eef6'><th style='padding:5px 8px;color:#0a1e3c;font-size:10px'>Distancia</th>" +
        results.dd.map(r => "<th style='padding:5px 8px;color:#0a1e3c;font-size:10px'>" + r.label + "</th>").join("") + "</tr>" +
        ["tora","toda","asda","lda"].map(k =>
          "<tr style='border-bottom:1px solid #e8eef6'>" +
          "<td style='padding:5px 8px;font-weight:700;color:#1a3a6a;font-family:monospace'>" + k.toUpperCase() + "</td>" +
          results.dd.map(r => "<td style='padding:5px 8px;font-family:monospace'>" + (r[k] || "—") + " m</td>").join("") +
          "</tr>"
        ).join("")
      );

    // ── 6. Elementos especiales ───────────────────────────────
    const elemRows = results.dd.map(r => {
      const elems = [];
      if (r.clearway > 0)  elems.push("Clearway: " + r.clearway + " m");
      if (r.stopway > 0)   elems.push("Stopway: " + r.stopway + " m");
      if (r.displaced > 0) elems.push("Umbral desplazado: " + r.displaced + " m");
      return tRow(r.label, elems.length > 0 ? elems.join(" | ") : "Sin elementos especiales");
    }).join("");
    const elementos = section("4. Elementos Especiales") + table(elemRows, ["Cabecera", "Elementos"]);

    // ── 7. Categorías de operación ────────────────────────────
    const catRows = results.dd.filter(r => r.opCat && r.catLabel).map(r => {
      return tRow(r.label, r.catLabel + " | Franja req.: " + r.catStripHalfWidth + " m c/lado | " + r.catDhRvr);
    }).join("");
    const categorias = catRows ? section("5. Categorías de Operación por Cabecera") + table(catRows, ["Cabecera", "Categoría | Requisitos principales"]) : "";

    // ── 6. Superficies limitadoras de obstáculos (Cap. 4) ──────
    const olsReport = results.ols ? (() => {
      let html = section("6. Superficies Limitadoras de Obstáculos (Cap. 4)");
      if (results.ols.aerodrome) {
        html += table(
          tRow("Superficie Cónica", "Pendiente " + results.ols.aerodrome.conica.pendiente + "% · Altura " + results.ols.aerodrome.conica.altura + " m") +
          tRow("Horizontal Interna", "Altura " + results.ols.aerodrome.horizInterna.altura + " m · Radio " + results.ols.aerodrome.horizInterna.radio + " m")
        );
        html += "<div style='font-size:10px;color:#777;margin:-4px 0 10px'>Cónica y Horizontal Interna se establecen para todo el aeródromo — se muestra la combinación más exigente entre las cabeceras con categoría declarada.</div>";
      }
      results.ols.perThreshold.forEach(t => {
        html += "<div style='margin-bottom:10px;padding:10px 12px;background:#f7f9fc;border:1px solid #dde6f0;border-radius:6px;page-break-inside:avoid'>";
        html += "<div style='font-weight:800;font-size:12px;color:#0a1e3c;margin-bottom:4px'>" + t.label + "</div>";
        if (!t.ols) {
          html += "<div style='font-size:11px;color:#777'>Sin categoría de aproximación declarada para esta cabecera — no se pueden determinar las superficies.</div>";
        } else {
          html += "<div style='font-size:10px;color:#1a3a6a;margin-bottom:4px'>" + t.ols.label + "</div>";
          const rows = [];
          rows.push(tRow("Aproximación — borde interior", t.ols.aprox.bordeInterior + " m"));
          rows.push(tRow("Aproximación — distancia desde umbral", t.ols.aprox.distUmbral + " m"));
          rows.push(tRow("Aproximación — divergencia (c/lado)", t.ols.aprox.divergencia + "%"));
          rows.push(tRow("Aproximación — 1ª sección", t.ols.aprox.primera.longitud + " m @ " + t.ols.aprox.primera.pendiente + "%"));
          if (t.ols.aprox.segunda) rows.push(tRow("Aproximación — 2ª sección", t.ols.aprox.segunda.longitud + " m @ " + t.ols.aprox.segunda.pendiente + "%"));
          if (t.ols.aprox.seccionHorizontal) rows.push(tRow("Aproximación — longitud total", t.ols.aprox.seccionHorizontal.longitudTotal + " m"));
          if (t.ols.aproxInterna) {
            rows.push(tRow("Aproximación interna — anchura", t.ols.aproxInterna.anchura + " m" + (t.ols.aproxInterna.anchuraNota ? " (" + t.ols.aproxInterna.anchuraNota + ")" : "")));
            rows.push(tRow("Aprox. interna — distancia / longitud / pendiente", t.ols.aproxInterna.distUmbral + " m / " + t.ols.aproxInterna.longitud + " m / " + t.ols.aproxInterna.pendiente + "%"));
          }
          rows.push(tRow("Transición — pendiente", t.ols.transicion.pendiente + "%"));
          if (t.ols.transicionInterna) rows.push(tRow("Transición interna — pendiente", t.ols.transicionInterna.pendiente + "%"));
          if (t.ols.aterrInterrump) {
            rows.push(tRow("Aterrizaje interrump. — borde / divergencia / pendiente",
              t.ols.aterrInterrump.bordeInterior + " m / " + t.ols.aterrInterrump.divergencia + "% / " + t.ols.aterrInterrump.pendiente + "%"));
            rows.push(tRow("Aterrizaje interrump. — distancia desde umbral",
              (typeof t.ols.aterrInterrump.distUmbral === "number" ? t.ols.aterrInterrump.distUmbral + " m" : t.ols.aterrInterrump.distUmbral) +
              (t.ols.aterrInterrump.distUmbralNota ? " (" + t.ols.aterrInterrump.distUmbralNota + ")" : "")));
          }
          html += table(rows.join(""));
          if (t.opCat === "cat1") {
            html += "<div style='font-size:9px;color:#888;font-style:italic;margin-top:-4px'>Aproximación interna, transición interna y aterrizaje interrumpido son RECOMENDACIÓN (no obligatorias) en CAT I — Anexo 14 §4.2.14.</div>";
          }
        }
        html += "</div>";
      });
      if (results.ols.tocs) {
        html += "<div style='margin-top:6px;padding:10px 12px;background:#f7f9fc;border:1px solid #dde6f0;border-radius:6px;page-break-inside:avoid'>";
        html += "<div style='font-weight:800;font-size:12px;color:#0a1e3c;margin-bottom:4px'>De Ascenso en el Despegue <span style='font-weight:400;color:#777;font-size:10px'>(depende solo del número de clave " + results.arcNum + ")</span></div>";
        html += table(
          tRow("Borde interior", results.ols.tocs.bordeInterior + " m") +
          tRow("Distancia desde extremo", results.ols.tocs.distExtremo + " m") +
          tRow("Divergencia (c/lado)", results.ols.tocs.divergencia + "%") +
          tRow("Anchura final", results.ols.tocs.anchuraFinal + " m" + (results.ols.tocs.anchuraFinalNota ? " (" + results.ols.tocs.anchuraFinalNota + ")" : "")) +
          tRow("Longitud", results.ols.tocs.longitud + " m") +
          tRow("Pendiente", results.ols.tocs.pendiente + "%")
        );
        html += "</div>";
      }
      html += "<div style='font-size:10px;color:#888;margin-top:8px;line-height:1.5'>&#9888; Dimensiones de referencia (Tabla 4-1 / 4-2, Anexo 14 Vol. I, Cap. 4). No incluye verificación de penetración de obstáculos reales — requiere coordenadas georreferenciadas de pista y levantamiento de obstáculos (fases siguientes).</div>";
      return html;
    })() : "";

    // ── 7. Hallazgos ──────────────────────────────────────────
    const findingRows = audit.findings.map(f => {
      const color = f.severity === "NC" ? "#c0392b" : "#d68910";
      const bgH   = f.severity === "NC" ? "#fdf0f0" : "#fdf8e8";
      return "<div style='margin-bottom:14px;border:1px solid " + color + "44;border-radius:6px;overflow:hidden;page-break-inside:avoid'>" +
        "<div style='background:" + bgH + ";padding:7px 12px;display:flex;align-items:center;gap:10px;border-bottom:1px solid " + color + "22'>" +
          "<span style='font-family:monospace;font-weight:900;color:" + color + ";font-size:12px;min-width:58px'>" + f.id + "</span>" +
          "<span style='font-weight:800;color:" + color + ";font-size:10px;letter-spacing:.05em;border:1px solid " + color + ";padding:1px 6px;border-radius:3px'>" + f.severity + "</span>" +
          "<span style='font-weight:700;color:#111;font-size:12px;flex:1'>" + f.param + "</span>" +
          "<span style='color:" + color + ";font-family:monospace;font-size:10px;background:" + color + "15;padding:1px 6px;border-radius:3px'>" + f.ref + "</span>" +
        "</div>" +
        "<div style='padding:10px 12px;background:#fff;display:grid;grid-template-columns:1fr 1fr;gap:8px'>" +
          "<div><div style='font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px'>Valor encontrado</div><div style='font-family:monospace;font-size:11px;color:" + color + ";font-weight:700'>" + f.found + "</div></div>" +
          "<div><div style='font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px'>Requisito normativo</div><div style='font-family:monospace;font-size:11px;color:#444'>" + f.required + "</div></div>" +
          "<div style='grid-column:1/-1;padding-top:6px;border-top:1px solid #f0f0f0'><div style='font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px'>Descripción</div><div style='font-size:11px;color:#222;line-height:1.5'>" + f.description + "</div></div>" +
          "<div style='grid-column:1/-1'><div style='font-size:9px;color:#1a3a6a;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px'>Recomendación</div><div style='font-size:11px;color:#222;line-height:1.5'>" + f.recommendation + "</div></div>" +
        "</div>" +
      "</div>";
    }).join("");

    // ── Resumen ejecutivo ──────────────────────────────────────
    const resumen = audit.status === "conforme"
      ? "La pista " + (d.runway || "") + " del " + (d.airport || "aeropuerto") + " cumple todos los parámetros físicos evaluados conforme al ARC " + results.arcNum + results.arcLetter + " y las categorías de operación declaradas."
      : audit.status === "conforme-obs"
      ? "La pista " + (d.runway || "") + " no presenta no conformidades, pero se identificaron " + audit.obs.length + " observación(es) por datos no declarados. Se recomienda completar la información para una evaluación integral."
      : "La pista " + (d.runway || "") + " presenta " + audit.ncs.length + " no conformidad(es) respecto al ARC " + results.arcNum + results.arcLetter + " y las categorías de operación declaradas. Se requieren intervenciones correctivas antes de modificar o mantener la designación actual.";

    // ── Glosario de acrónimos (solo los usados en esta app) ─────
    const glosarioGrupos = [
      ["Organismos y publicaciones", [
        ["OACI / ICAO", "Organización de Aviación Civil Internacional"],
        ["AIP", "Publicación de Información Aeronáutica"],
        ["AMDT", "Enmienda (a la AIP)"],
        ["CORPAC", "Corporación Peruana de Aeropuertos y Aviación Comercial"],
        ["FAP", "Fuerza Aérea del Perú"],
      ]],
      ["Aeródromo y pista", [
        ["AD", "Aeródromo"],
        ["ARP", "Punto de Referencia del Aeródromo"],
        ["ARC", "Clave de Referencia de Aeródromo (Aerodrome Reference Code)"],
        ["RWY", "Pista (Runway)"],
        ["THR", "Umbral de pista"],
        ["AMSL", "Sobre el nivel medio del mar"],
      ]],
      ["Distancias declaradas y franja", [
        ["TORA", "Recorrido de despegue disponible"],
        ["TODA", "Distancia de despegue disponible"],
        ["ASDA", "Distancia de aceleración-parada disponible"],
        ["LDA", "Distancia de aterrizaje disponible"],
        ["RESA", "Área de seguridad de extremo de pista"],
        ["SWY", "Zona de parada (Stopway)"],
        ["CWY", "Zona libre de obstáculos de despegue (Clearway)"],
        ["OLS", "Superficies limitadoras de obstáculos"],
        ["TKOF / LDG", "Despegue / Aterrizaje"],
      ]],
      ["Categorías de aproximación y ayudas", [
        ["CAT I / II / III", "Categorías de aproximación de precisión (con ILS)"],
        ["NPA", "Aproximación de no precisión"],
        ["VFR", "Reglas de vuelo visual"],
        ["MDA", "Altitud mínima de descenso (aprox. de no precisión)"],
        ["DH", "Altura de decisión (aprox. de precisión)"],
        ["RVR", "Alcance visual en pista"],
        ["ILS", "Sistema de aterrizaje instrumental"],
        ["VOR", "Radiofaro omnidireccional VHF"],
        ["DME", "Equipo medidor de distancia"],
        ["LOC", "Localizador (componente del ILS)"],
        ["NDB", "Radiofaro no direccional"],
        ["RNAV / LNAV", "Navegación de área / navegación lateral"],
        ["HIAL", "Luces de aproximación de alta intensidad"],
      ]],
      ["Resistencia de pavimento y aeronave", [
        ["PCN / ACN", "Número de Clasificación de Pavimento / de Aeronave (método histórico)"],
        ["PCR / ACR", "Reemplazo de PCN/ACN, vigente desde nov. 2024 (Enmienda 15, Anexo 14)"],
        ["OMGWS", "Separación entre ruedas exteriores del tren principal (define letra de clave)"],
      ]],
      ["Hallazgos de esta auditoría", [
        ["NC", "No Conformidad — incumple un requisito normativo"],
        ["OB", "Observación — dato no declarado o pendiente de verificar"],
      ]],
    ];
    const glosario = section("8. Glosario de Acrónimos") +
      glosarioGrupos.map(([grupo, items]) =>
        "<div style='font-size:10px;font-weight:800;color:#1a3a6a;text-transform:uppercase;letter-spacing:.06em;margin:10px 0 4px'>" + grupo + "</div>" +
        table(items.map(([a, m]) => tRow(a, m)).join(""))
      ).join("");

    // ── HTML COMPLETO ─────────────────────────────────────────
    const html = "<!DOCTYPE html><html><head><meta charset='utf-8'>" +
      "<title>Informe Auditoria - " + (d.airport || "Aeropuerto") + " - " + audit.date + "</title>" +
      "<style>" +
      "body{font-family:Arial,sans-serif;padding:32px 40px;color:#111;font-size:12px;line-height:1.4}" +
      "table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px}" +
      "td,th{vertical-align:top}" +
      "@media print{body{padding:20px 28px}.no-break{page-break-inside:avoid}}" +
      "</style></head><body>" +
      encabezado +
      elevSection +
      fisicas +
      pendientes +
      ddSection +
      elementos +
      categorias +
      olsReport +
      section("7. Hallazgos de Auditoría (" + audit.findings.length + ")") +
      (audit.findings.length === 0 ? "<p style='color:#2d7a4f;font-size:13px'>&#10003; No se identificaron hallazgos. La pista cumple todos los parámetros evaluados.</p>" : findingRows) +
      "<div style='margin-top:20px;padding:14px 16px;border:2px solid " + statusCfg.color + ";border-radius:6px;page-break-inside:avoid'>" +
        "<div style='font-size:10px;font-weight:900;color:" + statusCfg.color + ";text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px'>Resumen Ejecutivo</div>" +
        "<div style='font-size:12px;line-height:1.6'>" + resumen + "</div>" +
      "</div>" +
      glosario +
      "<div style='margin-top:24px;padding-top:10px;border-top:1px solid #ccd6e8;display:flex;justify-content:space-between;font-size:8px;color:#888'>" +
        "<span>Analizador de Pista OACI · Informe Preliminar</span>" +
        "<span>OACI Anexo 14, Vol. I, 9a edicion (julio 2022) · No sustituye evaluacion tecnica certificada</span>" +
        "<span>By: Stuart Rivera &nbsp;·&nbsp; " + audit.date + "</span>" +
      "</div>" +
      "</body></html>";

    const slugify = (s) => (s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar tildes/diacríticos
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const cityPart = slugify(d.city) ? slugify(d.city) + "-" : "";
    const filename = "informe-pista-" + cityPart + (d.runway || "rwy").replace("/", "-") + "-" + audit.date.replace(/\//g, "") + ".html";
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGapAnalysis = () => {
    if (!results || !target.num || !target.letter) return;
    const out = computeGapAnalysis(d, results, target);
    if (out.error) return;
    setGaps(out.gaps);
  };

  // ─── RENDER ──────────────────────────────────────────────────

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.textBright, fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: 60 }}>

      {/* ── HEADER ── */}
      <div style={{ background: C.surf, borderBottom: `1px solid ${C.border}`, padding: "14px 22px", display: "flex", alignItems: "center", gap: 14 }}>
        <svg width="36" height="36" viewBox="0 0 36 36">
          <rect width="36" height="36" rx="8" fill={C.accentDim} />
          <rect x="4" y="17" width="28" height="3" rx="1.5" fill={C.border} />
          {[6,10,14,18,22].map(x => <rect key={x} x={x} y="18" width="3" height="1.5" fill={C.accent} opacity="0.7" />)}
          <rect x="4" y="17" width="2" height="3" fill={C.warn} opacity="0.8" />
          <rect x="30" y="17" width="2" height="3" fill={C.warn} opacity="0.8" />
          <rect x="17" y="8" width="2" height="6" rx="1" fill={C.accent} opacity="0.5" />
        </svg>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.white, letterSpacing: "-0.01em" }}>
            {d.icao && d.icao.trim() ? `RWY ${d.icao.trim().toUpperCase()}` : "Analizador de Pista"}
          </div>
          <div style={{ fontSize: 10, color: C.text, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            OACI Anexo 14 — Vol. I, 9ª edición (julio 2022)
          </div>
          <div style={{ fontSize: 9, color: C.textMid, marginTop: 2 }}>
            By: Stuart Rivera
          </div>
        </div>
        <button
          onClick={() => { setD(EMPTY); setResults(null); setGaps(null); setAudit(null); setOg(OBS_EMPTY); setObsResult(null); }}
          style={{ marginLeft: "auto", background: "none", border: "1px solid " + C.border, borderRadius: 6, padding: "6px 14px", color: C.text, fontSize: 12, cursor: "pointer" }}
        >
          Nuevo
        </button>
        <select
          defaultValue=""
          onChange={e => {
            if (e.target.value === "") return;
            const ap = AIRPORTS[e.target.value];
            if (ap) {
              setD(ap);
              setResults(null); setGaps(null); setAudit(null);
              setOg({ ...OBS_EMPTY, ...(ap.geo || {}) });
              setObsResult(null);
            }
            e.target.value = "";
          }}
          style={{ background: C.surf2, border: "1px solid " + C.border, borderRadius: 6, padding: "6px 12px", color: C.textMid, fontSize: 12, cursor: "pointer" }}
        >
          <option value="">Cargar aeropuerto...</option>
          {Object.entries(AIRPORTS).map(([key, ap]) => (
            <option key={key} value={key}>{ap._name}</option>
          ))}
        </select>
      </div>

      {/* ── PESTAÑAS ── */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "14px 16px 0", display: "flex", gap: 8 }}>
        {[
          { key: "auditoria", label: "Auditoría de Pista" },
          { key: "obstaculos", label: "Obstáculos (Cap. 4)" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: tab === t.key ? C.surf3 : "transparent",
              border: "1px solid " + (tab === t.key ? C.borderBright : C.border),
              borderBottom: tab === t.key ? "2px solid " + C.accent : "1px solid " + C.border,
              borderRadius: "6px 6px 0 0",
              padding: "8px 16px",
              color: tab === t.key ? C.white : C.text,
              fontSize: 13,
              fontWeight: tab === t.key ? 700 : 400,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "22px 16px" }}>
        {tab === "auditoria" && (
        <>

        {/* ── INPUTS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Card eyebrow="Identificación" title="Aeródromo y Pista">
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                <Field label="Ciudad" value={d.city} onChange={upd("city")} placeholder="ej. Ayacucho" type="text" />
                <Field label="Aeropuerto" value={d.airport} onChange={upd("airport")} placeholder="Nombre del aeropuerto" type="text" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                <Field label="Código OACI (ICAO)" value={d.icao} onChange={upd("icao")} placeholder="ej. SPQU" type="text" />
                <Field label="Designación de pista" value={d.runway} onChange={upd("runway")} placeholder="ej. 12/30" type="text" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                <Field label="Elevación del AD" value={d.elevation} onChange={upd("elevation")} placeholder="3826" suffix="m" />
                <Field label="Temp. de referencia" value={d.tempRef} onChange={upd("tempRef")} placeholder="19.8" suffix="°C" />
              </div>
              <div>
                <Label>Categoría de operación general</Label>
                <select
                  value={d.opCat}
                  onChange={e => upd("opCat")(e.target.value)}
                  style={{ width: "100%", background: C.surf3, border: "1px solid " + C.border, borderRadius: 5, padding: "7px 10px", color: d.opCat ? C.white : C.text, fontSize: 13, fontFamily: C.mono }}
                >
                  <option value="">— Seleccionar —</option>
                  {Object.entries(OP_CATS).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                <Field label="Longitud física" value={d.length} onChange={upd("length")} placeholder="4200" suffix="m" />
                <Field label="Ancho" value={d.width} onChange={upd("width")} placeholder="45" suffix="m" />
              </div>
              <Field label="Ancho franja declarada AIP (total)" value={d.stripDeclared} onChange={upd("stripDeclared")} placeholder="150" suffix="m" />
              <div>
                <Label>Letra de clave OACI declarada (si se conoce)</Label>
                <select
                  value={d.arcLetterKnown}
                  onChange={e => upd("arcLetterKnown")(e.target.value)}
                  style={{ width: "100%", background: C.surf3, border: "1px solid " + C.border, borderRadius: 5, padding: "7px 10px", color: d.arcLetterKnown ? C.white : C.text, fontSize: 13, fontFamily: C.mono }}
                >
                  <option value="">— Automática (estimar por ancho) —</option>
                  {["A", "B", "C", "D", "E", "F"].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <div style={{ fontSize: 10, color: C.text, marginTop: 4, lineHeight: 1.4 }}>
                  El ancho de pista solo fija un mínimo por letra (varias letras pueden compartir el
                  mismo mínimo). La letra real depende de la aeronave crítica — declárala aquí si la conoces.
                </div>
              </div>
            </div>
          </Card>

          <Card eyebrow="Perfil Geométrico" title="Pendientes">
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <Field label="Pendiente media (max-min / longitud) §3.1.13" value={d.slopeMean} onChange={upd("slopeMean")} placeholder="1.0" suffix="%" />
              <Field label="Pendiente longitudinal maxima local §3.1.14" value={d.slopeMax} onChange={upd("slopeMax")} placeholder="1.25" suffix="%" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                <Field label="Primer cuarto" value={d.slopeQ1} onChange={upd("slopeQ1")} placeholder="0.8" suffix="%" />
                <Field label="Último cuarto" value={d.slopeQ4} onChange={upd("slopeQ4")} placeholder="0.8" suffix="%" />
              </div>
              <Field label="Pendiente transversal" value={d.slopeTrans} onChange={upd("slopeTrans")} placeholder="1.5" suffix="%" />
            </div>
          </Card>
        </div>

        {/* Declared distances */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
          {[["c1", "RWY 1"], ["c2", "RWY 2"]].map(([px, fallback]) => (
            <Card key={px} eyebrow="Distancias Declaradas" title={d[`${px}label`] || fallback}>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <Field label="Designación" value={d[`${px}label`]} onChange={upd(`${px}label`)} placeholder={fallback} type="text" />
                <div>
                  <Label>Categoría de aproximación</Label>
                  <select
                    value={d[`${px}opCat`]}
                    onChange={e => upd(`${px}opCat`)(e.target.value)}
                    style={{ width: "100%", background: C.surf3, border: `1px solid ${C.border}`, borderRadius: 5, padding: "7px 10px", color: d[`${px}opCat`] ? C.white : C.text, fontSize: 12, fontFamily: C.mono }}
                  >
                    <option value="">— Seleccionar —</option>
                    {Object.entries(OP_CATS).map(([key, cat]) => (
                      <option key={key} value={key}>{cat.short} — {cat.label}</option>
                    ))}
                  </select>
                </div>
                {["tora", "toda", "asda", "lda"].map(k => (
                  <Field key={k} label={k.toUpperCase()} value={d[`${px}${k}`]} onChange={upd(`${px}${k}`)} placeholder="" suffix="m" />
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          style={{
            marginTop: 18, width: "100%",
            background: `linear-gradient(135deg, ${C.accent}, #3A7EC0)`,
            color: C.bg, border: "none", borderRadius: 8, padding: "13px 0",
            fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          ▶ Analizar Pista
        </button>

        {/* ── RESULTS ── */}
        {results && (
          <div style={{ marginTop: 26 }}>
            <div style={{ fontSize: 10, color: C.text, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
              ── Resultados ──────────────────────────────────────────────────
            </div>

            {/* Alerta de elevación */}
            {(() => {
              const alert = results.elevAlert;
              if (!alert) return null;
              const alertColor = alert.level === "danger" ? C.danger : alert.level === "warn" ? C.warn : C.accent;
              const alertBg    = alert.level === "danger" ? C.dangerDim : alert.level === "warn" ? C.warnDim : C.accentDim;
              return (
                <div style={{ padding: "12px 14px", background: alertBg, borderRadius: 8, borderLeft: "3px solid " + alertColor, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: alertColor, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                    {alert.level === "danger" ? "⚠ " : "△ "}{alert.label}
                    {d.elevation && <span style={{ fontFamily: C.mono, marginLeft: 8 }}>{parseFloat(d.elevation).toFixed(0)} m / {(parseFloat(d.elevation) * 3.28084).toFixed(0)} ft AMSL</span>}
                    {d.tempRef && <span style={{ fontFamily: C.mono, marginLeft: 8 }}>T ref: {d.tempRef}°C</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.textBright, lineHeight: 1.5 }}>{alert.note}</div>
                </div>
              );
            })()}

            {/* Categoría de operación */}
            {d.opCat && results.catSummary && (() => {
              const cat = results.catSummary;
              const lengthOk = cat.lengthOk;
              const stripOk = cat.stripOk;
              return (
                <Card eyebrow="Categoría de Operación" style={{ marginBottom: 14, borderColor: cat.color + "55" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ background: cat.color + "22", border: `1px solid ${cat.color}55`, borderRadius: 8, padding: "6px 16px" }}>
                      <span style={{ fontFamily: C.mono, fontSize: 18, fontWeight: 900, color: cat.color }}>{cat.short}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: C.white, fontWeight: 700 }}>{cat.label}</div>
                      <div style={{ fontSize: 12, color: C.text, marginTop: 2 }}>{cat.notes}</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
                    {[
                      { label: "Sup. aproximación", val: cat.approachSlope },
                      { label: "Ancho franja mín. (c/lado)", val: `${cat.stripHalfWidth} m`, ok: stripOk },
                      { label: "DH / RVR", val: cat.dhRvr },
                      ...(cat.minLength ? [{ label: "Long. mín. referencial", val: `${cat.minLength} m`, ok: lengthOk }] : []),
                    ].map(({ label, val, ok }) => (
                      <div key={label} style={{ background: C.surf2, borderRadius: 6, padding: "8px 10px" }}>
                        <div style={{ fontSize: 10, color: C.text, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontFamily: C.mono, fontSize: 12, color: ok === false ? C.danger : ok === true ? C.ok : C.textBright, fontWeight: 700 }}>{val}</span>
                          {ok === true && <StatusIcon ok={true} />}
                          {ok === false && <StatusIcon ok={false} />}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: C.text }}>
                    ⚠ Parámetros de aproximación referenciales — Anexo 14, Vol. I, 9ª ed. (julio 2022).
                  </div>
                </Card>
              );
            })()}

            <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 14 }}>
              {/* ARC */}
              <Card>
                <ARCBadge num={results.arcNum} letter={results.arcLetter} />
                <div style={{ fontSize: 10, color: results.arcLetterIsDeclared ? "#5fa876" : "#c9a227", marginTop: -6, marginBottom: 8 }}>
                  {results.arcLetterIsDeclared
                    ? "Letra declarada por el usuario"
                    : "Letra estimada por ancho — verificar aeronave crítica real"}
                </div>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { label: "Long. máx.", val: `${results.limits.maxLong}%` },
                    { label: "Cuartos",    val: `${results.limits.quarter}%` },
                    { label: "Transv.",    val: `${results.limits.transverse}%` },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: C.text }}>{label}</span>
                      <span style={{ fontSize: 12, fontFamily: C.mono, color: C.textMid }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 6, fontSize: 10, color: C.text, lineHeight: 1.5 }}>
                    Referencia: Cuadro 3-1<br />Verificar enmiendas vigentes
                  </div>
                </div>
              </Card>

              {/* Slope compliance */}
              <Card eyebrow="Verificación — 9ª edición" title="Cumplimiento de Pendientes">
                {[
                  { label: "Pendiente media §3.1.13 (max-min/long)", key: "slopeMean", limit: results.meanLimit },
                  { label: "Pendiente long. maxima local §3.1.14",   key: "slopeMax",  limit: results.limits.maxLong },
                  { label: "Pendiente 1er cuarto §3.1.14",           key: "slopeQ1",   limit: results.quarterLimit },
                  { label: "Pendiente ultimo cuarto §3.1.14",        key: "slopeQ4",   limit: results.quarterLimit },
                  { label: "Pendiente transversal §3.1.19",          key: "slopeTrans", limit: results.limits.transverse },
                ].map(({ label, key, limit }) => {
                  const val = parseFloat(d[key]);
                  if (isNaN(val)) return null;
                  const ok = val <= limit;
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ flex: 2, fontSize: 13, color: C.textMid }}>{label}</span>
                      <span style={{ width: 64, textAlign: "right", fontFamily: C.mono, fontSize: 13, color: C.white }}>{val}%</span>
                      <span style={{ width: 64, textAlign: "right", fontFamily: C.mono, fontSize: 11, color: C.text }}>≤ {limit}%</span>
                      <span style={{ width: 20, textAlign: "center" }}><StatusIcon ok={ok} /></span>
                    </div>
                  );
                })}
                {/* Summary */}
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(() => {
                    const checks = [
                      { key: "slopeMax", limit: results.limits.maxLong },
                      { key: "slopeQ1",  limit: results.limits.quarter },
                      { key: "slopeQ4",  limit: results.limits.quarter },
                      { key: "slopeTrans", limit: results.limits.transverse },
                    ].filter(c => !isNaN(parseFloat(d[c.key])));
                    const fails = checks.filter(c => parseFloat(d[c.key]) > c.limit);
                    return fails.length > 0
                      ? <Pill label={`${fails.length} pendiente${fails.length > 1 ? "s" : ""} fuera de límite`} color={C.danger} bg={C.dangerDim} />
                      : <Pill label="Todas las pendientes dentro de límites" color={C.ok} bg={C.okDim} />;
                  })()}
                </div>
              </Card>
            </div>

            {/* DD cards */}
            {results.dd.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                {results.dd.map((dd, i) => (
                  <Card key={i} eyebrow="Distancias Declaradas" title={dd.label}>
                    {/* Categoría por RWY */}
                    {dd.opCat && dd.catShort && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "5px 8px", background: dd.catColor + "18", borderRadius: 6, border: `1px solid ${dd.catColor}33` }}>
                        <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 800, color: dd.catColor }}>{dd.catShort}</span>
                        <span style={{ fontSize: 11, color: C.textMid }}>{dd.catLabel}</span>
                        <span style={{ fontSize: 10, color: C.text, marginLeft: "auto" }}>{dd.catDhRvr}</span>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                      {["tora", "toda", "asda", "lda"].map(k => (
                        <div key={k} style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}`, paddingRight: 12 }}>
                          <div style={{ fontSize: 10, color: C.accent, fontFamily: C.mono, fontWeight: 700 }}>{k.toUpperCase()}</div>
                          <div style={{ fontSize: 14, color: C.white, fontFamily: C.mono, marginTop: 1 }}>{dd[k]} <span style={{ fontSize: 10, color: C.text }}>m</span></div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {dd.clearway > 0 && <Pill label={`CWY ${dd.clearway} m`} color={C.ok} bg={C.okDim} />}
                      {dd.stopway > 0 && <Pill label={`SWY ${dd.stopway} m`} color={C.ok} bg={C.okDim} />}
                      {dd.displaced > 0 && <Pill label={`THR desplazado ${dd.displaced} m`} color={C.warn} bg={C.warnDim} />}
                      {!dd.clearway && !dd.stopway && !dd.displaced && (
                        <span style={{ fontSize: 11, color: C.text }}>Sin elementos especiales</span>
                      )}
                      {!dd.coherent && <Pill label="⚠ Inconsistencia en distancias" color={C.danger} bg={C.dangerDim} />}
                    </div>
                    <RunwayDiagram dd={dd} />
                  </Card>
                ))}
              </div>
            )}

            {/* Nota: Superficies Limitadoras de Obstáculos (Cap. 4) se movió a la pestaña "Obstáculos" */}


            {/* ── GAP ANALYSIS ── */}
            <Card eyebrow="Análisis de Brechas" title="Subida de Categoría ARC" style={{ marginTop: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 18 }}>
                {[
                  { label: "Número objetivo", field: "num", options: [1, 2, 3, 4] },
                ].map(({ label, field, options }) => (
                  <div key={field}>
                    <Label>{label}</Label>
                    <select
                      value={target.num}
                      onChange={e => setTarget({ num: e.target.value, letter: "", opCat: target.opCat })}
                      style={{ background: C.surf3, border: `1px solid ${C.border}`, borderRadius: 5, padding: "7px 12px", color: C.white, fontSize: 14, fontFamily: C.mono, minWidth: 80 }}
                    >
                      <option value="">—</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <Label>Letra objetivo</Label>
                  <select
                    value={target.letter}
                    onChange={e => setTarget(t => ({ ...t, letter: e.target.value }))}
                    disabled={!target.num}
                    style={{ background: C.surf3, border: `1px solid ${C.border}`, borderRadius: 5, padding: "7px 12px", color: C.white, fontSize: 14, fontFamily: C.mono, minWidth: 80, opacity: target.num ? 1 : 0.4 }}
                  >
                    <option value="">—</option>
                    {["A", "B", "C", "D", "E", "F"].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Categoría objetivo</Label>
                  <select
                    value={target.opCat}
                    onChange={e => setTarget(t => ({ ...t, opCat: e.target.value }))}
                    style={{ background: C.surf3, border: `1px solid ${C.border}`, borderRadius: 5, padding: "7px 12px", color: C.white, fontSize: 13, fontFamily: C.mono, minWidth: 120 }}
                  >
                    <option value="">— Opcional —</option>
                    {Object.entries(OP_CATS).map(([key, cat]) => (
                      <option key={key} value={key}>{cat.short}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleGapAnalysis}
                  disabled={!target.num || !target.letter}
                  style={{
                    background: target.num && target.letter ? C.surf3 : C.surf2,
                    border: `1px solid ${target.num && target.letter ? C.accent : C.border}`,
                    borderRadius: 6, padding: "7px 18px",
                    color: target.num && target.letter ? C.accent : C.text,
                    fontSize: 13, fontWeight: 700,
                    cursor: target.num && target.letter ? "pointer" : "default",
                    marginTop: 18,
                  }}
                >
                  Calcular brechas →
                </button>
              </div>

              {gaps && (
                <div>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                    <div style={{ fontFamily: C.mono, fontSize: 14 }}>
                      <span style={{ color: C.white, fontWeight: 800 }}>ARC {gaps.from}</span>
                      {gaps.fromCat && <span style={{ color: C.text, fontSize: 12 }}> {gaps.fromCat}</span>}
                      <span style={{ color: C.accent, margin: "0 10px", fontSize: 16 }}>→</span>
                      <span style={{ color: C.white, fontWeight: 800 }}>ARC {gaps.to}</span>
                      {gaps.toCat && <span style={{ color: C.text, fontSize: 12 }}> {gaps.toCat}</span>}
                    </div>
                    {gaps.critical.length > 0
                      ? <Pill label={`${gaps.critical.length} brecha${gaps.critical.length > 1 ? "s" : ""} crítica${gaps.critical.length > 1 ? "s" : ""}`} color={C.danger} bg={C.dangerDim} />
                      : <Pill label="Sin brechas físicas" color={C.ok} bg={C.okDim} />
                    }
                  </div>

                  {/* Table */}
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: C.surf2 }}>
                          {["Parámetro", "Estado actual", "Requisito", "Delta", "Intervención"].map(h => (
                            <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: C.text, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gaps.rows.map((row, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? C.surf : C.surf2 }}>
                            <td style={{ padding: "8px 12px", color: C.textMid, borderBottom: `1px solid ${C.border}` }}>{row.param}</td>
                            <td style={{ padding: "8px 12px", fontFamily: C.mono, color: C.white, borderBottom: `1px solid ${C.border}` }}>{row.current}</td>
                            <td style={{ padding: "8px 12px", fontFamily: C.mono, color: C.text, borderBottom: `1px solid ${C.border}` }}>{row.required}</td>
                            <td style={{ padding: "8px 12px", fontFamily: C.mono, fontWeight: 800, color: row.ok ? C.ok : C.danger, borderBottom: `1px solid ${C.border}` }}>{row.delta}</td>
                            <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
                              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: row.ok ? C.okDim : C.dangerDim, color: row.ok ? C.ok : C.danger }}>
                                {row.action}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Tabla de brechas de categoría */}
                  {gaps.catRows && gaps.catRows.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 10, color: C.accent, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
                        Brechas de Categoría de Operación — {gaps.fromCat} → {gaps.toCat}
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: C.surf2 }}>
                              {["Parámetro", "Actual", "Objetivo", "Delta", "Intervención"].map(h => (
                                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: C.text, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {gaps.catRows.map((row, i) => (
                              <tr key={i} style={{ background: i % 2 === 0 ? C.surf : C.surf2 }}>
                                <td style={{ padding: "8px 12px", color: C.textMid, borderBottom: `1px solid ${C.border}` }}>{row.param}</td>
                                <td style={{ padding: "8px 12px", fontFamily: C.mono, fontSize: 12, color: C.text, borderBottom: `1px solid ${C.border}` }}>{row.current}</td>
                                <td style={{ padding: "8px 12px", fontFamily: C.mono, fontSize: 12, color: C.white, borderBottom: `1px solid ${C.border}` }}>{row.required}</td>
                                <td style={{ padding: "8px 12px", fontFamily: C.mono, fontWeight: 800, color: row.ok === false ? C.danger : row.ok === true ? C.ok : C.text, borderBottom: `1px solid ${C.border}` }}>{row.delta}</td>
                                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
                                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: row.ok === false ? C.dangerDim : row.ok === true ? C.okDim : C.accentDim, color: row.ok === false ? C.danger : row.ok === true ? C.ok : C.accent }}>
                                    {row.action}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Conclusion */}
                  <div style={{ marginTop: 14, padding: "14px 16px", background: gaps.critical.length > 0 ? C.dangerDim : C.okDim, borderRadius: 8, borderLeft: `3px solid ${gaps.critical.length > 0 ? C.danger : C.ok}` }}>
                    <div style={{ fontSize: 11, color: gaps.critical.length > 0 ? C.danger : C.ok, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                      {gaps.critical.length > 0 ? "⚠ Obras requeridas" : "✓ Compatible con ARC objetivo"}
                    </div>
                    <div style={{ fontSize: 13, color: C.textBright, lineHeight: 1.6 }}>
                      {gaps.critical.length > 0 ? (
                        <>
                          Se identificaron <strong>{gaps.critical.length}</strong> brecha{gaps.critical.length > 1 ? "s" : ""} crítica{gaps.critical.length > 1 ? "s" : ""} para alcanzar <strong>ARC {gaps.to}</strong>.
                          {" "}Las intervenciones requeridas son:{" "}
                          {[...new Set(gaps.critical.map(r => r.action))].join(", ")}.
                        </>
                      ) : (
                        <>Los parámetros físicos analizados son compatibles con <strong>ARC {gaps.to}</strong>. Verificar separaciones de calles de rodaje, franjas de pista y superficies OLS antes de modificar la designación.</>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.text, marginTop: 8 }}>
                      ⚠ Análisis preliminar. OACI Anexo 14, Vol. I, 9ª ed. (julio 2022). Realizar estudio topográfico certificado.
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* ── INFORME DE AUDITORÍA ── */}
            {audit && (() => {
              const statusCfg = {
                "conforme":     { label: "CONFORME",                   color: C.ok,     bg: C.okDim,     icon: "✓" },
                "conforme-obs": { label: "CONFORME CON OBSERVACIONES", color: C.warn,   bg: C.warnDim,   icon: "⚠" },
                "no-conforme":  { label: "NO CONFORME",                color: C.danger, bg: C.dangerDim, icon: "✗" },
              }[audit.status];

              return (
                <Card eyebrow="Informe de Auditoría — OACI Anexo 14" style={{ marginTop: 14, borderColor: statusCfg.color + "44" }}>

                  {/* Encabezado */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start", marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: C.white }}>{d.airport || "Aeropuerto sin nombre"}</div>
                      <div style={{ fontSize: 12, color: C.textMid, marginTop: 3, fontFamily: C.mono }}>
                        {d.city ? `${d.city} | ` : ""}Pista {d.runway || "—"} | ARC {results.arcNum}{results.arcLetter} | {audit.date}
                      </div>
                      <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {results.dd.map((rwy, i) => rwy.opCat && (
                          <span key={i} style={{ fontSize: 11, color: OP_CATS[rwy.opCat].color, background: OP_CATS[rwy.opCat].color + "18", padding: "1px 7px", borderRadius: 4, fontFamily: C.mono, fontWeight: 700 }}>
                            {rwy.label}: {OP_CATS[rwy.opCat].short}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: "center", background: statusCfg.bg, border: `1px solid ${statusCfg.color}44`, borderRadius: 8, padding: "10px 18px" }}>
                      <div style={{ fontSize: 22, color: statusCfg.color, fontWeight: 900 }}>{statusCfg.icon}</div>
                      <div style={{ fontSize: 10, color: statusCfg.color, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2, maxWidth: 140 }}>{statusCfg.label}</div>
                      <div style={{ fontSize: 11, color: C.text, marginTop: 6 }}>{audit.ncs.length} NC · {audit.obs.length} OB</div>
                    </div>
                  </div>

                  {/* Hallazgos en pantalla */}
                  {audit.findings.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: C.ok, fontSize: 14 }}>
                      ✓ No se identificaron hallazgos. La pista cumple todos los parámetros evaluados.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {audit.findings.map((f, i) => {
                        const isNC   = f.severity === "NC";
                        const fColor = isNC ? C.danger : C.warn;
                        const fBg    = isNC ? C.dangerDim : C.warnDim;
                        return (
                          <div key={i} style={{ border: `1px solid ${fColor}33`, borderRadius: 8, overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, background: fBg, padding: "8px 12px" }}>
                              <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 900, color: fColor, minWidth: 60 }}>{f.id}</span>
                              <span style={{ flex: 1, fontSize: 13, color: C.white, fontWeight: 700 }}>{f.param}</span>
                              <span style={{ fontSize: 10, color: fColor, background: fColor + "22", padding: "1px 7px", borderRadius: 4, fontWeight: 700 }}>{f.ref}</span>
                              <span style={{ fontSize: 10, color: fColor, fontWeight: 800, letterSpacing: "0.08em" }}>{f.severity}</span>
                            </div>
                            <div style={{ padding: "10px 12px", background: C.surf2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                              <div>
                                <div style={{ fontSize: 10, color: C.text, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Valor encontrado</div>
                                <div style={{ fontSize: 12, fontFamily: C.mono, color: fColor, fontWeight: 700 }}>{f.found}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, color: C.text, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Requisito normativo</div>
                                <div style={{ fontSize: 12, fontFamily: C.mono, color: C.textMid }}>{f.required}</div>
                              </div>
                              <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
                                <div style={{ fontSize: 10, color: C.text, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Descripción</div>
                                <div style={{ fontSize: 12, color: C.textBright, lineHeight: 1.5 }}>{f.description}</div>
                              </div>
                              <div style={{ gridColumn: "1 / -1" }}>
                                <div style={{ fontSize: 10, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Recomendación</div>
                                <div style={{ fontSize: 12, color: C.textBright, lineHeight: 1.5 }}>{f.recommendation}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Resumen ejecutivo en pantalla */}
                  <div style={{ marginTop: 16, padding: "12px 14px", background: statusCfg.bg, borderRadius: 8, borderLeft: `3px solid ${statusCfg.color}` }}>
                    <div style={{ fontSize: 11, color: statusCfg.color, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Resumen ejecutivo</div>
                    <div style={{ fontSize: 13, color: C.textBright, lineHeight: 1.6 }}>
                      {audit.status === "conforme" && `La pista ${d.runway || ""} del ${d.airport || "aeropuerto"} cumple todos los parámetros físicos evaluados conforme al ARC ${results.arcNum}${results.arcLetter} y las categorías de operación declaradas.`}
                      {audit.status === "conforme-obs" && `La pista ${d.runway || ""} no presenta no conformidades, pero se identificaron ${audit.obs.length} observación${audit.obs.length > 1 ? "es" : ""} por datos no declarados. Se recomienda completar la información para una evaluación integral.`}
                      {audit.status === "no-conforme" && `La pista ${d.runway || ""} presenta ${audit.ncs.length} no conformidad${audit.ncs.length > 1 ? "es" : ""} respecto al ARC ${results.arcNum}${results.arcLetter} y las categorías de operación declaradas. Se requieren intervenciones correctivas antes de modificar o mantener la designación actual.`}
                    </div>
                    <div style={{ fontSize: 11, color: C.text, marginTop: 8 }}>
                      Referencia: OACI Anexo 14, Vol. I, 9ª edición (julio 2022). Análisis preliminar — no sustituye evaluación técnica certificada.
                    </div>
                  </div>


                  {/* Boton imprimir */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14, gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: C.text }}>Abre el archivo descargado en el browser y usa Ctrl+P para PDF</span>
                    <button
                      onClick={handlePrint}
                      style={{ background: C.surf3, border: "1px solid " + C.borderBright, borderRadius: 6, padding: "8px 20px", color: C.textBright, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      Descargar informe HTML
                    </button>
                  </div>


                </Card>
              );
            })()}
          </div>
        )}
        </>
        )}

        {tab === "obstaculos" && (
          <ObstaculosTab
            og={og} updO={updO} d={d} results={results}
            obsResult={obsResult} handleCheckObstacle={handleCheckObstacle}
          />
        )}
      </div>
    </div>
  );
}
