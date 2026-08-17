from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
import os
import json
import asyncio
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="AI Bug Analyzer Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env file!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
model = SentenceTransformer('all-MiniLM-L6-v2')

LLM_API_KEY = os.getenv("LLM_API_KEY")
if not LLM_API_KEY:
    raise ValueError("Missing LLM_API_KEY in .env file!")

llm_client = OpenAI(api_key=LLM_API_KEY, base_url="https://api.groq.com/openai/v1")
MODEL_NAME = "openai/gpt-oss-120b" 

# --- DATA MODELS ---
class BugSubmission(BaseModel):
    title: str
    description: str
    attachment_url: Optional[str] = None
    severity: Optional[str] = "Medium"
    environment: Optional[str] = "Production"

class SearchQuery(BaseModel):
    query: str

# --- AGENT DEFINITIONS ---
async def run_triage_agent(title: str, description: str) -> dict:
    """Agent 1: Classifies severity, priority, and affected component."""
    prompt = f"""
    You are an Expert Site Reliability Engineer (SRE). Analyze the following bug report.
    Title: {title}
    Description: {description}
    
    Output a raw JSON object (no markdown, no backticks) with exactly these keys:
    - severity (Critical, High, Medium, Low)
    - priority (P1, P2, P3, P4)
    - affected_component (Name of the system part failing)
    - confidence_score (Float between 0.0 and 1.0)
    - reasoning (1 sentence explanation)
    """
    try:
        # Run synchronous Groq call in a thread so it doesn't block FastAPI
        response = await asyncio.to_thread(
            llm_client.chat.completions.create,
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Triage Agent Failed: {e}")
        return {"severity": "Unknown", "priority": "Unassigned", "affected_component": "Unknown", "confidence_score": 0.0, "reasoning": "Agent failed."}

async def run_log_analysis_agent(description: str) -> dict:
    """Agent 2: Parses stack traces and structural failures."""
    prompt = f"""
    You are a Senior Backend Architect. Extract the technical failure details from this log/description.
    Logs: {description}
    
    Output a raw JSON object (no markdown, no backticks) with exactly these keys:
    - exception_type (e.g., NullPointerException, Timeout, 502 Bad Gateway)
    - failure_point (Specific file, function, or line number if available)
    - affected_code_path (Brief trace of how the data flows to the error)
    """
    try:
        response = await asyncio.to_thread(
            llm_client.chat.completions.create,
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Log Analysis Agent Failed: {e}")
        return {"exception_type": "Unknown", "failure_point": "Unknown", "affected_code_path": "Unknown"}


# --- ENDPOINTS ---
@app.post("/api/bugs")
async def submit_bug(bug: BugSubmission):
    try:
        # 1. ORCHESTRATION: Run both agents concurrently
        triage_task = run_triage_agent(bug.title, bug.description)
        log_task = run_log_analysis_agent(bug.description)
        
        triage_result, log_result = await asyncio.gather(triage_task, log_task)

        # 2. ENRICH CONTEXT: Combine user input + agent intelligence for the Vector DB
        enriched_text = f"""
        Original Title: {bug.title}
        Original Description: {bug.description}
        AI Triage - Severity: {triage_result.get('severity')}, Priority: {triage_result.get('priority')}, Component: {triage_result.get('affected_component')}
        AI Log Analysis - Exception: {log_result.get('exception_type')}, Point of Failure: {log_result.get('failure_point')}
        """
        
        # 3. VECTORIZE
        embedding_vector = model.encode(enriched_text).tolist()

        # 4. SAVE TO DATABASE
        metadata = {
            "environment": bug.environment,
            "ai_triage": triage_result,
            "ai_log_analysis": log_result
        }
        
        data = {
            "title": bug.title,
            "description": bug.description,
            "attachment_url": bug.attachment_url,
            "status": "Open",
            "metadata": metadata, # Saving the structured JSON from both agents!
            "embedding": embedding_vector 
        }
        
        supabase.table("historical_bugs").insert(data).execute()
        
        return {
            "success": True, 
            "message": "Bug analyzed by multi-agent system and saved!",
            "agents_output": metadata
        }
    except Exception as e:
        print(f"Ingestion Error: {e}")
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
            # Include the AI agent metadata from history to make the final RCA even smarter!
            meta = bug.get('metadata', {})
            triage = meta.get('ai_triage', {})
            log_analysis = meta.get('ai_log_analysis', {})
            
            context_text += f"\n--- Historical Bug {idx+1} ---\nTitle: {bug['title']}\nDescription: {bug['description']}\n"
            if triage: context_text += f"Historical Severity: {triage.get('severity')} | Priority: {triage.get('priority')}\n"
            if log_analysis: context_text += f"Historical Exception: {log_analysis.get('exception_type')}\n"

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
    
# --- MILESTONE 3: INVESTIGATION AGENTS ---

async def run_duplicate_detection_agent(query_vector: list) -> list:
    """Agent 3: Performs semantic similarity search over past bugs."""
    try:
        response = await asyncio.to_thread(
            supabase.rpc(
                "match_historical_bugs",
                {"query_embedding": query_vector, "match_threshold": 0.1, "match_count": 3}
            ).execute
        )
        return response.data if response.data else []
    except Exception as e:
        print(f"Duplicate Detection Failed: {e}")
        return []

async def run_root_cause_agent(query: str, duplicates: list) -> dict:
    """Agent 4: Reasons about probable root cause using RAG."""
    context_text = json.dumps(duplicates) if duplicates else "No historical duplicates found."
    
    prompt = f"""
    You are an Expert Diagnostic SRE. Analyze the current issue and historical context to determine the root cause.
    Current Issue: {query}
    Historical Context: {context_text}
    
    Output a raw JSON object with exactly these keys (no markdown, no backticks):
    - hypothesis
    - confidence_score
    - evidence
    """
    try:
        print("\n⏳ Sending request to AI...")
        response = await asyncio.to_thread(
            llm_client.chat.completions.create,
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2
        )
        
        raw_text = response.choices[0].message.content
        print("\n🤖 RAW AI RESPONSE:")
        print(raw_text)
        print("===================\n")
        
        # Clean up any accidental markdown backticks before reading
        clean_text = raw_text.replace("```json", "").replace("```", "").strip()
        
        return json.loads(clean_text)
        
    except Exception as e:
        print(f"\n🛑 ROOT CAUSE CRASHED: {str(e)}\n")
        return {"hypothesis": "Agent failed to generate root cause.", "confidence_score": 0.0, "evidence": []}
    
async def run_remediation_agent(query: str, root_cause_data: dict) -> dict:
    """Agent 5: Generates specific fix recommendations."""
    prompt = f"""
    You are a Senior Security & Architecture Engineer. Based on the root cause, provide a fix.
    Issue: {query}
    Root Cause Hypothesis: {root_cause_data.get('hypothesis')}
    
    Output a raw JSON object with exactly these keys:
    - recommended_fix (Step-by-step instructions to solve the bug)
    - best_practices (Array of strings for preventing this in the future)
    """
    try:
        response = await asyncio.to_thread(
            llm_client.chat.completions.create,
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        return {"recommended_fix": "Agent failed to generate fix.", "best_practices": []}


@app.post("/api/investigate")
async def investigate_bug(search: SearchQuery):
    try:
        # 1. Vectorize the query
        query_vector = model.encode(search.query).tolist()
        
        # 2. Run Duplicate Detection Agent (RAG Retrieval)
        duplicates = await run_duplicate_detection_agent(query_vector)
        
        # 3. Run Root Cause Agent based on RAG data
        root_cause = await run_root_cause_agent(search.query, duplicates)
        
        # 4. Run Remediation Agent based on Root Cause findings
        remediation = await run_remediation_agent(search.query, root_cause)
        
        # 5. Return the Structured Findings Payload
        final_payload = {
            "success": True,
            "structured_findings": {
                "duplicate_matches": duplicates,
                "root_cause_analysis": root_cause,
                "remediation_plan": remediation
            }
        }
        
        # 👇 ADD THIS PRINT STATEMENT 👇
        print("\n=== FINAL AI PAYLOAD ===")
        print(final_payload)
        print("========================\n")
        
        return final_payload
    except Exception as e:
        # SAFE ERROR LOGGING: This will not crash your server!
        import traceback
        print("\n" + "="*50)
        print(f"🚨 HIDDEN AI ERROR FOUND: {str(e)}")
        print("="*50)
        print(traceback.format_exc())
        
        # Safely tell the frontend we failed so the UI doesn't break
        return {
            "success": False, 
            "error": f"Agent crashed: {str(e)}"
        }
    
# --- MILESTONE 4: LIVE METRICS ---

@app.get("/api/metrics")
async def get_live_metrics():
    try:
        # Fetch all historical bugs from your Supabase database
        response = await asyncio.to_thread(
            supabase.table("historical_bugs").select("*").execute
        )
        data = response.data if response.data else []
        
        # Calculate Severity Distribution
        severity_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        
        for bug in data:
            metadata = bug.get("metadata", {})
            sev = metadata.get("severity") or bug.get("severity") or "Medium"
            if sev in severity_counts:
                severity_counts[sev] += 1
                
        # Format specifically for Recharts in Next.js
        severity_data = [
            {"name": "Critical", "value": severity_counts["Critical"], "color": "#ef4444"}, # Red
            {"name": "High", "value": severity_counts["High"], "color": "#f97316"},     # Orange
            {"name": "Medium", "value": severity_counts["Medium"], "color": "#eab308"},   # Yellow
            {"name": "Low", "value": severity_counts["Low"], "color": "#3b82f6"}        # Blue
        ]
        
        # Mock trend data
        trend_data = [
            {"day": "Mon", "time": 4.2},
            {"day": "Tue", "time": 3.8},
            {"day": "Wed", "time": 2.5},
            {"day": "Thu", "time": 1.9},
            {"day": "Fri", "time": 0.8}
        ]
        
        return {
            "success": True,
            "total_ingested": len(data),
            "severity_distribution": severity_data,
            "resolution_trend": trend_data
        }
    except Exception as e:
        print(f"Metrics Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
class LearnRequest(BaseModel):
    query: str
    severity: str
    root_cause: str
    resolution: str

@app.post("/api/learn")
async def learn_resolution(request: LearnRequest):
    try:
        embedding = model.encode(request.query).tolist()
        
        # Package everything neatly into the metadata column
        metadata = {
            "ai_triage": {"severity": request.severity},
            "confirmed_root_cause": request.root_cause,
            "confirmed_resolution": request.resolution
        }
        
        # Match your exact Supabase columns (added 'status', removed 'severity')
        data = {
            "title": request.query[:50] + "...", 
            "description": request.query,
            "status": "Closed", 
            "embedding": embedding,
            "metadata": metadata
        }
        
        response = supabase.table("historical_bugs").insert(data).execute()
        return {"success": True, "message": "Added to Knowledge Base!"}
        
    except Exception as e:
        print(f"Learning Endpoint Failed: {e}")
        return {"success": False, "error": str(e)}
    
@app.get("/api/analytics/patterns")
async def get_defect_patterns():
    try:
        # 1. Fetch all bug descriptions from Supabase
        response = supabase.table("historical_bugs").select("description").execute()
        bugs = response.data
        
        # 2. Define the enterprise bug themes we want to track
        patterns = {
            "Authentication/Security": 0,
            "Database/Timeouts": 0,
            "UI/Frontend Crashes": 0,
            "API/Network Errors": 0,
            "Memory/Performance": 0
        }
        
        # 3. Scan every historical bug for keywords to find systemic issues
        for bug in bugs:
            desc = bug.get("description", "").lower()
            if any(word in desc for word in ["auth", "login", "password", "token", "401"]):
                patterns["Authentication/Security"] += 1
            if any(word in desc for word in ["db", "database", "sql", "timeout", "postgres"]):
                patterns["Database/Timeouts"] += 1
            if any(word in desc for word in ["ui", "button", "render", "react", "component"]):
                patterns["UI/Frontend Crashes"] += 1
            if any(word in desc for word in ["api", "fetch", "500", "network", "cors"]):
                patterns["API/Network Errors"] += 1
            if any(word in desc for word in ["memory", "leak", "crash", "slow", "load"]):
                patterns["Memory/Performance"] += 1
                
        # 4. Format the data for our React Recharts component
        chart_data = [{"theme": k, "count": v} for k, v in patterns.items()]
        chart_data = sorted(chart_data, key=lambda x: x["count"], reverse=True)
        
        return {"success": True, "data": chart_data}
        
    except Exception as e:
        print(f"Analytics Endpoint Failed: {e}")
        return {"success": False, "error": str(e)}