import pandas as pd
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
import time


SUPABASE_URL = "https://YOUR-PROJECT-URL.supabase.co" 
SUPABASE_KEY = "YOUR-ANON-PUBLIC-KEY"                 
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Loading AI Embedding Model...")
model = SentenceTransformer('all-MiniLM-L6-v2')


CSV_FILE_PATH = "mozilla_bugs.csv" # Ensure your file is named this
print(f"Loading data from {CSV_FILE_PATH}...")

try:
    # Read the CSV. We'll just take the first 100 rows for testing so we don't overwhelm the free database!
    df = pd.read_csv(CSV_FILE_PATH).head(100) 
except FileNotFoundError:
    print(f"ERROR: Could not find {CSV_FILE_PATH}. Please make sure it's in the backend folder.")
    exit()

# 3. Process and Upload
print(f"Found {len(df)} bugs. Starting vectorization and upload...")

for index, row in df.iterrows():
    try:
        # Map your CSV columns to our database structure
        # (Adjust 'Summary' and 'Description' if your CSV columns are named differently)
        title = str(row.get('Summary', 'Untitled Bug'))
        description = str(row.get('Description', 'No description provided.'))
        severity = str(row.get('Severity', 'normal'))
        
        # Combine text for the AI context
        text_to_embed = f"Title: {title}\nDescription: {description}"
        embedding_vector = model.encode(text_to_embed).tolist()

        # Prepare the payload for Supabase
        data = {
            "title": title,
            "description": description,
            "attachment_url": None,
            "status": "Closed", # Assuming historical bugs are closed
            "metadata": {"severity": severity, "source": "Mozilla Dataset"},
            "embedding": embedding_vector 
        }
        
        # Insert into database
        supabase.table("historical_bugs").insert(data).execute()
        print(f"✅ Successfully ingested Bug {index + 1}: {title[:30]}...")
        
        # Pause briefly so we don't hit database rate limits
        time.sleep(0.1) 
        
    except Exception as e:
        print(f"❌ Failed to ingest Bug {index + 1}: {e}")

print("🎉 Mozilla dataset ingestion complete! Your vector database is now populated.")