<img width="1895" height="867" alt="imagen" src="https://github.com/user-attachments/assets/68eb2137-7ff3-4a29-a6e3-d514232523e3" />
# 📚 MatemathUp

MatemathUp es una plataforma educativa impulsada por IA que ayuda a estudiantes de secundaria y primeros años universitarios a practicar matemática mediante ejercicios adaptativos, generación inteligente de actividades y planes de estudio personalizados.

El objetivo del proyecto es ofrecer una experiencia similar a la de un tutor personal, adaptando la dificultad, detectando fortalezas y debilidades, y permitiendo estudiar tanto con contenido del currículo como con material propio.

---

## ✨ Características principales

### 🧠 Práctica Adaptativa

- Generación dinámica de ejercicios mediante IA.
- Ajuste automático de dificultad según desempeño.
- Corrección inteligente de respuestas.
- Pistas y explicaciones paso a paso.
- Validaciones matemáticas para garantizar coherencia.

### 🎯 Tandas IA

- Generación de múltiples actividades por tema.
- Niveles:
  - Básico
  - Intermedio
  - Alto

- Evaluación y retroalimentación automática.

### 📈 Seguimiento de Progreso

- Dominio por tema.
- Historial de ejercicios.
- Métricas de aprendizaje.
- Dashboard de progreso.

### 📝 Workspace Matemático

Panel lateral integrado para:

- Realizar cálculos.
- Tomar notas.
- Utilizar símbolos matemáticos.
- Guardado automático local.

### 📂 Material Propio

Los usuarios pueden subir:

- PDF
- JPG
- PNG
- WEBP

El sistema:

- Extrae texto automáticamente.
- Realiza OCR en imágenes.
- Detecta el tema del contenido.
- Genera ejercicios basados en el material cargado.

### 🤖 Generación desde Material Propio

Permite practicar directamente sobre:

- Guías de estudio.
- Parciales anteriores.
- Apuntes.
- Material personalizado.

Utilizando el contenido extraído como contexto para la IA.

### 🐞 Sistema de Feedback

Los usuarios pueden reportar:

- Errores matemáticos.
- Problemas de evaluación.
- Ejercicios defectuosos.
- Problemas visuales.
- Sugerencias de mejora.

---

## 🏗 Arquitectura

### Frontend

- React
- TypeScript
- Tailwind CSS
- TanStack Router
- TanStack Query

### Backend

- Supabase
- PostgreSQL
- Storage
- Row Level Security (RLS)

### IA

Arquitectura compatible con proveedores OpenAI-compatible:

- OpenAI
- Groq
- OpenRouter

Funcionalidades IA:

- Generación de ejercicios
- Corrección
- Pistas
- Explicaciones
- Generación basada en material propio

### Procesamiento de documentos

- PDF.js
- Tesseract.js

---

## 🔒 Calidad y Validaciones

MatemathUp incorpora múltiples capas de validación para evitar:

- Ejercicios fuera de tema.
- Respuestas incorrectamente evaluadas.
- Explicaciones contradictorias.
- Consignas incompletas.
- Opciones múltiples inválidas.
- Selección de respuestas "más cercanas".
- Mutaciones de la consigna original.
- Narrativas artificiales o inventadas.

---

## 🚀 Instalación

### Clonar repositorio

```bash
git clone https://github.com/TU-USUARIO/matemathup.git
cd matemathup
```

### Instalar dependencias

```bash
npm install
```

### Configurar variables de entorno

Crear archivo `.env` desde `.env.example` y completar:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=

SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=

AI_API_KEY=
AI_BASE_URL=
AI_MODEL=
```

### Ejecutar en desarrollo

```bash
npm run dev
```

### Build de producción

```bash
npm run build
```

---

## 🧪 Testing

Ejecutar pruebas:

```bash
npm test
```

Type checking:

```bash
npm run typecheck
```

Build verification:

```bash
npm run build
```

---

## 🛣 Roadmap

### Próximamente

- Planes de estudio inteligentes.
- Calendario de exámenes.
- Recomendaciones automáticas.
- Freemium y planes premium.
- Importación avanzada de contenido.
- Generación por secciones de material.
- RAG completo con embeddings y búsqueda semántica.
- Integración con calendarios externos.

---

## 🎓 Objetivo

MatemathUp busca transformar la forma en que los estudiantes practican matemática, combinando inteligencia artificial, adaptación personalizada y material propio para crear una experiencia de aprendizaje efectiva y accesible.

---

## 📄 Licencia

Este proyecto se encuentra en desarrollo activo.
