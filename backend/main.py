import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai

# ==========================================
# LOAD ENVIRONMENT VARIABLES
# ==========================================

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError(
        "GEMINI_API_KEY is missing from the .env file"
    )


# ==========================================
# GEMINI CLIENT
# ==========================================

client = genai.Client(api_key=api_key)


# ==========================================
# FASTAPI APP
# ==========================================

app = FastAPI(title="VocaVoice API")


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# REQUEST MODEL
# ==========================================

class VocabularyRequest(BaseModel):
    word: str
    meaning: str
    user_sentence: str


# ==========================================
# HOME
# ==========================================

@app.get("/")
def home():
    return {
        "message": "VocaVoice API is running!"
    }


# ==========================================
# EVALUATE VOCABULARY
# ==========================================

@app.post("/evaluate")
def evaluate_vocabulary(request: VocabularyRequest):

    prompt = f"""
You are an English vocabulary learning coach.

Vocabulary word:
{request.word}

Meaning:
{request.meaning}

User's sentence:
{request.user_sentence}

Evaluate whether the user used the vocabulary word correctly.

Return ONLY valid JSON.

Use exactly this format:

{{
    "score": 8,
    "correct": true,
    "feedback": "Good use of the word. Your sentence matches the meaning correctly."
}}

Rules:

1. score must be a number between 0 and 10.
2. correct must be true or false.
3. Check whether the vocabulary word is used with the correct meaning.
4. Check whether the context makes sense.
5. Do not judge grammar too harshly.
6. Keep feedback short and encouraging.
7. Return ONLY JSON.
"""

    try:

        # ==========================================
        # GEMINI REQUEST
        # ==========================================

        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt
        )

        text = response.text.strip()

        print("Gemini raw response:")
        print(text)


        # ==========================================
        # REMOVE MARKDOWN CODE BLOCK IF PRESENT
        # ==========================================

        if text.startswith("```json"):
            text = text.replace("```json", "", 1)

        if text.startswith("```"):
            text = text.replace("```", "", 1)

        if text.endswith("```"):
            text = text[:-3]

        text = text.strip()


        # ==========================================
        # CONVERT GEMINI RESPONSE TO JSON
        # ==========================================

        result = json.loads(text)


        # ==========================================
        # VALIDATE RESULT
        # ==========================================

        score = float(result.get("score", 0))

        correct = result.get("correct", False)

        feedback = result.get(
            "feedback",
            "Keep practicing!"
        )


        # Keep score between 0 and 10
        score = max(0, min(10, score))


        return {
            "score": score,
            "correct": correct,
            "feedback": feedback
        }


    except json.JSONDecodeError as e:

        print("JSON ERROR:", e)

        raise HTTPException(
            status_code=500,
            detail={
                "error": "Gemini returned invalid JSON",
                "raw_response": text if "text" in locals() else ""
            }
        )


    except Exception as e:

        print("GEMINI ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail={
                "error": "Gemini API request failed",
                "message": str(e)
            }
        )