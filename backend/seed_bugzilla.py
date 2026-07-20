import pandas as pd
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer


print("Loading AI Model (this takes a few seconds)...")
model = SentenceTransformer('all-MiniLM-L6-v2')

SUPABASE_URL = "https://qrlilnobonprqcliewin.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybGlsbm9ib25wcnFjbGlld2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwODkxMzgsImV4cCI6MjA5ODY2NTEzOH0.epq3zsxvqtbFHAuvuiopwb9bD9qeY7-6BZusfbhKEgQ"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


print("Reading Kaggle CSV Data...")

df = pd.read_csv('fix.csv').head(100) 

print(f"Found {len(df)} bugs. Starting AI Vectorization...")

success_count = 0

for index, row in df.iterrows():
    try:
        
        description = str(row.get('Description', 'No description provided.'))
        label = str(row.get('Label', 'Unknown'))
        fixing_time = str(row.get('Fixing_time', '0'))
        
        
        title = description[:60] + "..." if len(description) > 60 else description

        
        text_to_embed = f"Title: {title}\nDescription: {description}"
        embedding_vector = model.encode(text_to_embed).tolist()

       
        data = {
            "title": title,
            "description": description,
            "status": "Closed",
            "metadata": {"severity": label, "environment": "Production", "fixing_time": fixing_time},
            "embedding": embedding_vector 
        }
        
        
        supabase.table("historical_bugs").insert(data).execute()
        success_count += 1
        print(f"✅ Saved [{success_count}/100]: {title}")

    except Exception as e:
        print(f"❌ Failed to save row {index}: {e}")

print("\n🎉 INGESTION COMPLETE! Your AI is now trained on 100 real enterprise bugs!")