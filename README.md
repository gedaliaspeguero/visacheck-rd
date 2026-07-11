# VisaCheck RD

Quiz de evaluación de perfil para visa americana B1/B2, dirigido a dominicanos.
Fase 1 (validación) de un funnel: quiz gratis → captura de WhatsApp → venta de
reporte personalizado.

Sitio 100% estático: HTML + CSS + JS vanilla. Sin build, sin backend, sin base de datos.

## Archivos

- `index.html` — estructura de la app (un solo shell, las pantallas se pintan por JS)
- `styles.css` — sistema de diseño (dark ink + coral, tipografía editorial)
- `config.js` — **número de WhatsApp y todos los textos editables**
- `scoring.js` — **matriz de puntos, preguntas y lógica de banda/flags**
- `app.js` — máquina de estados, navegación y render

## Cambiar el número de WhatsApp

Abre [`config.js`](config.js) y edita la primera línea del objeto `CONFIG`:

```js
WHATSAPP_NUMBER: "18095551234", // formato internacional, sin "+" ni espacios
```

Usa el formato `[código de país][código de área][número]`. Para RD: `1` + `809/829/849` + el número.
Ejemplo real: si el número es 809-555-1234, el valor sería `"18095551234"`.

Ahora mismo apunta a un número de prueba — **cámbialo antes de compartir el link públicamente**,
o los leads no te van a llegar a ti.

## Ajustar los pesos del scoring

Toda la matriz vive comentada en [`scoring.js`](scoring.js):

- Cada opción de cada pregunta tiene un campo `points`. Súbelo o bájalo para cambiar
  cuánto pesa esa respuesta.
- La pregunta de propiedad (multiselect) tiene `capPoints: 12` — un tope para que no
  se pueda pasar de ese máximo aunque se marquen varias opciones.
- `PILLAR_MAX` define el máximo teórico de cada pilar. Si cambias los puntos de las
  preguntas de un pilar, actualiza también su `PILLAR_MAX` correspondiente (los 4
  deben sumar 100 entre todos).
- `BANDS` define los cortes de banda final: FUERTE (70+), MEDIO (40-69), RIESGO (<40).
  Puedes mover esos números.
- `computeFlags()` define los flags (negación previa, joven+soltero+sin propiedad,
  familia sin estatus, cuenta propia sin documentar, sin vínculo familiar). Estos no
  suman puntos, solo viajan codificados en el mensaje de WhatsApp.

Después de cualquier cambio, recarga la página y prueba distintas combinaciones de
respuestas para confirmar que las bandas se sienten justas (no debería ser fácil caer
en FUERTE o en RIESGO sin razón).

## Agregar preguntas condicionales (follow-ups)

Algunas respuestas pueden abrir una pregunta extra que solo ve esa persona (ej. si
dices que tienes familiar en EEUU, te pregunta cuánto tiempo lleva allá). Esto vive
en `FOLLOW_UPS` dentro de `scoring.js`. Para agregar una nueva, añade un objeto al
array:

```js
{
  afterQuestionId: "q9_familia_eeuu",       // después de qué pregunta se evalúa
  trigger: (value) => value === "si_estatus" || value === "si_sin_estatus",
  question: {
    id: "q9b_tiempo_familia",
    parentId: "q9_familia_eeuu",             // debe repetir afterQuestionId
    pillar: "familiar",
    type: "single",
    text: "¿Cuánto tiempo tiene tu familiar viviendo en EEUU?",
    options: [ /* igual que cualquier pregunta normal */ ],
  },
}
```

`app.js` la inserta/quita automáticamente del flujo según la respuesta — no hace
falta tocar la navegación. Las respuestas de follow-ups no suman puntos por defecto
(para no romper el presupuesto de 100 pts), pero pueden alimentar flags nuevos en
`computeFlags()` — ver el flag `FAM5` como ejemplo de cómo usarlas.

## Deploy a Cloudflare Pages (recomendado, 3 pasos)

Al ser un sitio estático puro, no necesita ningún archivo de configuración.

1. Sube esta carpeta a un repositorio de GitHub (o usa "Direct Upload" en el dashboard
   de Cloudflare si prefieres no usar Git).
2. En [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** →
   **Create** → **Pages** → conecta el repo.
3. Build command: (déjalo vacío). Output directory: `/` (raíz). Deploy.

Cloudflare Pages da ancho de banda ilimitado en el free tier, lo cual conviene si un
video de TikTok/Instagram se vuelve viral y trae un pico grande de tráfico.

### Alternativas: Netlify o Vercel

También funciona sin cambios en Netlify (arrastra la carpeta en app.netlify.com) o
Vercel (`vercel deploy` desde esta carpeta) — ninguno de los dos requiere configuración
adicional para un sitio estático como este.

## Cómo funciona el mensaje de WhatsApp

Al tocar el CTA principal, se abre `wa.me/<numero>` con un mensaje prellenado que
incluye un código compacto, ej:

```
VC:M|E:18|L:12|F:15|H:9|FLAGS:NEG,CPSD
```

- `VC:M` → banda (F=Fuerte, M=Medio, R=Riesgo)
- `E/L/F/H` → puntaje de cada pilar (Económico, Laboral, Familiar, Historial)
- `FLAGS` → códigos cortos de las alertas detectadas (ver `computeFlags()` en scoring.js)

Así, cuando alguien te escribe, ya tienes su diagnóstico completo sin tener que
preguntarle nada — funciona como un mini-CRM mientras validas el producto.

El mensaje también incluye un **número de caso** de 6 dígitos (ej. `Caso #864960`),
generado al azar en el navegador solo para que se vea más "oficial" — hoy no tiene
ningún backend detrás que lo busque, es puramente de presentación.

## Roadmap Fase 2 (todavía no construido)

Idea comentada para cuando el volumen de casos justifique automatizar:

- Un bot de WhatsApp que reciba el número de caso y responda con un menú:
  1. Hablar con un agente migratorio.
  2. Desbloquear el "test premium" (~$20): el usuario mete sus datos reales, el
     bot dice que la respuesta tarda 10-15 min (aunque el análisis con IA tarde
     segundos) y entrega un reporte con el detalle de por qué el cónsul
     aprobaría/negaría, entrenado con casos migratorios reales.
- Esto requiere backend + base de datos (guardar caso → respuestas → pago), algo
  que el sitio estático actual no tiene. Cuando se construya, el número de caso
  de 6 dígitos pasaría a ser la clave real en esa base de datos en vez de un
  número aleatorio sin persistencia.
