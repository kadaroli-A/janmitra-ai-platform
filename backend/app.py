from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import FileResponse
import boto3
import json
import uuid
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# AWS Clients
# -----------------------------

bedrock = boto3.client(
    service_name="bedrock-runtime",
    region_name="us-east-1"
)

polly = boto3.client(
    service_name="polly",
    region_name="us-east-1"
)

# -----------------------------
# Request Model
# -----------------------------

class InputData(BaseModel):
    question: str

class Query(BaseModel):
    transcript: str
    language: str
    input: InputData


# -----------------------------
# Government Scheme Dataset
# -----------------------------

SCHEMES = {
    "pm kisan": "PM Kisan Samman Nidhi is a government scheme that provides ₹6000 per year to small and marginal farmers in three installments.",
    "pm awas": "Pradhan Mantri Awas Yojana provides affordable housing for urban and rural poor families.",
    "ayushman bharat": "Ayushman Bharat provides health insurance coverage up to ₹5 lakh per family per year.",
    "mudra loan": "Pradhan Mantri Mudra Yojana provides loans to small businesses and entrepreneurs.",
    "startup india": "Startup India supports innovation and startups with funding and tax benefits."
}


# -----------------------------
# Detect Scheme from Question
# -----------------------------

def detect_scheme(question):

    q = question.lower()

    for scheme in SCHEMES:
        if scheme in q:
            return scheme

    return None


# -----------------------------
# Bedrock AI Explanation
# -----------------------------

def ask_bedrock(question, language):

    scheme = detect_scheme(question)

    if scheme:
        scheme_info = SCHEMES[scheme]
    else:
        scheme_info = "Explain Indian government welfare schemes."

    prompt = f"""
<s>[INST]
You are JanMitra AI, an assistant that explains Indian government schemes.

Explain the following scheme in {language} language in a clear and simple way for rural citizens.

Scheme Information:
{scheme_info}

User Question:
{question}

Give a clear explanation.
[/INST]
"""

    body = {
        "prompt": prompt,
        "max_gen_len": 300,
        "temperature": 0.5,
        "top_p": 0.9
    }

    response = bedrock.invoke_model(
        modelId="meta.llama3-8b-instruct-v1:0",
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json"
    )

    response_body = json.loads(response["body"].read())

    return response_body["generation"]


# -----------------------------
# Generate Speech (Polly)
# -----------------------------

def generate_voice(text, language):

    voice_map = {
        "en": "Joanna",
        "hi": "Aditi",
        "ta": "Aditi"
    }

    voice = voice_map.get(language.lower(), "Joanna")

    file_name = f"speech_{uuid.uuid4()}.mp3"

    file_path = os.path.join("audio", file_name)

    response = polly.synthesize_speech(
        Text=text,
        VoiceId=voice,
        OutputFormat="mp3"
    )

    with open(file_path, "wb") as f:
        f.write(response["AudioStream"].read())

    return file_name


# -----------------------------
# AI Endpoint
# -----------------------------

@app.post("/ask-ai")
def ask_ai(data: Query):

    answer = ask_bedrock(data.input.question, data.language)

    audio_file = generate_voice(answer, data.language)

    return {
        "response": answer,
        "audio": audio_file
    }


# -----------------------------
# Serve Audio File
# -----------------------------

@app.get("/audio/{file_name}")
def get_audio(file_name: str):

    file_path = os.path.join("audio", file_name)

    if not os.path.exists(file_path):
        return {"error": "Audio file not found"}

    return FileResponse(
        path=file_path,
        media_type="audio/mpeg",
        filename=file_name
    )





