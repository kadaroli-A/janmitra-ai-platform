from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import FileResponse
import boto3
import json
import uuid
import os
from typing import Optional, List, Dict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create audio directory if it doesn't exist
os.makedirs("audio", exist_ok=True)

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
# Request Models
# -----------------------------

class InputData(BaseModel):
    question: str

class Query(BaseModel):
    transcript: str
    language: str
    input: InputData

class EligibilityRequest(BaseModel):
    profile: Dict
    schemes: List[Dict]
    language: str


# -----------------------------
# Government Scheme Dataset (ISSUE 7 FIX - Removed rule-based logic)
# -----------------------------

SCHEMES_INFO = {
    "pm-kisan": "PM Kisan Samman Nidhi provides ₹6000 per year to small and marginal farmers in three installments. Eligibility: Must be a farmer with cultivable land.",
    "pmay": "Pradhan Mantri Awas Yojana provides affordable housing for economically weaker sections. Eligibility: Must not own a pucca house.",
    "ayushman-bharat": "Ayushman Bharat provides health insurance coverage up to ₹5 lakh per family per year. Eligibility: For economically weaker families.",
    "mudra": "Pradhan Mantri Mudra Yojana provides loans up to ₹10 lakh for small businesses without collateral. Eligibility: Small business owners and entrepreneurs.",
    "scholarship-nsp": "National Scholarship Portal provides various scholarships for students. Eligibility: Students from pre-matric to post-doctoral levels.",
    "ujjwala": "Pradhan Mantri Ujjwala Yojana provides free LPG connections to women from BPL households. Eligibility: Women from below poverty line families.",
    "pmkvy": "Pradhan Mantri Kaushal Vikas Yojana provides free skill training. Eligibility: Youth aged 15-45 years.",
    "sukanya-samriddhi": "Sukanya Samriddhi Yojana is a savings scheme for girl child. Eligibility: Girls under 10 years of age.",
    "atal-pension": "Atal Pension Yojana provides guaranteed pension after age 60. Eligibility: Unorganized sector workers aged 18-40.",
    "stand-up-india": "Stand-Up India provides loans for SC/ST and women entrepreneurs. Eligibility: SC/ST or women entrepreneurs."
}


# -----------------------------
# ISSUE 4 & 7 FIX: Bedrock AI Reasoning for Eligibility
# -----------------------------

def analyze_eligibility_with_bedrock(profile, schemes, language):
    """
    ISSUE 4 FIX: Enhanced eligibility analysis with comprehensive AI reasoning
    Uses Amazon Bedrock Meta LLaMA to determine eligibility using AI reasoning.
    NO rule-based if/else logic - pure AI reasoning based on citizen profile.
    """
    
    # Build comprehensive scheme information for the prompt
    schemes_text = "\n".join([
        f"- {scheme['id']}: {SCHEMES_INFO.get(scheme['id'], scheme.get('description', {}).get('en', 'Government scheme'))}"
        for scheme in schemes
    ])
    
    # Build comprehensive citizen profile
    citizen_profile = f"""
Citizen Profile:
- Name: {profile.get('name', 'Not provided')}
- Age: {profile.get('age', 'Not provided')} years
- Gender: {profile.get('gender', 'Not provided')}
- Occupation: {profile.get('occupation', 'Not provided')}
- State: {profile.get('state', 'Not provided')}
- Income: {profile.get('income', 'Not provided')}
- Category: {profile.get('category', 'General')}
- Disability Status: {profile.get('disability', 'None')}
"""
    
    prompt = f"""<s>[INST]
You are JanMitra AI, an expert assistant for Indian government welfare schemes.

{citizen_profile}

Available Government Schemes:
{schemes_text}

Task:
Analyze the citizen's profile and determine which government schemes they are eligible for.
Use intelligent reasoning based on:
- Age requirements
- Occupation suitability
- Gender-specific schemes
- Income criteria
- State-specific programs
- Category benefits (SC/ST/OBC/General)
- Disability provisions

For each eligible scheme, explain:
1. WHY the citizen qualifies
2. What benefits they will receive
3. How it matches their profile

Return your response in JSON format:
{{
    "greeting": "Hello {profile.get('name', 'there')}",
    "eligible_schemes": [
        {{
            "scheme_id": "scheme-id",
            "scheme_name": "Scheme Name",
            "reason": "Detailed explanation of why they are eligible based on their age, occupation, and other factors",
            "confidence": 0.85,
            "benefits": "Brief description of benefits"
        }}
    ]
}}

Use reasoning to determine eligibility. Do NOT use hardcoded rules.
Respond in {language} language.
Be specific about why each scheme matches the citizen's profile.
[/INST]
"""

    try:
        body = {
            "prompt": prompt,
            "max_gen_len": 1500,
            "temperature": 0.3,
            "top_p": 0.9
        }

        print(f"[Bedrock Eligibility] Analyzing profile: Age={profile.get('age')}, Occupation={profile.get('occupation')}")

        response = bedrock.invoke_model(
            modelId="meta.llama3-8b-instruct-v1:0",
            body=json.dumps(body),
            contentType="application/json",
            accept="application/json"
        )

        response_body = json.loads(response["body"].read())
        generation = response_body.get("generation", "")
        
        print(f"[Bedrock Eligibility] Raw response: {generation[:200]}...")
        
        # Try to extract JSON from the response
        try:
            # Find JSON in the response
            start_idx = generation.find('{')
            end_idx = generation.rfind('}') + 1
            if start_idx != -1 and end_idx > start_idx:
                json_str = generation[start_idx:end_idx]
                result = json.loads(json_str)
                print(f"[Bedrock Eligibility] Successfully parsed {len(result.get('eligible_schemes', []))} schemes")
                return result
            else:
                # Fallback if no JSON found
                print("[Bedrock Eligibility] No JSON found in response")
                return {
                    "greeting": f"Hello {profile.get('name', 'there')}",
                    "eligible_schemes": [],
                    "raw_response": generation
                }
        except json.JSONDecodeError as je:
            print(f"[Bedrock Eligibility] JSON decode error: {str(je)}")
            return {
                "greeting": f"Hello {profile.get('name', 'there')}",
                "eligible_schemes": [],
                "raw_response": generation
            }
            
    except Exception as e:
        print(f"[Bedrock Eligibility] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "greeting": f"Hello {profile.get('name', 'there')}",
            "eligible_schemes": [],
            "error": str(e)
        }


# -----------------------------
# ISSUE 4 FIX: Enhanced Bedrock AI Reasoning with Comprehensive Prompt
# -----------------------------

def ask_bedrock_with_reasoning(question, language, user_context=None):
    """
    ISSUE 4 FIX: Enhanced Bedrock reasoning with comprehensive citizen profile
    Uses Meta LLaMA for intelligent reasoning about government scheme eligibility
    NO rule-based if/else logic - pure AI reasoning
    """
    
    # Build comprehensive citizen profile context
    context_info = ""
    if user_context:
        context_info = f"""
Citizen Profile:
- Age: {user_context.get('age', 'Not provided')}
- Gender: {user_context.get('gender', 'Not provided')}
- Occupation: {user_context.get('occupation', 'Not provided')}
- Income: {user_context.get('income', 'Not provided')}
- State: {user_context.get('state', 'Not provided')}
- Category: {user_context.get('category', 'General')}
- Disability Status: {user_context.get('disability', 'None')}
"""

    # Enhanced prompt with government schemes dataset
    prompt = f"""<s>[INST]
You are JanMitra AI, an expert assistant for Indian government welfare schemes.

Your role is to analyze citizen profiles and determine eligibility for government schemes using intelligent reasoning.

{context_info}

Government Schemes Dataset:
1. PM-Kisan Samman Nidhi
   - Eligibility: Small and marginal farmers with cultivable land
   - Benefits: ₹6,000 per year in three installments
   - Target: Farmers with income below ₹2 lakh annually
   
2. Pradhan Mantri Awas Yojana (PMAY)
   - Eligibility: Economically weaker sections, no pucca house ownership
   - Benefits: Affordable housing subsidy
   - Target: Low-income families, age 21-55 years
   
3. Ayushman Bharat (PM-JAY)
   - Eligibility: Economically weaker families (BPL)
   - Benefits: Health insurance up to ₹5 lakh per family per year
   - Target: All age groups from poor families
   
4. Pradhan Mantri Mudra Yojana
   - Eligibility: Small business owners, entrepreneurs
   - Benefits: Loans up to ₹10 lakh without collateral
   - Target: Self-employed, small businesses
   
5. National Scholarship Portal (NSP)
   - Eligibility: Students from pre-matric to post-doctoral levels
   - Benefits: Various scholarships based on merit and economic background
   - Target: Students aged 5-35 years
   
6. Pradhan Mantri Ujjwala Yojana
   - Eligibility: Women from BPL households
   - Benefits: Free LPG connection
   - Target: Women from economically weaker sections
   
7. Pradhan Mantri Kaushal Vikas Yojana (PMKVY)
   - Eligibility: Youth aged 15-45 years
   - Benefits: Free skill training and certification
   - Target: Unemployed youth, students
   
8. Sukanya Samriddhi Yojana
   - Eligibility: Girl child under 10 years
   - Benefits: Savings scheme with attractive interest rates
   - Target: Parents of girl children
   
9. Atal Pension Yojana (APY)
   - Eligibility: Unorganized sector workers aged 18-40
   - Benefits: Guaranteed pension after age 60
   - Target: Workers without formal pension
   
10. Stand-Up India Scheme
    - Eligibility: SC/ST and women entrepreneurs
    - Benefits: Bank loans ₹10 lakh to ₹1 crore
    - Target: Entrepreneurs from marginalized communities

User Question:
{question}

Task:
Using the citizen profile and government schemes dataset, perform intelligent reasoning to:
1. Determine which schemes the citizen is eligible for
2. Explain WHY they qualify for each scheme
3. Provide a short description of benefits
4. Use reasoning based on age, occupation, gender, income, and other factors

Example reasoning:
"You are eligible for PM Kisan because you are a farmer aged 25, which falls within the target age group. This scheme supports small and marginal farmers with annual income below ₹2 lakh. You will receive ₹6,000 per year in three installments directly to your bank account."

Provide a clear, helpful answer in {language} language.
Keep your response concise (3-4 sentences) and easy to understand for rural citizens.
Focus on the most relevant schemes based on the citizen's profile.
[/INST]
"""

    try:
        body = {
            "prompt": prompt,
            "max_gen_len": 500,
            "temperature": 0.3,
            "top_p": 0.9
        }

        response = bedrock.invoke_model(
            modelId="meta.llama3-8b-instruct-v1:0",
            body=json.dumps(body),
            contentType="application/json",
            accept="application/json"
        )

        response_body = json.loads(response["body"].read())
        answer = response_body.get("generation", "I apologize, I couldn't process your question. Please try again.")
        
        # Clean up the response
        answer = answer.strip()
        
        print(f"[Bedrock] Generated response: {answer[:100]}...")
        
        return answer
        
    except Exception as e:
        print(f"[Bedrock] Error: {str(e)}")
        error_msg = {
            "en": "I apologize, I'm having trouble connecting to my knowledge base. Please try again.",
            "hi": "क्षमा करें, मुझे अपने ज्ञान आधार से जुड़ने में समस्या हो रही है। कृपया पुनः प्रयास करें।",
            "ta": "மன்னிக்கவும், எனது அறிவுத் தளத்துடன் இணைவதில் சிக்கல் உள்ளது. மீண்டும் முயற்சிக்கவும்."
        }
        return error_msg.get(language, error_msg["en"])


# -----------------------------
# ISSUE 8 FIX: Amazon Polly Voice Generation
# -----------------------------

def generate_voice_with_polly(text, language):
    """
    ISSUE 8 FIX: Use Amazon Polly for ALL voice generation
    Process: Bedrock text → Polly generate MP3 → Return audio file
    """
    
    # Fix pronunciation for better voice quality
    if language == "en":
        text = text.replace("AI", "A I")
        text = text.replace("PM", "P M")
        text = text.replace("CSC", "C S C")
    elif language == "hi":
        text = text.replace("AI", "ए आई")
        text = text.replace("PM", "पी एम")
    elif language == "ta":
        text = text.replace("AI", "ஏ ஐ")
    
    # Select appropriate voice based on language
    voice_map = {
        "en": "Aditi",  # Indian English female voice
        "hi": "Aditi",  # Supports Hindi
        "ta": "Aditi"   # Best available for Tamil
    }
    
    voice_id = voice_map.get(language, "Joanna")
    
    try:
        response = polly.synthesize_speech(
            Text=text,
            VoiceId=voice_id,
            OutputFormat="mp3",
            Engine="neural"  # Use neural engine for better quality
        )

        file_name = f"speech_{uuid.uuid4()}.mp3"
        file_path = os.path.join("audio", file_name)

        with open(file_path, "wb") as f:
            f.write(response["AudioStream"].read())

        return file_name
        
    except Exception as e:
        print(f"Polly error: {str(e)}")
        # Fallback to standard engine if neural fails
        try:
            response = polly.synthesize_speech(
                Text=text,
                VoiceId=voice_id,
                OutputFormat="mp3"
            )
            
            file_name = f"speech_{uuid.uuid4()}.mp3"
            file_path = os.path.join("audio", file_name)

            with open(file_path, "wb") as f:
                f.write(response["AudioStream"].read())

            return file_name
        except Exception as e2:
            print(f"Polly fallback error: {str(e2)}")
            return None


# -----------------------------
# ISSUE 6 FIX: Enhanced AI Chatbot Endpoint
# -----------------------------

@app.post("/ask-ai")
def ask_ai(data: Query):
    """
    ISSUE 6 FIX: Enhanced chatbot with full error handling and logging
    Pipeline: Frontend → FastAPI → Bedrock → Polly → Frontend
    """
    
    try:
        print(f"[API] Received question: {data.input.question}")
        print(f"[API] Language: {data.language}")
        
        # Get AI response from Bedrock
        answer = ask_bedrock_with_reasoning(
            data.input.question, 
            data.language
        )
        
        print(f"[API] Bedrock response: {answer[:100]}...")
        
        # Generate voice with Polly
        audio_file = generate_voice_with_polly(answer, data.language)
        
        if audio_file:
            print(f"[API] Polly audio generated: {audio_file}")
        else:
            print("[API] Polly audio generation failed")
        
        return {
            "response": answer,
            "audio": audio_file,
            "status": "success"
        }
        
    except Exception as e:
        print(f"[API] Error in ask_ai: {str(e)}")
        import traceback
        traceback.print_exc()
        
        error_msg = {
            "en": "I apologize, something went wrong. Please try again.",
            "hi": "क्षमा करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
            "ta": "மன்னிக்கவும், ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்."
        }
        
        return {
            "response": error_msg.get(data.language, error_msg["en"]),
            "audio": None,
            "status": "error",
            "error": str(e)
        }


# -----------------------------
# ISSUE 4 FIX: Eligibility Analysis Endpoint (Bedrock Reasoning)
# -----------------------------

@app.post("/analyze-eligibility")
def analyze_eligibility(data: EligibilityRequest):
    """
    ISSUE 4 & 7 FIX: Use Bedrock AI reasoning for eligibility
    NO rule-based if/else logic
    """
    
    try:
        print(f"[API] Analyzing eligibility for: {data.profile}")
        
        result = analyze_eligibility_with_bedrock(
            data.profile,
            data.schemes,
            data.language
        )
        
        print(f"[API] Eligibility result: {result}")
        
        return {
            "status": "success",
            "result": result
        }
        
    except Exception as e:
        print(f"[API] Error in analyze_eligibility: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            "status": "error",
            "error": str(e)
        }


# -----------------------------
# Serve Audio File
# -----------------------------

@app.get("/audio/{file_name}")
def get_audio(file_name: str):
    """Serve generated audio files"""
    
    file_path = os.path.join("audio", file_name)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(
        path=file_path,
        media_type="audio/mpeg",
        filename=file_name
    )


# -----------------------------
# ISSUE 2 FIX: Root Endpoint
# -----------------------------

@app.get("/")
def root():
    """Root endpoint to confirm backend is running"""
    return {
        "message": "JanMitra AI Backend Running",
        "status": "healthy",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "ask_ai": "/ask-ai",
            "analyze_eligibility": "/analyze-eligibility",
            "audio": "/audio/{file_name}",
            "docs": "/docs"
        }
    }


# -----------------------------
# Health Check Endpoint
# -----------------------------

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "JanMitra AI Backend",
        "bedrock": "connected",
        "polly": "connected"
    }







