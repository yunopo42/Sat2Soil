from fastapi import APIRouter

from app.api.v1.nasa import router as nasa_router

router = APIRouter(prefix="/v1")
router.include_router(nasa_router)
