// config.js — todo lo que se edita seguido vive aquí (número, textos, CTA).
// No requiere tocar app.js ni scoring.js para cambiar copy o el número de WhatsApp.

const CONFIG = {
  // Número de WhatsApp que recibe el diagnóstico. Formato internacional SIN "+" ni espacios.
  // Ejemplo RD: "18091234567" (1 + código de área + número).
  WHATSAPP_NUMBER: "19142901691",

  BRAND_NAME: "VisaCheck RD",

  INTRO: {
    eyebrow: "Evaluación de perfil B1/B2",
    headline: "¿Qué tan preparado está tu perfil para la visa americana?",
    stat: "El 43% de los dominicanos que solicitan visa son rechazados. La mayoría por errores evitables.",
    sub: "Vamos a ver qué tan preparado está tu perfil — 12 preguntas rápidas sobre tus vínculos económicos, laborales, familiares y tu historial migratorio.",
    ctaStart: "Evaluar mi perfil gratis — 3 minutos",
    disclaimer: "Esta evaluación es orientativa y educativa. No constituye asesoría legal ni migratoria, y no predice ni garantiza la decisión consular.",
  },

  NAME_CAPTURE: {
    headline: "¿Cómo te llamas?",
    sub: "Para personalizar tu evaluación. Es opcional.",
    placeholder: "Tu nombre",
    ctaContinue: "Continuar",
    ctaSkip: "Saltar este paso",
  },

  RESULT: {
    probabilityLabel: "Probabilidad estimada de aprobación",
    probabilityNote: "Estimación basada en los factores de tu perfil — no es una predicción oficial ni garantiza la decisión consular.",
    pillarTierNote: {
      fuerte: "Uno de tus puntos más fuertes.",
      medio: "Vas bien, pero hay espacio para reforzarlo.",
      riesgo: "Área que conviene trabajar antes de aplicar.",
    },
    bandLabels: {
      fuerte: "Perfil fuerte",
      medio: "Perfil medio",
      riesgo: "Perfil en riesgo",
    },
    bandTaglines: {
      fuerte: "Tu perfil muestra vínculos sólidos con RD. Buena base para tu entrevista.",
      medio: "Tienes vínculos, pero hay espacio para reforzar tu caso antes de aplicar.",
      riesgo: "Detectamos varios puntos débiles que conviene trabajar antes de aplicar.",
    },
    riskCountLabel: (n) =>
      n === 0
        ? "No detectamos factores de riesgo evidentes en tu perfil."
        : `Detectamos ${n} factor${n === 1 ? "" : "es"} que podría${n === 1 ? "" : "n"} afectar tu entrevista.`,
    ctaWhatsapp: "Recibir mi evaluación completa por WhatsApp",
    ctaShare: "Compartir este test",
    shareText: "Hice el test de VisaCheck RD para evaluar mi perfil de visa americana. Pruébalo:",
    whatsappIntro: (name, caseNumber) =>
      `Hola, soy ${name || "un usuario"} y acabo de hacer el test de ${CONFIG.BRAND_NAME}.\n\nCaso #${caseNumber}\n\nEste es mi resultado:`,
  },

  FOOTER_DISCLAIMER:
    "Esta evaluación es orientativa y educativa. No constituye asesoría legal ni migratoria, y no predice ni garantiza la decisión consular.",
};
