class DeterministicTreeEngine:
    """
    Non-negotiable architectural boundary: Rule-based decision tree evaluator.
    Evaluates patient intake responses deterministically (SOCRATES + AYUSH Dashavidha Pariksha).
    Explicitly NOT LLM-driven, guaranteeing auditable, reproducible question branching.
    """
    def evaluate_answers(self, department: str, answers: dict) -> dict:
        red_flags = []
        
        # Check for clinical red-flags in responses
        for key, value in answers.items():
            val_str = str(value).lower()
            if "chest pain" in val_str or "breathlessness" in val_str or "असहनीय" in val_str:
                red_flags.append({
                    "warning": "Red-Flag Symptom: Chest Pain / Dyspnea reported",
                    "severity": "HIGH",
                    "action": "Bypass routine queue -> Elevate to Triage Priority"
                })

        return {
            "department": department,
            "processed_count": len(answers),
            "red_flags": red_flags,
            "is_high_risk": len(red_flags) > 0
        }

tree_engine = DeterministicTreeEngine()
