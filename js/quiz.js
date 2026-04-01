// =================== DOM ELEMENTS ===================

const quizIntro = document.getElementById("quizIntro");
const quizContainer = document.getElementById("quizContainer");
const resultScreen = document.getElementById("resultScreen");

const introTitle = document.getElementById("introTitle");
const introMeta = document.getElementById("introMeta");
const startQuizBtn = document.getElementById("startQuizBtn");
const resumeQuizBtn = document.getElementById("resumeQuizBtn");

const questionText = document.getElementById("questionText");
const answersDiv = document.getElementById("answers");
const nextBtn = document.getElementById("nextBtn");

const resultTitle = document.getElementById("resultTitle");
const resultScore = document.getElementById("resultScore");
const resultMeta = document.getElementById("resultMeta");
const resultMessage = document.getElementById("resultMessage");
const backHomeBtn = document.getElementById("backHomeBtn");

// =================== STATE ===================

let currentQuestionIndex = 0;
let score = 0;

const difficulty = localStorage.getItem("difficulty");
const quizId = localStorage.getItem("quizId");
const quizType = localStorage.getItem("quizType");
const selectedCategory = localStorage.getItem("category");

const MAX_QUESTIONS = 10;

// =================== RESUME STATE ===================

let savedState = null;

try {
  savedState = JSON.parse(localStorage.getItem("activeQuizState"));
} catch (e) {
  localStorage.removeItem("activeQuizState");
  savedState = null;
}

// =================== SAFETY ===================

if (!difficulty || !window.quizzes) {
  window.location.href = "index.html";
  throw new Error("Missing state");
}

// =================== HELPERS ===================

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function getResultMessage(p) {
  if (p === 100) return "Perfect score! 🏆";
  if (p >= 80) return "Great job! 🔥";
  if (p >= 60) return "Solid performance 💪";
  if (p >= 40) return "Not bad, keep practicing 👍";
  return "Tough one — try again! 🧠";
}

function getRecentQuestions() {
  return JSON.parse(localStorage.getItem("recentRandomQuestions")) || [];
}

function saveRecentQuestions(ids) {
  const recent = getRecentQuestions();
  const updated = [...new Set([...recent, ...ids])].slice(-50);
  localStorage.setItem("recentRandomQuestions", JSON.stringify(updated));
}

function saveQuizState() {
  const state = {
    quizId,
    quizType,
    category: selectedCategory,
    difficulty,
    currentQuestionIndex,
    score
  };

  // 🔒 Lock random question order
  if (quizType === "random") {
    state.questions = questions;
  }

  localStorage.setItem("activeQuizState", JSON.stringify(state));
}

// =================== QUIZ SELECTION ===================

let selectedQuiz = null;

// 1️⃣ Specific quiz
if (quizId) {
  selectedQuiz = window.quizzes.find(q => q.id === quizId);
}

// 2️⃣ Category / Random
if (!selectedQuiz) {
  let availableQuizzes = window.quizzes.filter(
    q => q.difficulty === difficulty
  );

  if (quizType === "category" && selectedCategory) {
    availableQuizzes = availableQuizzes.filter(
      q => q.category === selectedCategory
    );
  }

  // 🎲 RANDOM QUIZ
  if (quizType === "random") {
    const recentIds = getRecentQuestions();
    let pool = [];

    availableQuizzes.forEach(q => {
      q.questions.forEach((question, index) => {
        pool.push({
          ...question,
          _qid: `${q.id}-${index}`,
          _category: q.category
        });
      });
    });

    pool = pool.filter(q => !recentIds.includes(q._qid));

    const byCategory = {};
    pool.forEach(q => {
      if (!byCategory[q._category]) byCategory[q._category] = [];
      byCategory[q._category].push(q);
    });

    let mixed = [];
    let round = 0;

    while (mixed.length < MAX_QUESTIONS && round < 10) {
      Object.values(byCategory).forEach(arr => {
        if (arr.length && mixed.length < MAX_QUESTIONS) {
          mixed.push(arr.pop());
        }
      });
      round++;
    }

    if (mixed.length < MAX_QUESTIONS) {
      const remaining = pool.filter(q => !mixed.includes(q));
      shuffle(remaining);
      mixed.push(...remaining.slice(0, MAX_QUESTIONS - mixed.length));
    }

    shuffle(mixed);

    selectedQuiz = {
      title: `Random Mix – ${difficulty.toUpperCase()}`,
      category: "Mixed",
      difficulty,
      questions: mixed
    };
  } else {
    selectedQuiz = availableQuizzes[0];
  }
}

if (
  !selectedQuiz ||
  !selectedQuiz.questions ||
  selectedQuiz.questions.length === 0
) {
  window.location.href = "index.html";
}

const questions =
  quizType === "random"
    ? selectedQuiz.questions
    : selectedQuiz.questions.slice(0, MAX_QUESTIONS);

// =================== RESTORE RANDOM QUESTIONS ===================

if (
  quizType === "random" &&
  savedState &&
  savedState.questions &&
  Array.isArray(savedState.questions)
) {
  questions.length = 0;
  questions.push(...savedState.questions);
}

// =================== INTRO ===================

introTitle.textContent = selectedQuiz.title;
document.title = selectedQuiz.title + " | NFL Trivia";
introMeta.textContent =
  `Category: ${selectedQuiz.category} • Difficulty: ${difficulty} • Questions: ${questions.length}`;

quizIntro.classList.remove("hidden");
quizContainer.classList.add("hidden");
resultScreen.classList.add("hidden");

// =================== RESUME CHECK ===================

const canResume =
  savedState &&
  savedState.quizType === quizType &&
  savedState.difficulty === difficulty &&
  savedState.quizId === quizId &&
  savedState.currentQuestionIndex < questions.length;
  
if (canResume) {
  resumeQuizBtn.classList.remove("hidden");
}

// =================== QUIZ ===================

function loadQuestion() {
  nextBtn.classList.add("hidden");
  answersDiv.innerHTML = "";

  const q = questions[currentQuestionIndex];

  questionText.textContent =
    `(${currentQuestionIndex + 1}/${questions.length}) ${q.question}`;

  // ✅ CHANGE BUTTON TEXT BASED ON LAST QUESTION
  if (currentQuestionIndex === questions.length - 1) {
    nextBtn.textContent = "Show Results";
  } else {
    nextBtn.textContent = "Next Question";
  }

  let answerObjects = q.answers.map((text, index) => ({
    text,
    index // ORIGINAL index
  }));

  // 🎲 Shuffle answers ONLY for random quiz
  if (selectedQuiz.title.startsWith("Random")) {
    shuffle(answerObjects);
  }

  answerObjects.forEach(obj => {
    const btn = document.createElement("button");
    btn.textContent = obj.text;
    btn.className = "category-btn";

    // 🔐 store original index
    btn.dataset.answerIndex = obj.index;

    btn.onclick = () => checkAnswer(obj.index);
    answersDiv.appendChild(btn);
  });
}

function checkAnswer(selectedIndex) {
  const buttons = document.querySelectorAll("#answers button");
  const correct = questions[currentQuestionIndex].correct;

  buttons.forEach(btn => {
    const btnIndex = Number(btn.dataset.answerIndex);
    btn.classList.add("disabled");

    if (btnIndex === correct) {
      btn.classList.add("correct");
    }

    if (btnIndex === selectedIndex && btnIndex !== correct) {
      btn.classList.add("wrong");
    }
  });

  if (selectedIndex === correct) score++;
  nextBtn.classList.remove("hidden");

saveQuizState();
nextBtn.classList.remove("hidden");
}

//Quiz result page get's loaded
function saveProgress() {
  const progress =
    JSON.parse(localStorage.getItem("completedQuizzes")) || {};

  if (selectedQuiz.id) {
    const existing = progress[selectedQuiz.id];

    const newPercent = score / questions.length;
    const oldPercent = existing
      ? existing.score / existing.total
      : 0;

    // ✅ Only save if better score OR first attempt
    if (!existing || newPercent > oldPercent) {
      progress[selectedQuiz.id] = {
        score,
        total: questions.length,
        completedAt: new Date().toISOString().split("T")[0]
      };
    }

    localStorage.setItem("completedQuizzes", JSON.stringify(progress));
  }

  // =================== TRACK ALL ATTEMPTS (FIXED) ===================

  const attempts =
    JSON.parse(localStorage.getItem("quizAttempts")) || {
      count: 0,
      totalPercentSum: 0
    };

  const percent = Math.round((score / questions.length) * 100);

  attempts.count += 1;
  attempts.totalPercentSum += percent;

  localStorage.setItem("quizAttempts", JSON.stringify(attempts));

  // =================== RANDOM QUIZ STATS ===================

  if (selectedQuiz.title.startsWith("Random")) {

    saveRecentQuestions(
      questions.filter(q => q._qid).map(q => q._qid)
    );

    const randomStats =
      JSON.parse(localStorage.getItem("randomQuizStats")) || {
        count: 0,
        totalPercentSum: 0
      };

    randomStats.count += 1;
    randomStats.totalPercentSum += percent;

    localStorage.setItem(
      "randomQuizStats",
      JSON.stringify(randomStats)
    );
  }
}

// =================== EVENTS ===================

startQuizBtn.onclick = () => {
  currentQuestionIndex = 0;
  score = 0;

  // ✅ SAVE STATE IMMEDIATELY
  saveQuizState();

  quizIntro.classList.add("hidden");
  quizContainer.classList.remove("hidden");
  resultScreen.classList.add("hidden");

  loadQuestion();
};

nextBtn.onclick = () => {
  currentQuestionIndex++;

  if (currentQuestionIndex < questions.length) {
    saveQuizState();
    loadQuestion();
  } else {
    saveProgress();

    const percent = Math.round((score / questions.length) * 100);

    quizContainer.classList.add("hidden");
    resultScreen.classList.remove("hidden");

    resultTitle.textContent = selectedQuiz.title;
    resultScore.textContent =
      `Score: ${score} / ${questions.length} (${percent}%)`;
    resultMeta.textContent =
      `Category: ${selectedQuiz.category} • Difficulty: ${difficulty}`;
    resultMessage.textContent = getResultMessage(percent);

    localStorage.removeItem("activeQuizState");
  }
};

backHomeBtn.onclick = () => {
  localStorage.removeItem("quizId");

  const category = localStorage.getItem("category");

  if (category) {
    window.location.href = "quiz-list.html";
  } else {
    window.location.href = "index.html";
  }
};

resumeQuizBtn.onclick = () => {
  currentQuestionIndex = savedState.currentQuestionIndex;
  score = savedState.score;

  quizIntro.classList.add("hidden");
  quizContainer.classList.remove("hidden");
  resultScreen.classList.add("hidden");

  loadQuestion();
};
