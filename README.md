# 🏥 Informática Médica (IFMER 2026-II) - Sistema Quarto

Este repositorio contiene la plataforma completa de gestión académica para la asignatura **Informática Médica (IFMER 2026-II)** de la **Universidad del Rosario**, estructurada con [Quarto](https://quarto.org/).

---

## 🚀 Características del Sistema

- **🏠 Guía de Asignatura (Home):** Incluye toda la información oficial extraída de `IFMER_2026.docx` (Perfil docente, RAEs, metodología de Clase Invertida, rúbricas de evaluación, reglas de clase y bibliografía).
- **📚 Estructura Corte a Corte (1, 2 y 3):** Organizada en 15 semanas con guías teóricas, talleres prácticos de laboratorio y evaluaciones.
- **💻 Presentaciones Interactivas (RevealJS):** Diapositivas modernas en HTML nativo de Quarto para cada clase con capacidad de proyección y exportación.
- **📄 Exportación a PDF por Sección:** Formato PDF disponible en cada página y clase del sitio web.

---

## 🛠️ Comandos de Uso

### 1. Previsualizar el sitio web en tiempo real (Modo Desarrollo)
```bash
quarto preview
```
Esto abrirá un servidor local en el navegador con recarga automática (*live reload*) ante cualquier cambio.

---

### 2. Compilar el sitio web completo (`_site/`)
```bash
quarto render
```

---

### 3. Generar la versión PDF de cualquier página o clase
```bash
quarto render index.qmd --to pdf
quarto render corte1/clase01/index.qmd --to pdf
```

---

### 4. Exportar diapositivas RevealJS a PDF
Para exportar las presentaciones a PDF mediante Chrome Headless:
```bash
quarto render corte1/clase01/slides.qmd --to pdf
```
O previsualizarlas en el navegador y añadir `?print-pdf` al final de la URL para imprimir a PDF desde Chrome.

---

## 📂 Estructura de Directorios

```
IFMER 2026-II/
├── _quarto.yml               # Configuración global del sitio y salidas
├── styles.css                # Estilos personalizados institucionales (URosario)
├── index.qmd                 # Guía docente / Home del curso
├── IFMER_2026.docx           # Documento original de la guía
├── corte1/                   # Corte 1: Fundamentos y Sistemas de Información (Semanas 1-6)
│   ├── index.qmd             # Resumen Corte 1
│   ├── clase01/              # Clase 01: Fundamentos & DIKW (index.qmd, slides.qmd)
│   ├── clase02/              # Clase 02: HCE / EHR (index.qmd, slides.qmd)
│   ├── clase03/              # Clase 03: HIS, LIS & Procesos (index.qmd, slides.qmd)
│   ├── clase04/              # Clase 04: RIS/PACS & DICOM (index.qmd, slides.qmd)
│   ├── clase05/              # Clase 05: Integración (index.qmd, slides.qmd)
│   └── clase06/              # Clase 06: Parcial Corte 1 (index.qmd)
├── corte2/                   # Corte 2: Interoperabilidad y Salud Conectada (Semanas 7-11)
│   ├── index.qmd             # Resumen Corte 2
│   ├── clase07/              # Clase 07: HL7 v2/v3, CIE-10, SNOMED (index.qmd, slides.qmd)
│   ├── clase08/              # Clase 08: HL7 FHIR & APIs (index.qmd, slides.qmd)
│   ├── clase09/              # Clase 09: Telemedicina & PWA (index.qmd, slides.qmd)
│   ├── clase10/              # Clase 10: Receso Académico (index.qmd)
│   └── clase11/              # Clase 11: Parcial Corte 2 (index.qmd)
└── corte3/                   # Corte 3: Datos, Inteligencia Artificial y Ética (Semanas 12-15)
    ├── index.qmd             # Resumen Corte 3
    ├── clase12/              # Clase 12: IoMT & Wearables (index.qmd, slides.qmd)
    ├── clase13/              # Clase 13: Big Data, ML & TinyML (index.qmd, slides.qmd)
    ├── clase14/              # Clase 14: Ética & Ciberseguridad (index.qmd, slides.qmd)
    └── clase15/              # Clase 15: Proyecto Final Integrador (index.qmd)
```
