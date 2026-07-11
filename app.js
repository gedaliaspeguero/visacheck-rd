// app.js — estado, navegación y render. La data vive en config.js / scoring.js.

const state = {
  step: "intro", // intro | question | name | result
  questionIndex: 0,
  answers: {},
  userName: "",
  caseNumber: null,
  flow: [...QUESTIONS], // lista dinámica: preguntas base + follow-ups que se activen
};

let isTransitioning = false;
const GAUGE_RADIUS = 52;

// Número de caso de 6 dígitos, solo para presentación (no hay backend todavía que
// lo busque). Se genera una sola vez por sesión de quiz — ir "atrás" y volver al
// resultado no debe cambiarlo.
function ensureCaseNumber() {
  if (!state.caseNumber) {
    state.caseNumber = String(Math.floor(100000 + Math.random() * 900000));
  }
}

const stage = document.getElementById("screenStage");
const progressHeader = document.getElementById("progressHeader");
const progressFill = document.getElementById("progressFill");
const backBtn = document.getElementById("backBtn");
const footerDisclaimer = document.getElementById("footerDisclaimer");

footerDisclaimer.textContent = CONFIG.FOOTER_DISCLAIMER;

backBtn.addEventListener("click", goBack);

function goBack() {
  if (state.step === "question") {
    if (state.questionIndex === 0) {
      transitionTo(() => { state.step = "intro"; });
    } else {
      transitionTo(() => { state.questionIndex -= 1; });
    }
  } else if (state.step === "name") {
    transitionTo(() => {
      state.step = "question";
      state.questionIndex = state.flow.length - 1;
    });
  }
}

function transitionTo(mutate) {
  if (isTransitioning) return;
  const current = stage.querySelector(".screen");
  if (current) {
    isTransitioning = true;
    current.classList.add("exiting");
    setTimeout(() => {
      mutate();
      render();
      isTransitioning = false;
    }, 150);
  } else {
    mutate();
    render();
  }
}

function render() {
  stage.innerHTML = "";
  updateProgressHeader();

  if (state.step === "intro") stage.appendChild(renderIntro());
  else if (state.step === "question") stage.appendChild(renderQuestion());
  else if (state.step === "name") stage.appendChild(renderNameCapture());
  else if (state.step === "result") stage.appendChild(renderResult());

  window.scrollTo(0, 0);
}

function updateProgressHeader() {
  if (state.step === "question") {
    progressHeader.hidden = false;
    const pct = ((state.questionIndex) / state.flow.length) * 100;
    progressFill.style.width = `${pct}%`;
    backBtn.style.visibility = "visible";
  } else if (state.step === "name") {
    progressHeader.hidden = false;
    progressFill.style.width = "100%";
    backBtn.style.visibility = "visible";
  } else {
    progressHeader.hidden = true;
  }
}

// ---------- Intro ----------
function renderIntro() {
  const el = document.createElement("div");
  el.className = "screen";
  const t = CONFIG.INTRO;
  el.innerHTML = `
    <p class="intro-eyebrow">${t.eyebrow}</p>
    <h1 class="intro-headline">${t.headline}</h1>
    <div class="intro-stat-card">${t.stat}</div>
    <p class="intro-sub">${t.sub}</p>
    <button class="btn-primary" id="startBtn">${t.ctaStart}</button>
  `;
  el.querySelector("#startBtn").addEventListener("click", () => {
    transitionTo(() => {
      state.step = "question";
      state.questionIndex = 0;
      state.flow = [...QUESTIONS];
    });
  });
  return el;
}

// ---------- Question ----------
function renderQuestion() {
  const q = state.flow[state.questionIndex];
  const el = document.createElement("div");
  el.className = "screen";

  const pillarLabel = PILLARS[q.pillar].label;
  const currentAnswer = state.answers[q.id];

  el.innerHTML = `
    <p class="question-pillar">${pillarLabel}</p>
    <h2 class="question-text">${q.text}</h2>
    ${q.type === "multi" ? '<p class="multi-hint">Puedes elegir varias opciones</p>' : ""}
    <div class="options-list" id="optionsList"></div>
    ${q.type === "multi" ? '<button class="btn-primary continue-btn" id="continueBtn">Continuar</button>' : ""}
  `;

  const list = el.querySelector("#optionsList");
  q.options.forEach((opt) => {
    const card = document.createElement("button");
    card.className = "option-card";
    card.type = "button";
    const isSelected =
      q.type === "multi"
        ? Array.isArray(currentAnswer) && currentAnswer.includes(opt.value)
        : currentAnswer === opt.value;
    if (isSelected) card.classList.add("selected");
    card.innerHTML = `<span>${opt.label}</span><span class="option-check">✓</span>`;

    card.addEventListener("click", () => {
      if (q.type === "multi") {
        handleMultiSelect(q, opt, card, list);
      } else {
        state.answers[q.id] = opt.value;
        syncFollowUpsFor(q);
        goToNextQuestion();
      }
    });

    list.appendChild(card);
  });

  if (q.type === "multi") {
    el.querySelector("#continueBtn").addEventListener("click", () => handleMultiContinue(q, list));
  }

  return el;
}

function handleMultiSelect(question, opt, cardEl, listEl) {
  const current = Array.isArray(state.answers[question.id]) ? [...state.answers[question.id]] : [];

  if (opt.exclusive) {
    state.answers[question.id] = current.includes(opt.value) ? [] : [opt.value];
  } else {
    const withoutExclusive = current.filter((v) => {
      const o = question.options.find((o) => o.value === v);
      return !(o && o.exclusive);
    });
    const idx = withoutExclusive.indexOf(opt.value);
    if (idx >= 0) withoutExclusive.splice(idx, 1);
    else withoutExclusive.push(opt.value);
    state.answers[question.id] = withoutExclusive;
  }

  // repinta solo las opciones para reflejar la selección (evita perder scroll)
  const selected = state.answers[question.id];
  Array.from(listEl.children).forEach((child, i) => {
    const isSel = selected.includes(question.options[i].value);
    child.classList.toggle("selected", isSel);
  });
}

function handleMultiContinue(question, listEl) {
  const answer = state.answers[question.id];
  if (!Array.isArray(answer) || answer.length === 0) {
    // exige una selección explícita (incluye "ninguna") antes de avanzar
    listEl.classList.add("shake");
    setTimeout(() => listEl.classList.remove("shake"), 320);
    return;
  }
  syncFollowUpsFor(question);
  goToNextQuestion();
}

// Inserta o quita la pregunta de seguimiento de `question` en state.flow según la
// respuesta actual. Se llama cada vez que se responde esa pregunta (incluso si el
// usuario vuelve atrás y cambia su respuesta), así el flujo siempre queda
// consistente con lo que la persona realmente contestó.
function syncFollowUpsFor(question) {
  const rule = FOLLOW_UPS.find((f) => f.afterQuestionId === question.id);
  if (!rule) return;

  const existingIdx = state.flow.findIndex((q) => q.id === rule.question.id);
  if (existingIdx !== -1) {
    state.flow.splice(existingIdx, 1);
    delete state.answers[rule.question.id];
  }

  const answer = state.answers[question.id];
  const matches = Array.isArray(answer) ? answer.some((v) => rule.trigger(v)) : rule.trigger(answer);
  if (matches) {
    const parentIdx = state.flow.findIndex((q) => q.id === question.id);
    state.flow.splice(parentIdx + 1, 0, rule.question);
  }
}

function goToNextQuestion() {
  transitionTo(() => {
    if (state.questionIndex < state.flow.length - 1) {
      state.questionIndex += 1;
    } else {
      state.step = "name";
    }
  });
}

// ---------- Name capture ----------
function renderNameCapture() {
  const el = document.createElement("div");
  el.className = "screen";
  const t = CONFIG.NAME_CAPTURE;
  el.innerHTML = `
    <h2 class="question-text">${t.headline}</h2>
    <p class="intro-sub" style="margin-bottom:20px;">${t.sub}</p>
    <input type="text" class="name-input" id="nameInput" placeholder="${t.placeholder}" value="${state.userName}" />
    <button class="btn-primary" id="nameContinueBtn">${t.ctaContinue}</button>
    <button class="skip-btn" id="nameSkipBtn">${t.ctaSkip}</button>
  `;

  const input = el.querySelector("#nameInput");
  el.querySelector("#nameContinueBtn").addEventListener("click", () => {
    state.userName = input.value.trim();
    transitionTo(() => { state.step = "result"; ensureCaseNumber(); });
  });
  el.querySelector("#nameSkipBtn").addEventListener("click", () => {
    state.userName = "";
    transitionTo(() => { state.step = "result"; ensureCaseNumber(); });
  });

  return el;
}

// ---------- Result ----------
function renderResult() {
  const result = computeResult(state.answers);
  const el = document.createElement("div");
  el.className = "screen";
  const t = CONFIG.RESULT;

  const pillarRows = Object.keys(PILLARS)
    .map((key) => {
      const pillar = PILLARS[key];
      const score = result.pillarScores[key];
      const max = result.pillarMax[key];
      const pct = Math.round((score / max) * 100);
      const tier = getPillarTier(score, max);
      return `
        <div class="pillar-row">
          <div class="pillar-row-label"><span>${pillar.label}</span><span>${score}/${max}</span></div>
          <div class="pillar-bar-track"><div class="pillar-bar-fill ${tier}" data-pct="${pct}" style="width:0%"></div></div>
          <p class="pillar-tier-note ${tier}">${t.pillarTierNote[tier]}</p>
        </div>
      `;
    })
    .join("");

  const gaugeCircumference = 2 * Math.PI * GAUGE_RADIUS;

  el.innerHTML = `
    <p class="question-pillar">Tu resultado</p>
    <p class="case-number">Caso #${state.caseNumber}</p>
    <div class="gauge-wrap">
      <svg class="gauge-svg" viewBox="0 0 120 120">
        <circle class="gauge-track" cx="60" cy="60" r="${GAUGE_RADIUS}" />
        <circle class="gauge-fill ${result.band}" cx="60" cy="60" r="${GAUGE_RADIUS}"
          data-pct="${result.approvalPercentage}"
          style="stroke-dasharray:${gaugeCircumference};stroke-dashoffset:${gaugeCircumference}" />
      </svg>
      <div class="gauge-center">
        <span class="gauge-pct ${result.band}">${result.approvalPercentage}%</span>
        <span class="gauge-pct-label">${t.probabilityLabel}</span>
      </div>
    </div>
    <p class="gauge-note">${t.probabilityNote}</p>
    <h2 class="result-band ${result.band}">${t.bandLabels[result.band]}</h2>
    <p class="result-tagline">${t.bandTaglines[result.band]}</p>
    <div class="pillars-chart">${pillarRows}</div>
    <div class="risk-card">${t.riskCountLabel(result.flags.length)}</div>
    <div class="result-actions">
      <button class="btn-primary" id="whatsappBtn">${t.ctaWhatsapp}</button>
      <button class="share-btn" id="shareBtn">${t.ctaShare}</button>
    </div>
  `;

  el.querySelector("#whatsappBtn").addEventListener("click", () => openWhatsapp(result));
  el.querySelector("#shareBtn").addEventListener("click", shareTest);

  // arranca en 0% (seteado arriba) y anima hasta el valor real tras el primer paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.querySelectorAll(".pillar-bar-fill").forEach((bar) => {
        bar.style.width = `${bar.dataset.pct}%`;
      });
      const gaugeFill = el.querySelector(".gauge-fill");
      if (gaugeFill) {
        const offset = gaugeCircumference - (gaugeCircumference * gaugeFill.dataset.pct) / 100;
        gaugeFill.style.strokeDashoffset = offset;
      }
    });
  });

  return el;
}

function openWhatsapp(result) {
  const t = CONFIG.RESULT;
  const code = encodeResultForWhatsapp(result);
  const message = `${t.whatsappIntro(state.userName, state.caseNumber)}\n\n${code}`;
  const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

async function shareTest() {
  const t = CONFIG.RESULT;
  const shareData = {
    title: CONFIG.BRAND_NAME,
    text: t.shareText,
    url: window.location.href,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (e) {
      // usuario canceló el share — no hacer nada
    }
  } else {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copiado. ¡Compártelo!");
    } catch (e) {
      alert(window.location.href);
    }
  }
}

render();
