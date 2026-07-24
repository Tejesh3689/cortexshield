import subprocess
import sys
import os
import time
import httpx

def wait_for_services():
    print("Checking if proxy-engine is up at http://localhost:8000/health...")
    for _ in range(15):
        try:
            r = httpx.get("http://localhost:8000/health", timeout=2.0)
            if r.status_code == 200:
                print("Services are healthy!")
                return True
        except Exception:
            pass
        time.sleep(2)
    print("Services failed to become healthy. Aborting.")
    return False

def run_tests():
    print("Running end-to-end redteam suite via pytest...")
    # Ensure tests/redteam is run
    result = subprocess.run(["pytest", "tests/redteam/", "-v"], cwd=os.path.dirname(os.path.dirname(__file__)))
    if result.returncode != 0:
        print("REDTEAM SUITE FAILED! Security regressions detected.")
        sys.exit(1)
    else:
        print("REDTEAM SUITE PASSED. All security constraints hold.")
        sys.exit(0)

if __name__ == "__main__":
    if not wait_for_services():
        sys.exit(1)
    run_tests()
