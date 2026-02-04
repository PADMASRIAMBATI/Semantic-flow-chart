from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient

app = FastAPI()

# Enable CORS so React can talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client.quiz_db

# --- Models ---

class User(BaseModel):
    name: str
    student_class: str
    email: EmailStr
    password: str

class QuestionSchema(BaseModel):
    q: str
    options: List[str]
    answer: str

class SentenceUpload(BaseModel):
    sentence: str
    graph_data: str 
    questions: List[QuestionSchema]

# UPDATED: Model to store separate scores for Sentence and Flowchart phases
class Result(BaseModel):
    student_name: str
    student_class: str
    sentence_id: int
    sentence_score: int    # Score from Phase 1 (No Flowchart)
    flowchart_score: int   # Score from Phase 2 (With Flowchart)
    total_questions: int

# --- Routes ---

@app.post("/signup")
async def signup(user: User):
    await db.users.insert_one(user.dict())
    return {"message": "User created successfully"}

@app.post("/login")
async def login(credentials: dict):
    # Admin Default Login
    if credentials['email'] == "Admin123" and credentials['password'] == "Admin@123":
        return {"role": "admin", "name": "Administrator"}
    
    # Student Login
    user = await db.users.find_one({"email": credentials['email'], "password": credentials['password']})
    if user:
        return {
            "role": "student", 
            "name": user['name'], 
            "class": user['student_class']
        }
    raise HTTPException(status_code=401, detail="Invalid email or password")

@app.get("/sentences")
async def get_sentences():
    # Fetches all uploaded sentences from the database
    cursor = db.sentences.find({}, {"_id": 0})
    sentences = await cursor.to_list(length=100)
    return sentences

@app.post("/admin/upload-sentence")
async def upload_sentence(data: SentenceUpload):
    sentence_doc = data.dict()
    # Auto-increment simple ID
    count = await db.sentences.count_documents({})
    sentence_doc["id"] = count + 1
    
    result = await db.sentences.insert_one(sentence_doc)
    if result.inserted_id:
        return {"message": "Sentence uploaded", "id": sentence_doc["id"]}
    raise HTTPException(status_code=500, detail="Failed to save sentence")

@app.post("/submit-results")
async def submit_results(result: Result):
    # Saves the phase-wise scores to the 'results' collection
    await db.results.insert_one(result.dict())
    return {"status": "success", "message": "Results recorded"}

@app.get("/admin/stats")
async def get_stats():
    # We fetch all fields. The .sort ensures your grouping in React works better.
    cursor = db.results.find({}, {"_id": 0}).sort([("student_name", 1), ("sentence_id", 1)])
    results = await cursor.to_list(length=1000)
    print(f"DEBUG: Found {len(results)} records in results collection") # Check your console
    return results

@app.get("/user-progress/{student_name}")
async def get_progress(student_name: str):
    # Count how many unique sentences this student has completed
    completed_count = await db.results.count_documents({"student_name": student_name})
    return {"completed_count": completed_count}