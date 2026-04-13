# Bsharp Reco — Autonomous Multi-Agent System

## Agents

- Builder → agents/builder.md
- Validator → agents/validator.md
- Orchestrator → agents/orchestrator.md

---

## Source of Truth

- docs/Bsharp_Reco_Build_Plan.md
- docs/Bsharp_Reco_FSD_v3_Final.md
- docs/Bsharp_Reco_Architecture_v5_Final.md

---

## Execution Model

- Phase-based execution (0 → 16)
- Each phase MUST PASS validation before next begins
- Strict Builder → Validator → Orchestrator loop

---

## State Management

- progress.md → tracks execution state
- .handoff/ → communication between agents

---

## Core Constraints

- Angular login via Converse system
- Django backend with DRF
- React frontend with API integration
- Session-based authentication
- OpenSearch for RAG
- Whisper for STT
- Bedrock for LLM

---

## Rules

- No skipping phases
- No partial validation
- No progression without PASS
- Strict adherence to docs