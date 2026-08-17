import requests
import json
import time

# The URL of your running local API
API_URL = "http://localhost:8000/api/bugs"

# Our Seeded Validation Dataset (Testing different formats and errors)
seeded_dataset = [
    {
        "test_name": "Frontend React Hydration Error",
        "title": "UI flickering on user dashboard",
        "description": "Error: Text content did not match server-rendered HTML. at HTMLHeadingElement. The dashboard component tries to render a timestamp that differs between server and client.",
        "environment": "Production",
        "severity": "Low"
    },
    {
        "test_name": "Database Connection Timeout",
        "title": "504 Gateway Timeout during checkout",
        "description": "psycopg2.OperationalError: FATAL: remaining connection slots are reserved for non-replication superuser connections. Occurred in payment_gateway.py line 214.",
        "environment": "Production",
        "severity": "Critical"
    },
    {
        "test_name": "Security Authorization Failure",
        "title": "Users accessing other users' profiles",
        "description": "ActionController::RoutingError (No route matches [GET] /profiles/admin): Unauthorized access attempt blocked by rack-cors, but middleware returned 401 instead of 403. user_id parameter manipulated.",
        "environment": "Staging",
        "severity": "High"
    }
]

def run_validation():
    print("🚀 Starting Multi-Agent Validation Suite...\n")
    
    passed_tests = 0
    
    for idx, data in enumerate(seeded_dataset):
        print(f"[{idx+1}/{len(seeded_dataset)}] Testing: {data['test_name']}")
        print("Waiting for agents to analyze...")
        
        start_time = time.time()
        
        # Fire the bug at your Orchestrator API
        try:
            response = requests.post(API_URL, json={
                "title": data["title"],
                "description": data["description"],
                "environment": data["environment"],
                "severity": data["severity"]
            })
            
            end_time = time.time()
            result = response.json()
            
            if response.status_code == 200:
                agents_output = result.get("agents_output", {})
                triage = agents_output.get("ai_triage", {})
                logs = agents_output.get("ai_log_analysis", {})
                
                print(f"✅ SUCCESS! (Time: {round(end_time - start_time, 2)}s)")
                print("   [Triage Agent] -> " + 
                      f"Severity: {triage.get('severity')} | " +
                      f"Component: {triage.get('affected_component')}")
                print("   [Log Agent]    -> " + 
                      f"Exception: {logs.get('exception_type')} | " +
                      f"Point of Failure: {logs.get('failure_point')}\n")
                passed_tests += 1
            else:
                print(f"❌ FAILED: API returned {response.status_code}\n")
                
        except Exception as e:
            print(f"❌ FAILED: Connection Error ({e})\n")
            
    print("==================================================")
    print(f"🎯 Validation Complete: {passed_tests}/{len(seeded_dataset)} tests passed!")
    print("==================================================")

if __name__ == "__main__":
    run_validation()