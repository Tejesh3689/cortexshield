import os
import asyncio
from fastapi import FastAPI
from fastapi.responses import FileResponse
from .bundle_builder import build_bundle_if_changed, BUNDLE_DIR

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    # Removed init_db() call. The schema is fully managed by Alembic in Milestone 2.
    await build_bundle_if_changed()
    asyncio.create_task(poll_for_changes())
    
async def poll_for_changes():
    interval = int(os.getenv("OPA_BUNDLE_POLL_INTERVAL_SECONDS", "5"))
    while True:
        await asyncio.sleep(interval)
        try:
            await build_bundle_if_changed()
        except Exception as e:
            import logging
            logging.error(f"Error rebuilding bundle: {e}")

@app.get("/bundles/bundle.tar.gz")
async def get_bundle():
    bundle_path = os.path.join(BUNDLE_DIR, "bundle.tar.gz")
    return FileResponse(bundle_path, media_type="application/gzip")
