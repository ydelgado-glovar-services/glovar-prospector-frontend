# Guía de Uso — Glovar Prospector

> **Cómo leer esta guía:** Cada sección cubre un campo del formulario. En el lado derecho siempre verás un ejemplo malo ❌ y uno bueno ✅. Cópialo, adáptalo y lanza tu prospección.

---

## Campos Obligatorios

### 🏢 Mi Empresa
Nombre de tu empresa tal como aparece en tu propuesta comercial.
> ✅ `Elite Logistica y Rendimiento SAS`

---

### 🎯 Sector Objetivo *(máx. 3 términos)*
El sector de las empresas que quieres contactar. Sé específico — entre más preciso, mejor la búsqueda.

| ❌ Evita | ✅ Usa |
|---|---|
| `Salud` | `Pharma, Medical Devices, CROs` |
| `Tecnología` | `Fintech, SaaS B2B, Ciberseguridad` |
| `Manufactura` | `Manufactura de precisión, Autopartes, Aeroespacial` |

---

### 🌍 País Objetivo
País donde operan las empresas que buscas. En inglés da mejores resultados de búsqueda.
> ✅ `Estados Unidos` · `Colombia` · `México` · `Brasil`

---

### 👥 Tamaño de Empresa
Selecciona el rango de empleados que corresponde a tu cliente ideal.

| Rango | Cuándo usarlo |
|---|---|
| 11-50 | Startups / empresas nacientes |
| **51-200** | **Empresas en crecimiento** ← punto dulce para la mayoría |
| **201-500** | **Medianas consolidadas** ← mayor presupuesto |
| 501-1000 | Grandes corporaciones |
| 1000+ | Multinacionales |

---

### 👤 Cargo del Tomador de Decisión *(máx. 3 cargos)*
Los títulos de las personas que deciden comprar lo que ofreces. Separa por comas.

**Regla clave:** Pon el área + el nivel. No solo el nivel.

| ❌ Evita | ✅ Usa |
|---|---|
| `Gerente, Director` | `VP Supply Chain LATAM, Director Logística Internacional` |
| `Compras` | `Director de Compras, Head of Procurement, VP Sourcing` |
| `IT` | `CISO, VP of Technology, Director de Infraestructura` |

> 💡 Mezcla inglés y español. LinkedIn tiene perfiles en ambos idiomas.

---

## Posicionamiento Estratégico

### 😣 Dolor del Cliente
El problema que tu cliente sufre si NO te contrata. Sé directo — consecuencias reales.

| ❌ Evita | ✅ Usa |
|---|---|
| `Tienen mala logística` | `Healthcare companies entering Colombia without a specialized local logistics partner risk cold chain failures, regulatory non-compliance (INVIMA), and delayed clinical trial operations.` |
| `No tienen buen servicio` | `Mid-market importers face customs delays of 10+ days, overpayment of tariffs (15-20%), and audit penalties by DIAN due to incorrect classification.` |

> 💡 Nombra reguladores reales: INVIMA, FDA, DIAN, SFC, ANVISA. La IA los usa como anclas de credibilidad en el mensaje final.

---

### 💎 Propuesta de Valor
Tu solución. Incluye números, años de experiencia, certificaciones. Sin números no convence.

| ❌ Evita | ✅ Usa |
|---|---|
| `Somos los mejores en logística` | `Único operador 3PL en Colombia 100% exclusivo del sector salud. 19 años de experiencia, certificaciones INVIMA (BPM/cadena de frío), entregas en <24 horas.` |

---

## Opciones Avanzadas

### ⚡ Triggers de Compra *(máx. 150 caracteres)*
Los eventos o momentos que hacen que una empresa *necesite* lo que ofreces **ahora**.
El sistema busca activamente noticias de 2026 donde aparezca la empresa + estos eventos.

**¿Qué poner aquí?**

| Tipo de señal | Ejemplo |
|---|---|
| Expansión geográfica | `Expansion a Colombia, apertura de oficinas LATAM` |
| Ensayos clínicos | `inicio de ensayo clinico Fase II/III en LATAM` |
| Rondas de inversión | `ronda de inversion, financiamiento Serie B` |
| Licitaciones / RFPs | `supplier RFP, licitacion proveedor logistico, vendor selection` |
| Alianzas / M&A | `adquisicion, joint venture, alianza estrategica` |
| Presencia en medios | `expansion Colombia, nueva sede, contrato gobierno` |

> 💡 **Para licitaciones:** si tu cliente busca empresas publicando RFPs de proveedores, escribe `supplier RFP, vendor selection, licitacion proveedor`. El sistema buscará esto en Google y Tavily automáticamente.

---

### 🔑 Keywords de Industria
Términos técnicos que describen los desafíos de tu sector. **Escríbelos en inglés** — hay 10x más contenido técnico en inglés que en español.

| Sector | Ejemplos de Keywords |
|---|---|
| Logística pharma | `cold chain excursion, INVIMA compliance, clinical trial logistics Colombia` |
| Ciberseguridad | `data breach, ISO 27001 audit, cloud security compliance` |
| Importaciones | `customs delay DIAN, tariff classification error, import penalty Colombia` |
| Dispositivos médicos | `FDA 510k clearance, medical device import Colombia, INVIMA registro sanitario` |

> 💡 **Para monitorear medios sectoriales específicos** (ej. Nota Económica, FiercePharma, BioPharmaDive): agrega el nombre del medio como keyword — `notaeconomica.com.co`, `fiercepharma`. El sistema los incorporará en su búsqueda de contexto.

---

### 🏆 Casos de Éxito / Diferenciadores *(opcional)*
Lo que te hace único frente a la competencia. Datos concretos, no frases de marketing.

> ✅ `Cobertura nacional de muestras biológicas y vacunas. Software propio de trazabilidad a medida. Único 3PL exclusivo salud en Colombia.`

---

### 🚫 Empresas a Excluir *(opcional)*
Nombres de empresas que NO quieres prospectar, separados por comas.
> ✅ `Tu propia empresa, competidor conocido, cliente actual`

---

### 📊 Parámetros de Volumen

| Parámetro | Qué controla | Recomendación |
|---|---|---|
| **Max Empresas** | Cuántas empresas busca el sistema | 8-12 para balance velocidad/calidad |
| **Max Leads por empresa** | Cuántos contactos por empresa | 3-5 |
| **Max Resultados** | Resultados de búsqueda iniciales | 8 para runs estándar |

> ⚠️ A mayor volumen = mayor tiempo de ejecución. Un run de 10 empresas tarda ~6-8 minutos.

---

## Plantillas Listas para Copiar

### 🧪 Plantilla: Logística Pharma / Ensayos Clínicos
```
Sector: Pharma, Medical Devices, CROs
País: Estados Unidos
Tamaño: 201-500 empleados
Cargos: VP Supply Chain LATAM, Director Logística Internacional, Clinical Operations Director
Dolor: Healthcare companies entering Colombia without a specialized local logistics partner risk cold chain failures, regulatory non-compliance (INVIMA), and delayed clinical trial operations.
Propuesta: Único operador 3PL en Colombia 100% exclusivo del sector salud. 19 años de experiencia, certificaciones INVIMA (BPM/cadena de frío), entregas en <24 horas.
Triggers: Expansion a Colombia, inicio de ensayo clinico Fase II/III en LATAM, supplier RFP, vendor selection
Keywords: cold chain excursion, INVIMA compliance, clinical trial logistics Colombia
```

### 🔒 Plantilla: Software de Ciberseguridad B2B
```
Sector: Fintech, Banca Digital, SaaS Enterprise
País: Colombia
Tamaño: 51-200 empleados
Cargos: CISO, VP of Technology, Director de Infraestructura, Security Architect
Dolor: Mid-market financial institutions expanding digital operations face severe data breach risks, compliance penalties (SFC/ISO 27001), and high latency in incident response.
Propuesta: Plataforma de ciberseguridad con detección de intrusos en tiempo real. Mitigación en <15 segundos, cumplimiento ISO 27001 automatizado, soporte SOC 24/7 LATAM.
Triggers: migracion a la nube, expansion digital, auditoria de seguridad, alianza tecnologica
Keywords: data breach vulnerabilities, cloud security compliance, ISO 27001 audit finance
```

### 📦 Plantilla: Consultoría Aduanera / Importaciones
```
Sector: Manufactura, Importadores, Comercio Exterior
País: Colombia
Tamaño: 51-500 empleados
Cargos: Director Financiero, VP CFO, Gerente de Aduanas, Tax Manager, Director de Compras
Dolor: Foreign companies importing to Colombia face customs delays, tariff overpayments due to incorrect classification, and DIAN audit penalties.
Propuesta: Firma boutique con ex-auditores DIAN. Reducción promedio 14% en aranceles, despacho garantizado <48 horas, 0% siniestros de glosas en 12 años.
Triggers: importacion de maquinaria, nuevas regulaciones arancelarias, apertura de planta, joint venture
Keywords: customs clearance DIAN, import tariff Colombia, tax audit penalty
```

---

## Checklist Rápido Antes de Ejecutar

- [ ] ¿Los cargos incluyen área + nivel? (`VP Supply Chain`, no solo `VP`)
- [ ] ¿El dolor menciona consecuencias reales y/o nombres de reguladores?
- [ ] ¿La propuesta de valor tiene al menos 1 número o credencial concreta?
- [ ] ¿Los triggers describen eventos que *ya están pasando* en el mercado en 2026?
- [ ] ¿Las keywords están en inglés?
- [ ] ¿El volumen de empresas está entre 8-12 para no exceder el tiempo de espera?
