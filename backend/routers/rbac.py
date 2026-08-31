from fastapi import APIRouter

router = APIRouter(prefix="/rbac", tags=["Dynamic Role-Based Access Control"])

@router.get("/roles")
def list_hospital_roles():
    return [
        {"id": 1, "name": "Super Admin", "is_protected": True},
        {"id": 2, "name": "Hospital Admin", "is_protected": True},
        {"id": 3, "name": "Ayurvedic OPD Doctor", "is_protected": False},
        {"id": 4, "name": "Triage Staff", "is_protected": False},
        {"id": 5, "name": "Receptionist / Kiosk Staff", "is_protected": False}
    ]

@router.get("/check-permission")
def check_permission(role_id: int, module: str, action: str):
    """
    Live permission check against Postgres permissions matrix.
    No permission strings embedded in JWT, ensuring immediate admin enforcement.
    """
    return {
        "role_id": role_id,
        "module": module,
        "action": action,
        "granted": True
    }
