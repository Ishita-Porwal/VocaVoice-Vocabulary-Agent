const words = [
  {
    word: "Meticulous",
    pronunciation: "/mə-TIK-yuh-lus/",
    meaning: "Very careful and precise about details.",
    example: "She is meticulous when checking her project before submission."
  },
  {
    word: "Resilient",
    pronunciation: "/ri-ZIL-yuhnt/",
    meaning: "Able to recover quickly from difficulty.",
    example: "She stayed resilient after facing several challenges."
  },
  {
    word: "Innovative",
    pronunciation: "/IN-uh-vay-tiv/",
    meaning: "Introducing new ideas or methods.",
    example: "The team created an innovative solution to the problem."
  },
  {
    word: "Empathy",
    pronunciation: "/EM-puh-thee/",
    meaning: "The ability to understand another person's feelings.",
    example: "Good leaders show empathy toward their team."
  },
  {
    word: "Concise",
    pronunciation: "/kun-SICE/",
    meaning: "Giving information clearly in few words.",
    example: "Her concise explanation made the topic easy to understand."
  },
  {
    word: "Adaptable",
    pronunciation: "/uh-DAP-tuh-bul/",
    meaning: "Able to adjust to new conditions.",
    example: "An adaptable employee can learn new tools quickly."
  }
];

let index = 0;
let score = 0;
let learned = 0;
let streak = 0;

let recognition = null;
let isListening = false;
let isEvaluating = false;

const wordEl = document.getElementById("word");
const pronunciationEl = document.getElementById("pronunciation");
const meaningEl = document.getElementById("meaningText");
const exampleEl = document.getElementById("exampleText");
const coachEl = document.getElementById("coachText");
const statusEl = document.getElementById("status");
const transcriptEl = document.getElementById("transcript");

const feedbackEl = document.getElementById("feedback");
const feedbackTitle = document.getElementById("feedbackTitle");
const feedbackText = document.getElementById("feedbackText");


// ===============================
// LOAD WORD
// ===============================

function loadWord() {
  const item = words[index];

  wordEl.textContent = item.word;
  pronunciationEl.textContent = item.pronunciation;
  meaningEl.textContent = item.meaning;
  exampleEl.textContent = item.example;

  coachEl.innerHTML =
    `Can you use <strong>${item.word}</strong> in your own sentence?`;

  transcriptEl.textContent =
    "Your spoken answer will appear here...";

  feedbackEl.classList.add("hidden");

  statusEl.textContent =
    "Click “Start Speaking” and answer the coach.";

  isEvaluating = false;
}


// ===============================
// TEXT TO SPEECH
// ===============================

function speak(text) {

  if (!("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.lang = "en-US";

  window.speechSynthesis.speak(utterance);
}


// ===============================
// AI EVALUATION
// ===============================

async function evaluateAnswer(text) {

  if (isEvaluating) {
    return;
  }

  isEvaluating = true;

  statusEl.textContent = "🤖 AI is evaluating your answer...";
  feedbackEl.classList.add("hidden");

  const currentWord = words[index];

  try {

    const response = await fetch(
      "http://127.0.0.1:8000/evaluate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          word: currentWord.word,
          meaning: currentWord.meaning,
          user_sentence: text
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    console.log("FastAPI response:", data);

    // ===============================
    // HANDLE BACKEND RESPONSE
    // ===============================

    let aiResult;

    // If backend directly returns:
    // { score, correct, feedback }
    if (typeof data.score !== "undefined") {

      aiResult = data;

    }

    // If backend returns:
    // { result: "{\"score\":10,...}" }
    else if (typeof data.result === "string") {

      try {

        aiResult = JSON.parse(data.result);

      } catch (error) {

        // Sometimes Gemini returns JSON inside markdown
        const cleaned = data.result
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        aiResult = JSON.parse(cleaned);
      }

    }

    else if (
      data.result &&
      typeof data.result === "object"
    ) {

      aiResult = data.result;

    }

    else {

      throw new Error("Invalid response from AI evaluator.");

    }


    // ===============================
    // GET AI VALUES
    // ===============================

    const aiScore = Number(aiResult.score) || 0;

    const correct =
      aiResult.correct === true ||
      aiResult.correct === "true";

    const feedback =
      aiResult.feedback ||
      "Keep practicing!";


    // ===============================
    // UPDATE LEARNED
    // ===============================

    learned++;

    const learnedEl =
      document.getElementById("learned");

    if (learnedEl) {
      learnedEl.textContent = learned;
    }


    // ===============================
    // UPDATE SCORE
    // ===============================

    score += aiScore;

    const scoreEl =
      document.getElementById("score");

    if (scoreEl) {
      scoreEl.textContent = score;
    }


    // ===============================
    // UPDATE STREAK
    // ===============================

    if (correct && aiScore >= 7) {
      streak++;
    } else {
      streak = 0;
    }

    const streakEl =
      document.getElementById("streak");

    if (streakEl) {
      streakEl.textContent = streak;
    }


    // ===============================
    // SHOW FEEDBACK
    // ===============================

    feedbackEl.classList.remove("hidden");

    if (correct && aiScore >= 7) {

      feedbackTitle.textContent =
        `✅ Great usage! ${aiScore}/10`;

    }

    else if (aiScore >= 5) {

      feedbackTitle.textContent =
        `👍 Good attempt! ${aiScore}/10`;

    }

    else {

      feedbackTitle.textContent =
        `💡 Keep practicing! ${aiScore}/10`;

    }

    feedbackText.textContent = feedback;

    statusEl.textContent =
      "✅ AI evaluation complete.";

    speak(feedback);


  } catch (error) {

    console.error("Evaluation error:", error);

    statusEl.textContent =
      "❌ Could not connect to the AI evaluator.";

    feedbackEl.classList.remove("hidden");

    feedbackTitle.textContent =
      "⚠️ Evaluation Error";

    feedbackText.textContent =
      "Please make sure the FastAPI server is running and try again.";

  }

  finally {

    isEvaluating = false;

  }
}


// ===============================
// SPEECH RECOGNITION
// ===============================

function startListening() {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    statusEl.textContent =
      "Speech recognition is not supported. Please use Google Chrome.";

    return;
  }

  if (recognition) {

    try {
      recognition.stop();
    } catch (error) {
      console.log(error);
    }

  }

  recognition = new SpeechRecognition();

  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  isListening = true;
  isEvaluating = false;

  statusEl.textContent =
    "🎙 Listening... Speak your sentence now.";

  transcriptEl.textContent =
    "Listening...";


  recognition.onresult = function(event) {

    let interimTranscript = "";
    let finalTranscript = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {

      const transcript =
        event.results[i][0].transcript;

      if (event.results[i].isFinal) {

        finalTranscript += transcript;

      } else {

        interimTranscript += transcript;

      }

    }

    if (interimTranscript) {

      transcriptEl.textContent =
        interimTranscript;

    }


    if (finalTranscript.trim()) {

      const finalText =
        finalTranscript.trim();

      transcriptEl.textContent =
        finalText;

      statusEl.textContent =
        "Answer received. 🤖 Evaluating...";

      isListening = false;

      try {
        recognition.stop();
      } catch (error) {
        console.log(error);
      }

      evaluateAnswer(finalText);

    }

  };


  recognition.onerror = function(event) {

    console.error(
      "Speech recognition error:",
      event.error
    );

    isListening = false;

    if (event.error === "not-allowed") {

      statusEl.textContent =
        "🎙 Microphone permission denied. Please allow microphone access.";

    }

    else if (event.error === "no-speech") {

      statusEl.textContent =
        "I couldn't hear you. Please try again.";

    }

    else {

      statusEl.textContent =
        "Speech recognition error. Please try again.";

    }

  };


  recognition.onend = function() {

    isListening = false;

    if (
      !isEvaluating &&
      !statusEl.textContent.includes("evaluation")
    ) {

      statusEl.textContent =
        "Click “Start Speaking” to try again.";

    }

  };


  try {

    recognition.start();

  } catch (error) {

    console.error(error);

    statusEl.textContent =
      "Could not start microphone. Please try again.";

  }

}


// ===============================
// START SPEAKING BUTTON
// ===============================

document
  .getElementById("startBtn")
  .addEventListener("click", () => {

    const currentWord = words[index];

    speak(
      `Can you use ${currentWord.word} in your own sentence?`
    );

    setTimeout(() => {
      startListening();
    }, 1200);

  });


// ===============================
// SPEAK WORD BUTTON
// ===============================

document
  .getElementById("speakWord")
  .addEventListener("click", () => {

    const currentWord = words[index];

    speak(
      `${currentWord.word}. ${currentWord.meaning}`
    );

  });


// ===============================
// NEXT WORD BUTTON
// ===============================

document
  .getElementById("nextWord")
  .addEventListener("click", () => {

    if (recognition) {

      try {
        recognition.stop();
      } catch (error) {
        console.log(error);
      }

    }

    index =
      (index + 1) % words.length;

    loadWord();

    const currentWord =
      words[index];

    speak(
      `Today's word is ${currentWord.word}. ${currentWord.meaning}`
    );

  });


// ===============================
// INITIAL LOAD
// ===============================

loadWord();