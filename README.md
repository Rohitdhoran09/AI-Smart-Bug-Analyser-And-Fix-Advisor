# Creation of Intelligent Bug Diagnosis Platform with Fix Recommendation 
# 🐛 AI-Powered Bug Analyzer & Resolution Engine

An intelligent, multi-agent site reliability engineering (SRE) platform that automates bug triage, performs semantic duplicate detection, and generates actionable root cause analyses using Retrieval-Augmented Generation (RAG).

## 🚀 Key Features

* **Multi-Agent Architecture:** Utilizes a 5-step AI pipeline (Triage, Log Analysis, Duplicate Detection, Root Cause, Remediation) powered by `openai/gpt-oss-120b`.
* **RAG-Powered Knowledge Base:** Converts historical bug reports into vector embeddings to intelligently match new defects with previously resolved issues.
* **Continuous Learning:** Successfully resolved bugs are fed back into the vector database, permanently improving the system's future diagnostic accuracy.
* **Live Defect Analytics:** Visualizes severity distributions and enterprise bug themes dynamically using responsive glassmorphic charts.

## 🛠️ Tech Stack

* **Frontend:** Next.js, React, Recharts (Deployed on Vercel)
* **Backend:** Python, FastAPI, SentenceTransformers (Deployed on Render)
* **Database:** Supabase with `pgvector` for high-dimensional embedding storage
* **AI Provider:** Groq API for ultra-fast, open-weight LLM inference

## 💻 Getting Started

### Prerequisites
* Python 3.9+
* Node.js 18+
* A Supabase project with `pgvector` enabled

### Environment Variables
Create a `.env` file in your backend directory with the following keys:
```env
SUPABASE_URL
SUPABASE_KEY
LLM_API_KEY
