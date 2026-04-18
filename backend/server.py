from dotenv import load_dotenv
from pathlib import Path

import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Form
from fastapi.responses import Response, JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import uuid
import secrets
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
from anthropic import AsyncAnthropic
import json
import stripe

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ MODELS ============

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    company: str = ""

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class JobCreate(BaseModel):
    title: str
    description: str
    skills: List[str]
    experience_min: int = 0
    experience_max: int = 10
    location: str = ""
    job_type: str = "full-time"
    salary_range: str = ""
    hr_email: str = ""

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_min: Optional[int] = None
    experience_max: Optional[int] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    salary_range: Optional[str] = None
    hr_email: Optional[str] = None

class CandidateStatusUpdate(BaseModel):
    status: str

class ScreeningInitiate(BaseModel):
    phone_number: Optional[str] = None

class SendShortlistedRequest(BaseModel):
    hr_email: str

class CheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str

# ============ APP ============

app = FastAPI(title="RecruitIT API")
api_router = APIRouter(prefix="/api")

# ============ AUTH ROUTES ============

@api_router.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "name": req.name,
        "email": email,
        "password_hash": hash_password(req.password),
        "company": req.company,
        "role": "user",
        "email_verified": False,
        "subscription": {"plan": "free", "status": "active"},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create email verification token
    verification_token = secrets.token_urlsafe(32)
    await db.email_verification_tokens.insert_one({
        "user_id": user_id,
        "token": verification_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        "used": False
    })
    logger.info(f"Email verification token for {email}: {verification_token}")
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id, "name": req.name, "email": email,
        "company": req.company, "role": "user", "email_verified": False,
        "subscription": {"plan": "free", "status": "active"},
        "verification_token": verification_token
    }

@api_router.post("/auth/login")
async def login(req: LoginRequest, request: Request, response: Response):
    email = req.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    
    # Brute force check
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_until = datetime.fromisoformat(attempt["lockout_until"]) if "lockout_until" in attempt else None
        if lockout_until and datetime.now(timezone.utc) < lockout_until:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"lockout_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    await db.login_attempts.delete_one({"identifier": identifier})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id, "name": user["name"], "email": user["email"],
        "company": user.get("company", ""), "role": user.get("role", "user"),
        "email_verified": user.get("email_verified", False),
        "subscription": user.get("subscription", {"plan": "free", "status": "active"})
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["_id"], "name": user["name"], "email": user["email"],
        "company": user.get("company", ""), "role": user.get("role", "user"),
        "email_verified": user.get("email_verified", False),
        "subscription": user.get("subscription", {"plan": "free", "status": "active"})
    }

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@api_router.post("/auth/verify-email")
async def verify_email(token: str = Form(...)):
    token_doc = await db.email_verification_tokens.find_one({"token": token, "used": False}, {"_id": 0})
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    expires_at = datetime.fromisoformat(token_doc["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Verification token expired")
    await db.users.update_one({"_id": ObjectId(token_doc["user_id"])}, {"$set": {"email_verified": True}})
    await db.email_verification_tokens.update_one({"token": token}, {"$set": {"used": True}})
    return {"message": "Email verified successfully"}

@api_router.post("/auth/verify-email-json")
async def verify_email_json(request: Request):
    body = await request.json()
    token = body.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token required")
    token_doc = await db.email_verification_tokens.find_one({"token": token, "used": False}, {"_id": 0})
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    expires_at = datetime.fromisoformat(token_doc["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Verification token expired")
    await db.users.update_one({"_id": ObjectId(token_doc["user_id"])}, {"$set": {"email_verified": True}})
    await db.email_verification_tokens.update_one({"token": token}, {"$set": {"used": True}})
    return {"message": "Email verified successfully"}

# ============ JOB ROUTES ============

@api_router.post("/jobs")
async def create_job(job: JobCreate, user: dict = Depends(get_current_user)):
    job_doc = {
        "title": job.title,
        "description": job.description,
        "skills": job.skills,
        "experience_min": job.experience_min,
        "experience_max": job.experience_max,
        "location": job.location,
        "job_type": job.job_type,
        "salary_range": job.salary_range,
        "hr_email": job.hr_email,
        "user_id": user["_id"],
        "status": "active",
        "candidates_count": 0,
        "shortlisted_count": 0,
        "screened_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.jobs.insert_one(job_doc)
    job_doc.pop("_id", None)
    job_doc["id"] = str(result.inserted_id)
    return job_doc

@api_router.get("/jobs")
async def list_jobs(user: dict = Depends(get_current_user)):
    jobs = await db.jobs.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(100)
    result = []
    for job in jobs:
        job["id"] = str(job.pop("_id"))
        result.append(job)
    return result

@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"_id": ObjectId(job_id), "user_id": user["_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job["id"] = str(job.pop("_id"))
    return job

@api_router.put("/jobs/{job_id}")
async def update_job(job_id: str, job_update: JobUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in job_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.jobs.update_one(
        {"_id": ObjectId(job_id), "user_id": user["_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job updated"}

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(get_current_user)):
    result = await db.jobs.delete_one({"_id": ObjectId(job_id), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.candidates.delete_many({"job_id": job_id})
    return {"message": "Job deleted"}

# ============ CANDIDATE SOURCING (SIMULATED) ============

SAMPLE_CANDIDATES = [
    {"name": "Priya Sharma", "email": "priya.sharma@email.com", "phone": "+919876543210", "experience": 5, "current_company": "TCS", "location": "Bangalore"},
    {"name": "Rahul Verma", "email": "rahul.verma@email.com", "phone": "+919876543211", "experience": 7, "current_company": "Infosys", "location": "Hyderabad"},
    {"name": "Ananya Patel", "email": "ananya.patel@email.com", "phone": "+919876543212", "experience": 3, "current_company": "Wipro", "location": "Pune"},
    {"name": "Vikram Singh", "email": "vikram.singh@email.com", "phone": "+919876543213", "experience": 8, "current_company": "HCL", "location": "Noida"},
    {"name": "Sneha Reddy", "email": "sneha.reddy@email.com", "phone": "+919876543214", "experience": 4, "current_company": "Accenture", "location": "Chennai"},
    {"name": "Arjun Nair", "email": "arjun.nair@email.com", "phone": "+919876543215", "experience": 6, "current_company": "Cognizant", "location": "Mumbai"},
    {"name": "Kavitha Iyer", "email": "kavitha.iyer@email.com", "phone": "+919876543216", "experience": 9, "current_company": "Mindtree", "location": "Bangalore"},
    {"name": "Deepak Kumar", "email": "deepak.kumar@email.com", "phone": "+919876543217", "experience": 2, "current_company": "Tech Mahindra", "location": "Delhi"},
    {"name": "Meera Gupta", "email": "meera.gupta@email.com", "phone": "+919876543218", "experience": 5, "current_company": "Capgemini", "location": "Gurgaon"},
    {"name": "Rohit Joshi", "email": "rohit.joshi@email.com", "phone": "+919876543219", "experience": 6, "current_company": "LTI", "location": "Pune"},
]

async def generate_ai_match_score(job_skills: List[str], candidate: dict) -> dict:
    """Use Claude to generate a match score and analysis for a candidate"""
    try:
        client = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
        
        prompt = f"""Evaluate this candidate for a job requiring these skills: {', '.join(job_skills)}.
Candidate: {candidate['name']}, {candidate['experience']} years experience at {candidate['current_company']}, located in {candidate['location']}.
Return ONLY valid JSON (no markdown, no code blocks): {{"match_score": <0-100>, "matching_skills": [<list of likely matching skills>], "summary": "<1 sentence>"}}"""
        
        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            system="You are an expert recruiter AI. Evaluate candidate fit and return JSON only.",
            messages=[{"role": "user", "content": prompt}]
        )
        
        text = response.content[0].text.strip()
        # Try to parse JSON from response
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(text)
    except Exception as e:
        logger.error(f"AI scoring error: {e}")
        return {
            "match_score": 65,
            "matching_skills": job_skills[:3] if len(job_skills) >= 3 else job_skills,
            "summary": f"Experienced professional with {candidate['experience']} years in the industry."
        }

@api_router.post("/jobs/{job_id}/source-candidates")
async def source_candidates(job_id: str, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"_id": ObjectId(job_id), "user_id": user["_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    existing = await db.candidates.count_documents({"job_id": job_id})
    if existing > 0:
        raise HTTPException(status_code=400, detail="Candidates already sourced for this job. Delete existing to re-source.")
    
    import random
    num_candidates = random.randint(5, 8)
    selected = random.sample(SAMPLE_CANDIDATES, min(num_candidates, len(SAMPLE_CANDIDATES)))
    
    candidates = []
    for cand in selected:
        ai_result = await generate_ai_match_score(job.get("skills", []), cand)
        candidate_doc = {
            "job_id": job_id,
            "name": cand["name"],
            "email": cand["email"],
            "phone": cand["phone"],
            "experience": cand["experience"],
            "current_company": cand["current_company"],
            "location": cand["location"],
            "source": "LinkedIn (Simulated)",
            "match_score": ai_result.get("match_score", 50),
            "matching_skills": ai_result.get("matching_skills", []),
            "ai_summary": ai_result.get("summary", ""),
            "status": "sourced",
            "screening_status": "pending",
            "call_sid": None,
            "screening_transcript": None,
            "screening_score": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        result = await db.candidates.insert_one(candidate_doc)
        candidate_doc["id"] = str(result.inserted_id)
        candidate_doc.pop("_id", None)
        candidates.append(candidate_doc)
    
    await db.jobs.update_one({"_id": ObjectId(job_id)}, {"$set": {"candidates_count": len(candidates)}})
    return {"message": f"Sourced {len(candidates)} candidates", "candidates": candidates}

@api_router.get("/jobs/{job_id}/candidates")
async def get_candidates(job_id: str, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"_id": ObjectId(job_id), "user_id": user["_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    candidates = await db.candidates.find({"job_id": job_id}).sort("match_score", -1).to_list(100)
    for c in candidates:
        c["id"] = str(c.pop("_id"))
    return candidates

@api_router.get("/candidates/{candidate_id}")
async def get_candidate(candidate_id: str, user: dict = Depends(get_current_user)):
    candidate = await db.candidates.find_one({"_id": ObjectId(candidate_id)})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate["id"] = str(candidate.pop("_id"))
    return candidate

@api_router.put("/candidates/{candidate_id}/status")
async def update_candidate_status(candidate_id: str, req: CandidateStatusUpdate, user: dict = Depends(get_current_user)):
    result = await db.candidates.update_one(
        {"_id": ObjectId(candidate_id)},
        {"$set": {"status": req.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "Status updated"}

# ============ AI SCREENING ============

@api_router.post("/candidates/{candidate_id}/screen")
async def screen_candidate(candidate_id: str, user: dict = Depends(get_current_user)):
    """AI screens the candidate based on job requirements"""
    candidate = await db.candidates.find_one({"_id": ObjectId(candidate_id)})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    job = await db.jobs.find_one({"_id": ObjectId(candidate["job_id"])})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    await db.candidates.update_one({"_id": ObjectId(candidate_id)}, {"$set": {"screening_status": "in_progress"}})
    
    try:
        client = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
        
        prompt = f"""Simulate a phone screening interview for this candidate and provide results.

Job: {job['title']}
Description: {job['description']}
Required Skills: {', '.join(job.get('skills', []))}
Experience Range: {job.get('experience_min', 0)}-{job.get('experience_max', 10)} years

Candidate: {candidate['name']}
Experience: {candidate['experience']} years
Current Company: {candidate['current_company']}
Location: {candidate['location']}
Match Score: {candidate.get('match_score', 'N/A')}

Generate a realistic screening call transcript and evaluation. Return ONLY valid JSON (no markdown, no code blocks):
{{
    "transcript": "<simulated 3-4 Q&A exchange as a string>",
    "screening_score": <0-100>,
    "recommendation": "shortlisted" or "rejected" or "hold",
    "strengths": ["<strength1>", "<strength2>"],
    "weaknesses": ["<weakness1>"],
    "notes": "<brief evaluator notes>"
}}"""
        
        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1500,
            system="You are an expert technical recruiter conducting a screening interview. Be thorough but fair.",
            messages=[{"role": "user", "content": prompt}]
        )
        
        text = response.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        result = json.loads(text)
        
        new_status = result.get("recommendation", "hold")
        screening_score = result.get("screening_score", 50)
        
        await db.candidates.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {
                "screening_status": "completed",
                "status": new_status,
                "screening_score": screening_score,
                "screening_transcript": result.get("transcript", ""),
                "screening_result": {
                    "recommendation": new_status,
                    "strengths": result.get("strengths", []),
                    "weaknesses": result.get("weaknesses", []),
                    "notes": result.get("notes", "")
                },
                "screened_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Update job counts
        if new_status == "shortlisted":
            await db.jobs.update_one({"_id": ObjectId(candidate["job_id"])}, {"$inc": {"shortlisted_count": 1, "screened_count": 1}})
        else:
            await db.jobs.update_one({"_id": ObjectId(candidate["job_id"])}, {"$inc": {"screened_count": 1}})
        
        result["candidate_id"] = candidate_id
        result["status"] = new_status
        return result
    except Exception as e:
        logger.error(f"Screening error: {e}")
        await db.candidates.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {"screening_status": "failed"}}
        )
        raise HTTPException(status_code=500, detail=f"Screening failed: {str(e)}")

# ============ TWILIO CALL INITIATION ============

@api_router.post("/candidates/{candidate_id}/initiate-call")
async def initiate_call(candidate_id: str, req: ScreeningInitiate, user: dict = Depends(get_current_user)):
    """Initiate a Twilio screening call to a candidate"""
    candidate = await db.candidates.find_one({"_id": ObjectId(candidate_id)})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    phone = req.phone_number or candidate.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number available")
    
    twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    twilio_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    twilio_phone = os.environ.get("TWILIO_PHONE_NUMBER", "")
    
    if not twilio_sid or not twilio_token or twilio_phone == "+10000000000":
        # Simulate call if Twilio phone not configured
        logger.info(f"SIMULATED CALL to {phone} for candidate {candidate['name']}")
        await db.candidates.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {"call_sid": f"SIM_{uuid.uuid4()}", "screening_status": "call_simulated"}}
        )
        return {"message": "Call simulated (Twilio phone number not configured)", "call_sid": f"SIM_{uuid.uuid4()}", "simulated": True}
    
    try:
        from twilio.rest import Client
        twilio_client = Client(twilio_sid, twilio_token)
        call = twilio_client.calls.create(
            to=phone,
            from_=twilio_phone,
            twiml="<Response><Say voice='Polly.Joanna'>Hello, this is a screening call from RecruitIT. Thank you for your interest in the position.</Say></Response>",
            status_callback=f"{os.environ.get('BACKEND_URL', '')}/api/screening/callback",
            status_callback_event="initiated ringing answered completed"
        )
        await db.candidates.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {"call_sid": call.sid, "screening_status": "call_initiated"}}
        )
        return {"message": "Call initiated", "call_sid": call.sid, "simulated": False}
    except Exception as e:
        logger.error(f"Twilio call error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate call: {str(e)}")

@api_router.post("/screening/callback")
async def screening_callback(
    CallSid: str = Form(""),
    CallStatus: str = Form(""),
    CallDuration: str = Form("0")
):
    logger.info(f"Twilio callback: SID={CallSid}, Status={CallStatus}, Duration={CallDuration}")
    if CallSid:
        await db.candidates.update_one(
            {"call_sid": CallSid},
            {"$set": {"call_status": CallStatus, "call_duration": CallDuration}}
        )
    return Response(status_code=200)

# ============ EMAIL (MOCKED SENDGRID) ============

@api_router.post("/jobs/{job_id}/send-shortlisted")
async def send_shortlisted(job_id: str, req: SendShortlistedRequest, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"_id": ObjectId(job_id), "user_id": user["_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    shortlisted = await db.candidates.find({"job_id": job_id, "status": "shortlisted"}).to_list(100)
    if not shortlisted:
        raise HTTPException(status_code=400, detail="No shortlisted candidates to send")
    
    candidates_list = []
    for c in shortlisted:
        candidates_list.append({
            "name": c["name"],
            "email": c["email"],
            "phone": c.get("phone", ""),
            "experience": c.get("experience", 0),
            "match_score": c.get("match_score", 0),
            "screening_score": c.get("screening_score", 0),
            "current_company": c.get("current_company", "")
        })
    
    sendgrid_key = os.environ.get("SENDGRID_API_KEY", "")
    if sendgrid_key and sendgrid_key != "MOCK_KEY":
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
            
            html_content = f"<h2>Shortlisted Candidates for: {job['title']}</h2><table border='1' cellpadding='8'>"
            html_content += "<tr><th>Name</th><th>Email</th><th>Experience</th><th>Match Score</th><th>Screening Score</th></tr>"
            for c in candidates_list:
                html_content += f"<tr><td>{c['name']}</td><td>{c['email']}</td><td>{c['experience']} yrs</td><td>{c['match_score']}%</td><td>{c['screening_score']}/100</td></tr>"
            html_content += "</table>"
            
            message = Mail(
                from_email=os.environ.get("SENDER_EMAIL", "noreply@recruitit.com"),
                to_emails=req.hr_email,
                subject=f"Shortlisted Candidates - {job['title']}",
                html_content=html_content
            )
            sg = SendGridAPIClient(sendgrid_key)
            sg.send(message)
            logger.info(f"Email sent to {req.hr_email}")
        except Exception as e:
            logger.error(f"SendGrid error: {e}")
    else:
        logger.info(f"[MOCKED EMAIL] Would send {len(candidates_list)} shortlisted candidates to {req.hr_email}")
    
    return {"message": f"Shortlisted candidates ({len(candidates_list)}) sent to {req.hr_email}", "candidates": candidates_list, "email_sent": sendgrid_key != "MOCK_KEY"}

# ============ STRIPE SUBSCRIPTION ============

SUBSCRIPTION_PLANS = {
    "starter": {"name": "Starter", "amount": 29.00, "jobs_limit": 5, "candidates_per_job": 20},
    "professional": {"name": "Professional", "amount": 79.00, "jobs_limit": 25, "candidates_per_job": 100},
    "enterprise": {"name": "Enterprise", "amount": 199.00, "jobs_limit": -1, "candidates_per_job": -1}
}

@api_router.post("/subscription/checkout")
async def create_checkout(req: CheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    plan = SUBSCRIPTION_PLANS.get(req.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    stripe_key = os.environ.get("STRIPE_API_KEY", "")
    if not stripe_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    stripe.api_key = stripe_key
    host_url = req.origin_url.rstrip("/")
    
    success_url = f"{host_url}/settings?session_id={{CHECKOUT_SESSION_ID}}&payment=success"
    cancel_url = f"{host_url}/settings?payment=cancelled"
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": plan["name"],
                        "description": f"RecruitIT {plan['name']} Plan"
                    },
                    "unit_amount": int(plan["amount"] * 100)  # Stripe uses cents
                },
                "quantity": 1
            }],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": str(user["_id"]), "plan_id": req.plan_id, "plan_name": plan["name"]}
        )
        
        await db.payment_transactions.insert_one({
            "session_id": session.id,
            "user_id": user["_id"],
            "plan_id": req.plan_id,
            "amount": plan["amount"],
            "currency": "usd",
            "payment_status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"url": session.url, "session_id": session.id}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")

@api_router.get("/subscription/status/{session_id}")
async def check_subscription_status(session_id: str, user: dict = Depends(get_current_user)):
    stripe_key = os.environ.get("STRIPE_API_KEY", "")
    if not stripe_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    stripe.api_key = stripe_key
    
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        
        if session.payment_status == "paid" and tx and tx.get("payment_status") != "paid":
            plan_id = tx.get("plan_id", "starter")
            plan = SUBSCRIPTION_PLANS.get(plan_id, SUBSCRIPTION_PLANS["starter"])
            
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
            )
            await db.users.update_one(
                {"_id": ObjectId(tx["user_id"])},
                {"$set": {"subscription": {"plan": plan_id, "status": "active", "plan_name": plan["name"]}}}
            )
        
        return {
            "status": session.status,
            "payment_status": session.payment_status,
            "amount_total": session.amount_total,
            "currency": session.currency
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail=f"Payment lookup error: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    endpoint_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    
    if not endpoint_secret:
        logger.warning("Stripe webhook secret not configured")
        return {"status": "ok"}
    
    logger.info(f"Stripe webhook received")
    
    try:
        stripe.api_key = os.environ.get("STRIPE_API_KEY", "")
        event = stripe.Webhook.construct_event(body, sig, endpoint_secret)
        
        # Handle checkout.session.completed event
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            if session["payment_status"] == "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session["id"]},
                    {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
                )
                logger.info(f"Payment confirmed for session: {session['id']}")
        
        logger.info(f"Webhook processed: {event['type']}")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Webhook signature verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe webhook error: {e}")
    except Exception as e:
        logger.error(f"Webhook error: {e}")
    
    return {"status": "ok"}

# ============ PASSWORD RESET ============

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        # Return success even if user doesn't exist (security best practice)
        return {"message": "If an account with that email exists, a reset link has been sent.", "token": None}
    
    reset_token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "user_id": str(user["_id"]),
        "token": reset_token,
        "email": email,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "used": False
    })
    
    logger.info(f"Password reset token for {email}: {reset_token}")
    
    # Send email via SendGrid if configured
    sendgrid_key = os.environ.get("SENDGRID_API_KEY", "")
    if sendgrid_key and sendgrid_key != "MOCK_KEY":
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
            message = Mail(
                from_email=os.environ.get("SENDER_EMAIL", "noreply@recruitit.com"),
                to_emails=email,
                subject="RecruitIT - Password Reset",
                html_content=f"<h2>Password Reset</h2><p>Use this token to reset your password: <strong>{reset_token}</strong></p><p>This token expires in 1 hour.</p>"
            )
            sg = SendGridAPIClient(sendgrid_key)
            sg.send(message)
        except Exception as e:
            logger.error(f"SendGrid error: {e}")
    else:
        logger.info(f"[MOCKED EMAIL] Password reset token for {email}: {reset_token}")
    
    return {"message": "If an account with that email exists, a reset link has been sent.", "token": reset_token}

@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    token_doc = await db.password_reset_tokens.find_one({"token": req.token, "used": False}, {"_id": 0})
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    expires_at = datetime.fromisoformat(token_doc["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    new_hash = hash_password(req.new_password)
    await db.users.update_one(
        {"_id": ObjectId(token_doc["user_id"])},
        {"$set": {"password_hash": new_hash}}
    )
    await db.password_reset_tokens.update_one({"token": req.token}, {"$set": {"used": True}})
    
    return {"message": "Password reset successfully. You can now log in with your new password."}

# ============ DASHBOARD ============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    total_jobs = await db.jobs.count_documents({"user_id": user["_id"]})
    active_jobs = await db.jobs.count_documents({"user_id": user["_id"], "status": "active"})
    
    user_jobs = await db.jobs.find({"user_id": user["_id"]}, {"_id": 1}).to_list(100)
    job_ids = [str(j["_id"]) for j in user_jobs]
    
    total_candidates = await db.candidates.count_documents({"job_id": {"$in": job_ids}})
    shortlisted = await db.candidates.count_documents({"job_id": {"$in": job_ids}, "status": "shortlisted"})
    screened = await db.candidates.count_documents({"job_id": {"$in": job_ids}, "screening_status": "completed"})
    pending_screening = await db.candidates.count_documents({"job_id": {"$in": job_ids}, "screening_status": "pending"})
    
    recent_jobs = await db.jobs.find({"user_id": user["_id"]}).sort("created_at", -1).limit(5).to_list(5)
    for j in recent_jobs:
        j["id"] = str(j.pop("_id"))
    
    recent_candidates = await db.candidates.find({"job_id": {"$in": job_ids}}).sort("created_at", -1).limit(5).to_list(5)
    for c in recent_candidates:
        c["id"] = str(c.pop("_id"))
    
    return {
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_candidates": total_candidates,
        "shortlisted": shortlisted,
        "screened": screened,
        "pending_screening": pending_screening,
        "recent_jobs": recent_jobs,
        "recent_candidates": recent_candidates
    }

# ============ ANALYTICS ============

@api_router.get("/analytics")
async def get_analytics(user: dict = Depends(get_current_user)):
    user_jobs = await db.jobs.find({"user_id": user["_id"]}).to_list(200)
    job_ids = [str(j["_id"]) for j in user_jobs]
    
    all_candidates = await db.candidates.find({"job_id": {"$in": job_ids}}).to_list(1000)
    
    # 1. Pipeline funnel
    total = len(all_candidates)
    screened = sum(1 for c in all_candidates if c.get("screening_status") == "completed")
    shortlisted = sum(1 for c in all_candidates if c.get("status") == "shortlisted")
    rejected = sum(1 for c in all_candidates if c.get("status") == "rejected")
    on_hold = sum(1 for c in all_candidates if c.get("status") == "hold")
    
    pipeline_funnel = [
        {"stage": "Sourced", "count": total},
        {"stage": "Screened", "count": screened},
        {"stage": "Shortlisted", "count": shortlisted},
        {"stage": "On Hold", "count": on_hold},
        {"stage": "Rejected", "count": rejected},
    ]
    
    # 2. Candidates per job
    candidates_per_job = []
    for job in user_jobs:
        jid = str(job["_id"])
        job_cands = [c for c in all_candidates if c.get("job_id") == jid]
        job_shortlisted = sum(1 for c in job_cands if c.get("status") == "shortlisted")
        candidates_per_job.append({
            "job": job["title"][:25],
            "total": len(job_cands),
            "shortlisted": job_shortlisted,
            "screened": sum(1 for c in job_cands if c.get("screening_status") == "completed"),
        })
    
    # 3. Match score distribution
    score_buckets = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for c in all_candidates:
        score = c.get("match_score", 0)
        if score <= 20: score_buckets["0-20"] += 1
        elif score <= 40: score_buckets["21-40"] += 1
        elif score <= 60: score_buckets["41-60"] += 1
        elif score <= 80: score_buckets["61-80"] += 1
        else: score_buckets["81-100"] += 1
    
    match_score_distribution = [{"range": k, "count": v} for k, v in score_buckets.items()]
    
    # 4. Screening score distribution
    screening_scores = []
    for c in all_candidates:
        if c.get("screening_score") is not None:
            screening_scores.append({
                "name": c.get("name", "")[:15],
                "screening_score": c.get("screening_score", 0),
                "match_score": c.get("match_score", 0),
            })
    screening_scores.sort(key=lambda x: x["screening_score"], reverse=True)
    
    # 5. Status breakdown (pie chart data)
    status_counts = {}
    for c in all_candidates:
        s = c.get("status", "sourced")
        status_counts[s] = status_counts.get(s, 0) + 1
    status_breakdown = [{"status": k.capitalize(), "count": v} for k, v in status_counts.items()]
    
    # 6. Source breakdown
    source_counts = {}
    for c in all_candidates:
        src = c.get("source", "Unknown")
        source_counts[src] = source_counts.get(src, 0) + 1
    source_breakdown = [{"source": k, "count": v} for k, v in source_counts.items()]
    
    # 7. Experience distribution
    exp_buckets = {"0-2 yrs": 0, "3-5 yrs": 0, "6-8 yrs": 0, "9+ yrs": 0}
    for c in all_candidates:
        exp = c.get("experience", 0)
        if exp <= 2: exp_buckets["0-2 yrs"] += 1
        elif exp <= 5: exp_buckets["3-5 yrs"] += 1
        elif exp <= 8: exp_buckets["6-8 yrs"] += 1
        else: exp_buckets["9+ yrs"] += 1
    experience_distribution = [{"range": k, "count": v} for k, v in exp_buckets.items()]
    
    # 8. Top performers
    top_performers = sorted(
        [c for c in all_candidates if c.get("screening_score") is not None],
        key=lambda x: x.get("screening_score", 0),
        reverse=True
    )[:10]
    top_performers_list = []
    for c in top_performers:
        top_performers_list.append({
            "name": c.get("name", ""),
            "screening_score": c.get("screening_score", 0),
            "match_score": c.get("match_score", 0),
            "status": c.get("status", ""),
            "current_company": c.get("current_company", ""),
        })
    
    return {
        "pipeline_funnel": pipeline_funnel,
        "candidates_per_job": candidates_per_job,
        "match_score_distribution": match_score_distribution,
        "screening_scores": screening_scores[:15],
        "status_breakdown": status_breakdown,
        "source_breakdown": source_breakdown,
        "experience_distribution": experience_distribution,
        "top_performers": top_performers_list,
        "summary": {
            "total_candidates": total,
            "total_jobs": len(user_jobs),
            "avg_match_score": round(sum(c.get("match_score", 0) for c in all_candidates) / max(total, 1), 1),
            "avg_screening_score": round(sum(c.get("screening_score", 0) for c in all_candidates if c.get("screening_score")) / max(screened, 1), 1),
            "shortlist_rate": round(shortlisted / max(total, 1) * 100, 1),
        }
    }

# ============ STARTUP ============

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.email_verification_tokens.create_index("token")
    await db.candidates.create_index("job_id")
    await db.payment_transactions.create_index("session_id")
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@recruitit.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "company": "RecruitIT",
            "role": "admin",
            "email_verified": True,
            "subscription": {"plan": "enterprise", "status": "active", "plan_name": "Enterprise"},
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
    
    # Write test credentials
    import os as _os
    _os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n- POST /api/auth/verify-email-json\n")
    logger.info("Test credentials written")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
