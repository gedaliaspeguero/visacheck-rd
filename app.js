// app.js — estado, navegación y render. La data vive en config.js / scoring.js.

const state = {
  step: "intro", // intro | question | name | result
  questionIndex: 0,
  answers: {},
  userName: "",
};

let isTransitioning = false;

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
      state.questionIndex = QUESTIONS.length - 1;
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
    const pct = ((state.questionIndex) / QUESTIONS.length) * 100;
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
    });
  });
  return el;
}

// ---------- Question ----------
function renderQuestion() {
  const q = QUESTIONS[state.questionIndex];
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
  goToNextQuestion();
}

function goToNextQuestion() {
  transitionTo(() => {
    if (state.questionIndex < QUESTIONS.length - 1) {
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
    transitionTo(() => { state.step = "result"; });
  });
  el.querySelector("#nameSkipBtn").addEventListener("click", () => {
    state.userName = "";
    transitionTo(() => { state.step = "result"; });
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
      return `
        <div class="pillar-row">
          <div class="pillar-row-label"><span>${pillar.label}</span><span>${score}/${max}</span></div>
          <div class="pillar-bar-track"><div class="pillar-bar-fill" data-pct="${pct}" style="width:0%"></div></div>
        </div>
      `;
    })
    .join("");

  el.innerHTML = `
    <p class="question-pillar">Tu resultado</p>
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
    });
  });

  return el;
}

function openWhatsapp(result) {
  const t = CONFIG.RESULT;
  const code = encodeResultForWhatsapp(result);
  const message = `${t.whatsappIntro(state.userName)}\n\n${code}`;
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
