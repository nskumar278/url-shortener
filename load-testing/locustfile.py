import random
import string
import time
from locust import HttpUser, task, between
from locust.exception import StopUser

class URLShortenerUser(HttpUser):
    wait_time = between(0.1, 0.5)  # Wait 100-500ms between requests
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.created_urls = []
        self.base_url = "http://localhost"
    
    def on_start(self):
        """Called when a user starts"""
        # Create some initial URLs for this user
        for _ in range(5):
            self.create_short_url()
    
    def generate_long_url(self):
        """Generate a random long URL"""
        domains = ["example.com", "test.org", "demo.net", "sample.co"]
        paths = ["".join(random.choices(string.ascii_lowercase, k=10)) for _ in range(3)]
        domain = random.choice(domains)
        path = "/".join(paths)
        return f"https://{domain}/{path}?param={random.randint(1000, 9999)}"
    
    @task(3)  # 30% of requests - create short URLs
    def create_short_url(self):
        """Test URL shortening endpoint"""
        long_url = self.generate_long_url()
        
        with self.client.post("/api/v1/urls/", 
                            json={"originalUrl": long_url},
                            headers={"Content-Type": "application/json"},
                            catch_response=True) as response:
            
            if response.status_code == 201:
                try:
                    data = response.json()
                    short_url_id = data.get("data", {}).get("shortUrlId")
                    if short_url_id:
                        self.created_urls.append(short_url_id)
                        response.success()
                    else:
                        response.failure("No shortUrlId in response")
                except Exception as e:
                    response.failure(f"Invalid JSON response: {e}")
            else:
                response.failure(f"Expected 201, got {response.status_code}")
    
    @task(7)  # 70% of requests - redirect URLs (most common operation)
    def redirect_short_url(self):
        """Test URL redirection - the most performance-critical operation"""
        if not self.created_urls:
            self.create_short_url()
            return
        
        short_url_id = random.choice(self.created_urls)
        
        with self.client.get(f"/{short_url_id}", 
                           allow_redirects=False,
                           catch_response=True) as response:
            
            if response.status_code in [301, 302]:
                # Measure redirect latency
                if response.elapsed.total_seconds() > 0.05:  # 50ms threshold
                    response.failure(f"Redirect too slow: {response.elapsed.total_seconds():.3f}s")
                else:
                    response.success()
            elif response.status_code == 404:
                response.failure("URL not found")
            else:
                response.failure(f"Expected 301/302, got {response.status_code}")

    @task(1)  # 10% of requests - get URL stats
    def get_url_stats(self):
        """Test URL statistics endpoint"""
        if not self.created_urls:
            return
        
        short_url_id = random.choice(self.created_urls)
        
        with self.client.get(f"/api/v1/urls/{short_url_id}",
                           catch_response=True) as response:
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "data" in data and "clickCount" in data["data"]:
                        response.success()
                    else:
                        response.failure("Missing clickCount in response data")
                except Exception as e:
                    response.failure(f"Invalid JSON response: {e}")
            else:
                response.failure(f"Expected 200, got {response.status_code}")

class HighLoadUser(URLShortenerUser):
    """User for stress testing with higher frequency"""
    wait_time = between(0.01, 0.1)  # Very aggressive - 10-100ms between requests

class CacheWarmupUser(HttpUser):
    """User specifically for cache warmup"""
    wait_time = between(0.05, 0.2)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.popular_urls = []
    
    def on_start(self):
        """Create some URLs that will be accessed frequently"""
        for i in range(20):
            long_url = f"https://popular-site.com/page-{i}"
            response = self.client.post("/api/v1/urls/", 
                                      json={"originalUrl": long_url})
            if response.status_code == 201:
                data = response.json()
                short_url_id = data.get("data", {}).get("shortUrlId")
                if short_url_id:
                    self.popular_urls.append(short_url_id)
    
    @task(10)
    def access_popular_urls(self):
        """Repeatedly access the same URLs to build cache"""
        if self.popular_urls:
            short_url_id = random.choice(self.popular_urls)
            self.client.get(f"/{short_url_id}", allow_redirects=False)
