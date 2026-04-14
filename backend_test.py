#!/usr/bin/env python3
"""
RecruitIT Backend API Test Suite
Tests all API endpoints for the AI-powered recruitment platform
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class RecruitITAPITester:
    def __init__(self, base_url: str = "https://recruit-agent-2.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.access_token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data
        self.test_user_email = f"testuser_{int(time.time())}@test.com"
        self.test_user_password = "TestPass123!"
        self.admin_email = "admin@recruitit.com"
        self.admin_password = "Admin@123"
        
    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    expected_status: int = 200, use_auth: bool = True) -> tuple[bool, Dict]:
        """Make API request and validate response"""
        url = f"{self.base_url}/api/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if use_auth and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text, "status_code": response.status_code}
            
            return success, response_data
            
        except Exception as e:
            return False, {"error": str(e)}
    
    def test_auth_register(self):
        """Test user registration"""
        data = {
            "name": "Test User",
            "email": self.test_user_email,
            "password": self.test_user_password,
            "company": "Test Company"
        }
        
        success, response = self.make_request("POST", "/auth/register", data, 200, use_auth=False)
        
        if success and "id" in response:
            self.log_test("User Registration", True, f"User ID: {response['id']}")
            return response
        else:
            self.log_test("User Registration", False, f"Response: {response}")
            return None
    
    def test_auth_login_admin(self):
        """Test admin login"""
        data = {
            "email": self.admin_email,
            "password": self.admin_password
        }
        
        success, response = self.make_request("POST", "/auth/login", data, 200, use_auth=False)
        
        if success and "id" in response:
            self.user_data = response
            # Extract token from cookies if available
            if 'Set-Cookie' in self.session.cookies:
                for cookie in self.session.cookies:
                    if cookie.name == 'access_token':
                        self.access_token = cookie.value
            self.log_test("Admin Login", True, f"Admin ID: {response['id']}")
            return True
        else:
            self.log_test("Admin Login", False, f"Response: {response}")
            return False
    
    def test_auth_login_user(self):
        """Test user login"""
        data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        success, response = self.make_request("POST", "/auth/login", data, 200, use_auth=False)
        
        if success and "id" in response:
            self.user_data = response
            self.log_test("User Login", True, f"User ID: {response['id']}")
            return True
        else:
            self.log_test("User Login", False, f"Response: {response}")
            return False
    
    def test_auth_me(self):
        """Test get current user"""
        success, response = self.make_request("GET", "/auth/me", expected_status=200)
        
        if success and "id" in response:
            self.log_test("Get Current User", True, f"User: {response.get('name', 'Unknown')}")
            return response
        else:
            self.log_test("Get Current User", False, f"Response: {response}")
            return None
    
    def test_auth_logout(self):
        """Test logout"""
        success, response = self.make_request("POST", "/auth/logout", expected_status=200)
        
        if success:
            self.access_token = None
            self.log_test("Logout", True)
            return True
        else:
            self.log_test("Logout", False, f"Response: {response}")
            return False
    
    def test_create_job(self):
        """Test job creation"""
        data = {
            "title": "Senior Python Developer",
            "description": "Looking for an experienced Python developer with FastAPI knowledge",
            "skills": ["Python", "FastAPI", "MongoDB", "React"],
            "experience_min": 3,
            "experience_max": 8,
            "location": "Remote",
            "job_type": "full-time",
            "salary_range": "$80,000 - $120,000",
            "hr_email": "hr@test.com"
        }
        
        success, response = self.make_request("POST", "/jobs", data, 200)
        
        if success and "id" in response:
            self.log_test("Create Job", True, f"Job ID: {response['id']}")
            return response
        else:
            self.log_test("Create Job", False, f"Response: {response}")
            return None
    
    def test_list_jobs(self):
        """Test job listing"""
        success, response = self.make_request("GET", "/jobs", expected_status=200)
        
        if success and isinstance(response, list):
            self.log_test("List Jobs", True, f"Found {len(response)} jobs")
            return response
        else:
            self.log_test("List Jobs", False, f"Response: {response}")
            return None
    
    def test_get_job(self, job_id: str):
        """Test get specific job"""
        success, response = self.make_request("GET", f"/jobs/{job_id}", expected_status=200)
        
        if success and "id" in response:
            self.log_test("Get Job Details", True, f"Job: {response.get('title', 'Unknown')}")
            return response
        else:
            self.log_test("Get Job Details", False, f"Response: {response}")
            return None
    
    def test_source_candidates(self, job_id: str):
        """Test candidate sourcing"""
        success, response = self.make_request("POST", f"/jobs/{job_id}/source-candidates", expected_status=200)
        
        if success and "candidates" in response:
            candidates_count = len(response["candidates"])
            self.log_test("Source Candidates", True, f"Sourced {candidates_count} candidates")
            return response["candidates"]
        else:
            self.log_test("Source Candidates", False, f"Response: {response}")
            return None
    
    def test_get_candidates(self, job_id: str):
        """Test get candidates for job"""
        success, response = self.make_request("GET", f"/jobs/{job_id}/candidates", expected_status=200)
        
        if success and isinstance(response, list):
            self.log_test("Get Candidates", True, f"Found {len(response)} candidates")
            return response
        else:
            self.log_test("Get Candidates", False, f"Response: {response}")
            return None
    
    def test_screen_candidate(self, candidate_id: str):
        """Test AI candidate screening"""
        success, response = self.make_request("POST", f"/candidates/{candidate_id}/screen", expected_status=200)
        
        if success and "screening_score" in response:
            score = response.get("screening_score", 0)
            recommendation = response.get("recommendation", "unknown")
            self.log_test("AI Screen Candidate", True, f"Score: {score}, Recommendation: {recommendation}")
            return response
        else:
            self.log_test("AI Screen Candidate", False, f"Response: {response}")
            return None
    
    def test_initiate_call(self, candidate_id: str):
        """Test Twilio call initiation"""
        data = {"phone_number": "+1234567890"}
        success, response = self.make_request("POST", f"/candidates/{candidate_id}/initiate-call", data, expected_status=200)
        
        if success and "call_sid" in response:
            simulated = response.get("simulated", False)
            self.log_test("Initiate Call", True, f"Call SID: {response['call_sid']}, Simulated: {simulated}")
            return response
        else:
            self.log_test("Initiate Call", False, f"Response: {response}")
            return None
    
    def test_send_shortlisted(self, job_id: str):
        """Test sending shortlisted candidates email"""
        data = {"hr_email": "hr@test.com"}
        success, response = self.make_request("POST", f"/jobs/{job_id}/send-shortlisted", data, expected_status=200)
        
        if success and "candidates" in response:
            email_sent = response.get("email_sent", False)
            candidates_count = len(response["candidates"])
            self.log_test("Send Shortlisted Email", True, f"Sent {candidates_count} candidates, Email sent: {email_sent}")
            return response
        else:
            self.log_test("Send Shortlisted Email", False, f"Response: {response}")
            return None
    
    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.make_request("GET", "/dashboard/stats", expected_status=200)
        
        if success and "total_jobs" in response:
            stats = f"Jobs: {response.get('total_jobs', 0)}, Candidates: {response.get('total_candidates', 0)}"
            self.log_test("Dashboard Stats", True, stats)
            return response
        else:
            self.log_test("Dashboard Stats", False, f"Response: {response}")
            return None
    
    def test_subscription_checkout(self):
        """Test Stripe subscription checkout"""
        data = {
            "plan_id": "starter",
            "origin_url": "https://recruit-agent-2.preview.emergentagent.com"
        }
        success, response = self.make_request("POST", "/subscription/checkout", data, expected_status=200)
        
        if success and "url" in response:
            self.log_test("Subscription Checkout", True, f"Checkout URL created")
            return response
        else:
            self.log_test("Subscription Checkout", False, f"Response: {response}")
            return None
    
    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print(f"🚀 Starting RecruitIT API Tests - {datetime.now()}")
        print(f"🔗 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test 1: Admin Login
        if not self.test_auth_login_admin():
            print("❌ Admin login failed - stopping tests")
            return False
        
        # Test 2: Get current user
        self.test_auth_me()
        
        # Test 3: Create a job
        job = self.test_create_job()
        if not job:
            print("❌ Job creation failed - stopping tests")
            return False
        
        job_id = job["id"]
        
        # Test 4: List jobs
        self.test_list_jobs()
        
        # Test 5: Get job details
        self.test_get_job(job_id)
        
        # Test 6: Source candidates
        candidates = self.test_source_candidates(job_id)
        if not candidates:
            print("❌ Candidate sourcing failed - stopping tests")
            return False
        
        # Test 7: Get candidates
        self.test_get_candidates(job_id)
        
        # Test 8: Screen a candidate
        if candidates:
            candidate_id = candidates[0]["id"]
            screening_result = self.test_screen_candidate(candidate_id)
            
            # Test 9: Initiate call
            self.test_initiate_call(candidate_id)
            
            # Test 10: Send shortlisted (if candidate was shortlisted)
            if screening_result and screening_result.get("recommendation") == "shortlisted":
                time.sleep(1)  # Brief pause
                self.test_send_shortlisted(job_id)
        
        # Test 11: Dashboard stats
        self.test_dashboard_stats()
        
        # Test 12: Subscription checkout
        self.test_subscription_checkout()
        
        # Test 13: User registration
        self.test_auth_register()
        
        # Test 14: User login
        self.test_auth_login_user()
        
        # Test 15: Logout
        self.test_auth_logout()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r["success"]]
        if failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        print("=" * 60)

def main():
    """Main test execution"""
    tester = RecruitITAPITester()
    
    try:
        success = tester.run_comprehensive_test()
        tester.print_summary()
        
        # Return appropriate exit code
        if tester.tests_passed == tester.tests_run:
            print("🎉 All tests passed!")
            return 0
        elif tester.tests_passed > 0:
            print("⚠️  Some tests failed")
            return 1
        else:
            print("💥 All tests failed")
            return 2
            
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        return 130
    except Exception as e:
        print(f"\n💥 Test execution failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())