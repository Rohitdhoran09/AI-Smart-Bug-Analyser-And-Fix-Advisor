from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client
import os
import json
import asyncio
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Bug Analyzer Backend")


# =========================================================
# CORS CONFIGURATION
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        # Add your Vercel frontend URL here after deployment
        # "https://your-frontend.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# CONFIGURATION
# =========================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in environment variables!")

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# =========================================================
# GROQ LLM CONFIGURATION
# =========================================================

LLM_API_KEY = os.getenv("LLM_API_KEY")

if not LLM_API_KEY:
    raise ValueError("Missing LLM_API_KEY in environment variables!")

llm_client = OpenAI(
    api_key=LLM_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

MODEL_NAME = "openai/gpt-oss-120b"


# =========================================================
# OPENAI EMBEDDING CONFIGURATION
# =========================================================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("Missing OPENAI_API_KEY in environment variables!")

embedding_client = OpenAI(
    api_key=OPENAI_API_KEY
)


async def get_embedding(text: str) -> list:
    """
    Generate a 384-dimensional embedding using OpenAI.
    This replaces SentenceTransformer so the Render
    server does not need to load PyTorch/HuggingFace models.
    """

    try:
        response = await asyncio.to_thread(
            embedding_client.embeddings.create,
            model="text-embedding-3-small",
            input=text,
            dimensions=384
        )

        return response.data[0].embedding

    except Exception as e:
        print(f"Embedding generation failed: {e}")
        raise


# =========================================================
# DATA MODELS
# =========================================================

class BugSubmission(BaseModel):
    title: str
    description: str
    attachment_url: Optional[str] = None
    severity: Optional[str] = "Medium"
    environment: Optional[str] = "Production"


class SearchQuery(BaseModel):
    query: str


class LearnRequest(BaseModel):
    query: str
    severity: str
    root_cause: str
    resolution: str


# =========================================================
# AGENT 1 — TRIAGE AGENT
# =========================================================

async def run_triage_agent(title: str, description: str) -> dict:

    prompt = f"""
    You are an Expert Site Reliability Engineer (SRE).
    Analyze the following bug report.

    Title: {title}

    Description: {description}

    Output a raw JSON object (no markdown, no backticks)
    with exactly these keys:

    - severity (Critical, High, Medium, Low)
    - priority (P1, P2, P3, P4)
    - affected_component (Name of the system part failing)
    - confidence_score (Float between 0.0 and 1.0)
    - reasoning (1 sentence explanation)
    """

    try:

        response = await asyncio.to_thread(
            llm_client.chat.completions.create,
            model=MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        return json.loads(
            response.choices[0].message.content
        )

    except Exception as e:

        print(f"Triage Agent Failed: {e}")

        return {
            "severity": "Unknown",
            "priority": "Unassigned",
            "affected_component": "Unknown",
            "confidence_score": 0.0,
            "reasoning": "Agent failed."
        }


# =========================================================
# AGENT 2 — LOG ANALYSIS AGENT
# =========================================================

async def run_log_analysis_agent(description: str) -> dict:

    prompt = f"""
    You are a Senior Backend Architect.

    Extract the technical failure details from this
    log/description.

    Logs:
    {description}

    Output a raw JSON object (no markdown, no backticks)
    with exactly these keys:

    - exception_type
    - failure_point
    - affected_code_path
    """

    try:

        response = await asyncio.to_thread(
            llm_client.chat.completions.create,
            model=MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        return json.loads(
            response.choices[0].message.content
        )

    except Exception as e:

        print(f"Log Analysis Agent Failed: {e}")

        return {
            "exception_type": "Unknown",
            "failure_point": "Unknown",
            "affected_code_path": "Unknown"
        }


# =========================================================
# BUG SUBMISSION ENDPOINT
# =========================================================

@app.post("/api/bugs")
async def submit_bug(bug: BugSubmission):

    try:

        # Run both agents concurrently
        triage_task = run_triage_agent(
            bug.title,
            bug.description
        )

        log_task = run_log_analysis_agent(
            bug.description
        )

        triage_result, log_result = await asyncio.gather(
            triage_task,
            log_task
        )

        # -------------------------------------------------
        # ENRICH CONTEXT
        # -------------------------------------------------

        enriched_text = f"""
        Original Title: {bug.title}

        Original Description: {bug.description}

        AI Triage:
        Severity: {triage_result.get('severity')}
        Priority: {triage_result.get('priority')}
        Component: {triage_result.get('affected_component')}

        AI Log Analysis:
        Exception: {log_result.get('exception_type')}
        Point of Failure: {log_result.get('failure_point')}
        """

        # -------------------------------------------------
        # GENERATE EMBEDDING
        # -------------------------------------------------

        embedding_vector = await get_embedding(
            enriched_text
        )

        # -------------------------------------------------
        # METADATA
        # -------------------------------------------------

        metadata = {
            "environment": bug.environment,
            "ai_triage": triage_result,
            "ai_log_analysis": log_result
        }

        # -------------------------------------------------
        # SAVE TO SUPABASE
        # -------------------------------------------------

        data = {
            "title": bug.title,
            "description": bug.description,
            "attachment_url": bug.attachment_url,
            "status": "Open",
            "metadata": metadata,
            "embedding": embedding_vector
        }

        supabase.table(
            "historical_bugs"
        ).insert(data).execute()

        return {
            "success": True,
            "message": "Bug analyzed by multi-agent system and saved!",
            "agents_output": metadata
        }

    except Exception as e:

        print(f"Ingestion Error: {e}")

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# SEARCH SIMILAR BUGS
# =========================================================

@app.post("/api/search")
async def search_similar_bugs(search: SearchQuery):

    try:

        # Generate query embedding
        query_vector = await get_embedding(
            search.query
        )

        # Search Supabase pgvector
        response = supabase.rpc(
            "match_historical_bugs",
            {
                "query_embedding": query_vector,
                "match_threshold": 0.2,
                "match_count": 3
            }
        ).execute()

        retrieved_bugs = response.data or []

        context_text = ""

        for idx, bug in enumerate(retrieved_bugs):

            meta = bug.get("metadata", {})

            triage = meta.get(
                "ai_triage",
                {}
            )

            log_analysis = meta.get(
                "ai_log_analysis",
                {}
            )

            context_text += (
                f"\n--- Historical Bug {idx + 1} ---\n"
                f"Title: {bug.get('title', '')}\n"
                f"Description: {bug.get('description', '')}\n"
            )

            if triage:

                context_text += (
                    f"Historical Severity: "
                    f"{triage.get('severity')} | "
                    f"Priority: "
                    f"{triage.get('priority')}\n"
                )

            if log_analysis:

                context_text += (
                    f"Historical Exception: "
                    f"{log_analysis.get('exception_type')}\n"
                )

        prompt = f"""
        You are an Expert Senior Software Engineer
        debugging a system.

        A junior developer has reported a new issue:

        "{search.query}"

        Here are historically resolved tickets
        that are mathematically similar:

        {context_text}

        Based ONLY on the historical context provided,
        generate a brief Root Cause Analysis (RCA)
        and a suggested fix for the new issue.

        If the historical bugs aren't helpful,
        state that you need more logs.

        Keep it professional, structured, and concise.
        """

        llm_response = await asyncio.to_thread(
            llm_client.chat.completions.create,
            model=MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=500
        )

        ai_analysis = (
            llm_response
            .choices[0]
            .message
            .content
        )

        return {
            "success": True,
            "results": retrieved_bugs,
            "ai_analysis": ai_analysis
        }

    except Exception as e:

        print(f"Backend Error: {e}")

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# AGENT 3 — DUPLICATE DETECTION
# =========================================================

async def run_duplicate_detection_agent(
    query_vector: list
) -> list:

    try:

        response = await asyncio.to_thread(
            supabase.rpc(
                "match_historical_bugs",
                {
                    "query_embedding": query_vector,
                    "match_threshold": 0.1,
                    "match_count": 3
                }
            ).execute
        )

        return response.data or []

    except Exception as e:

        print(
            f"Duplicate Detection Failed: {e}"
        )

        return []


# =========================================================
# AGENT 4 — ROOT CAUSE ANALYSIS
# =========================================================

async def run_root_cause_agent(
    query: str,
    duplicates: list
) -> dict:

    context_text = (
        json.dumps(duplicates)
        if duplicates
        else "No historical duplicates found."
    )

    prompt = f"""
    You are an Expert Diagnostic SRE.

    Analyze the current issue and historical context
    to determine the root cause.

    Current Issue:
    {query}

    Historical Context:
    {context_text}

    Output a raw JSON object with exactly these keys:
    - hypothesis
    - confidence_score
    - evidence

    Do not use markdown or code blocks.
    """

    try:
        print("\nSending request to AI...")

        response = await asyncio.to_thread(
            llm_client.chat.completions.create,
            model=MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2
        )

        raw_text = response.choices[0].message.content

        print("\nRAW AI RESPONSE:")
        print(raw_text)
        print("===================\n")

        clean_text = (
            raw_text
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        return json.loads(clean_text)

    except Exception as e:
        print(f"\nROOT CAUSE CRASHED: {str(e)}\n")

        return {
            "hypothesis": "Agent failed to generate root cause.",
            "confidence_score": 0.0,
            "evidence": []
        }
