from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
import os
from openai import OpenAI
from dotenv import load_dotenv  # NEW: Import dotenv

# NEW: Load environment variables from the .env file
load_dotenv()

app = FastAPI(title="AI Bug Analyzer Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NEW: Pulling keys securely from the .env file
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Adding a safety check to ensure keys are loaded
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env file!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
model = SentenceTransformer('all-MiniLM-L6-v2')

# NEW: Pulling LLM key securely from the .env file
LLM_API_KEY = os.getenv("LLM_API_KEY")

if not LLM_API_KEY:
    raise ValueError("Missing LLM_API_KEY in .env file!")

llm_client = OpenAI(api_key=LLM_API_KEY, base_url="https://api.groq.com/openai/v1")
MODEL_NAME = "llama-3.1-8b-instant" 


class BugSubmission(BaseModel):
    title: str
    description: str
    attachment_url: Optional[str] = None
    severity: Optional[str] = "Medium"
    environment: Optional[str] = "Production"

class SearchQuery(BaseModel):
    query: str


@app.post("/api/bugs")
async def submit_bug(bug: BugSubmission):
    try:
        text_to_embed = f"Title: {bug.title}\nDescription: {bug.description}"
        embedding_vector = model.encode(text_to_embed).tolist()

        data = {
            "title": bug.title,
            "description": bug.description,
            "attachment_url": bug.attachment_url,
            "status": "Open",
            "metadata": {"severity": bug.severity, "environment": bug.environment},
            "embedding": embedding_vector 
        }
        
        supabase.table("historical_bugs").insert(data).execute()
        return {"success": True, "message": "Bug embedded and saved!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/search")
async def search_similar_bugs(search: SearchQuery):
    try:
        
        query_vector = model.encode(search.query).tolist()
        response = supabase.rpc(
            "match_historical_bugs",
            {"query_embedding": query_vector, "match_threshold": 0.2, "match_count": 3}
        ).execute()
        
        retrieved_bugs = response.data
        
        context_text = ""
        for idx, bug in enumerate(retrieved_bugs):
            context_text += f"\n--- Historical Bug {idx+1} ---\nTitle: {bug['title']}\nDescription: {bug['description']}\n"

        prompt = f"""
        You are an Expert Senior Software Engineer debugging a system. 
        A junior developer has reported a new issue:
        "{search.query}"
        
        Here are historically resolved tickets that are mathematically similar:
        {context_text}
        
        Based ONLY on the historical context provided, generate a brief Root Cause Analysis (RCA) and a suggested fix for the new issue. If the historical bugs aren't helpful, state that you need more logs.
        Keep it professional, structured, and concise.
        """
        
        llm_response = llm_client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=500
        )
        
        ai_analysis = llm_response.choices[0].message.content
        
        return {
            "success": True, 
            "results": retrieved_bugs,
            "ai_analysis": ai_analysis
        }
    except Exception as e:
        print(f"Backend Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))