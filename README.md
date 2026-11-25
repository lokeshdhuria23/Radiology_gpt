# RadiologyGPT — Multimodal Clinical Decision Support System (CDSS)

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20pgvector-3ECF8E.svg?logo=supabase)](https://supabase.com/)
[![BiomedCLIP](https://img.shields.io/badge/Vision_Encoder-Microsoft%20BiomedCLIP-orange.svg)](https://huggingface.co/microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224)
[![Groq Cloud](https://img.shields.io/badge/Reasoning_LLM-Groq%20120B-f55036.svg)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> ⚠️ **Clinical Safety Disclaimer**: RadiologyGPT is an intelligent **Clinical Decision Support System (CDSS)** engineered to assist healthcare practitioners with document transcription, multimodal feature extraction, and preliminary decision-support insights. It is strictly **not** an autonomous diagnostic device. All AI recommendations, SOAP documentation, and prescription suggestions must be reviewed, validated, and signed off by a licensed medical practitioner.

---

## 📖 Overview

**RadiologyGPT** is an enterprise-ready, multimodal Clinical Decision Support System designed for modern healthcare environments. Combining state-of-the-art vision encoders (**Microsoft BiomedCLIP**), high-reasoning clinical language models (**Groq 120B / BioMistral**), and high-precision **OCR pipelines**, the platform bridges the gap between diagnostic imaging, clinical pathology reports, and real-time clinical workflows.

The system features dedicated **Doctor Clinical Workstations** and isolated, patient-specific **Patient Portals**, backed by a resilient multi-agent architecture and Supabase vector database for retrieval-augmented generation (RAG).

---

## 🌟 Key Capabilities

### 🩻 1. Multimodal AI Diagnostic Lab
- **Batch Multi-Image Ingestion**: Upload and analyze multiple thoracic radiographs, CT scans, and diagnostic documents simultaneously.
- **Biomedical Vision Pipeline**: Powered by **Microsoft BiomedCLIP** with domain-adapted projection heads to extract fine-grained visual indicators (cardiomegaly, pleural effusion, consolidations, pulmonary infiltrates, surgical hardware).
- **Interactive Previews**: High-resolution image inspection, zoom controls, and batch submission directly into the AI diagnostic pipeline.

### 🔬 2. Automated Clinical Laboratory & Document OCR
- **High-Precision Data Extraction**: Integrated **RapidOCR** and **PyMuPDF** pipelines extract tabular data from complete blood count (CBC) panels, metabolic tests, and inflammatory markers (CRP, Procalcitonin, ESR).
- **Automated Anomaly Detection**: Parses lab values against clinical reference intervals, instantly tagging abnormal elevations or deficiencies (`HIGH`, `LOW`, `CRITICAL`).

### 🤖 3. Autonomous Multi-Agent Swarm
RadiologyGPT deploys 6 specialized AI agents orchestrated asynchronously:

| Agent | Responsibilities |
|---|---|
| **Perception & OCR Agent** | Extracts and standardizes text, tables, and visual tokens from uploaded scans and documents. |
| **Longitudinal History Agent** | Tracks patient clinical trajectory, compares prior checkups, and detects longitudinal shifts in health. |
| **Clinical Safety & Guardrails Agent** | Deterministic rule-based checks for drug-drug interactions, allergy conflicts, duplicate medications, and hazardous dosages. |
| **Intake & Scribe Agent** | Synthesizes unstructured clinical data into clean, structured **SOAP Notes** (Subjective, Objective, Assessment, Plan). |
| **Specialist CDS Agent** | Applies specialty-specific diagnostic criteria (Cardiology, Radiology, Internal Medicine, Neurology). |
| **Medical Translation Agent** | Converts complex medical documentation into accessible, clear instructions for patients. |

### 📅 4. Consolidated Longitudinal Daily Care Trajectory
- **Same-Day Visit Consolidation**: When a patient has multiple consultations or diagnostic scans on the same calendar day, RadiologyGPT automatically consolidates all findings, laboratory panels, imaging studies, and physician orders into one comprehensive daily care summary.
- **Smart Medication Deduplication**: Prevents duplicate drug entries on the same day; newly modified dosages or routes update existing entries while maintaining duration and instructions.

### 🏥 5. Role-Based Portals & Privacy Isolation
- **Doctor Workstation**:
  - Full longitudinal timeline of all previous patient visits.
  - Multi-image AI Diagnostic Lab for thoracic imaging and lab panels.
  - Dynamic prescription builder with manual custom entry, dosage/route selection, and automated safety validation.
  - Collapsible accordion cards for structured day narratives, radiology results, and clinical laboratory panels.
- **Patient Portal**:
  - **Zero Cross-Patient Exposure**: Access strictly locked to the authenticated patient's profile and records.
  - Clear, accessible timeline of active medications, dosages, frequency, and doctor instructions.
  - Interactive **AI Health Assistant** powered by a clinical knowledge base (CBC reference standards, blood pressure guidelines, fever protocols, and home-care precautions).

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER                                         │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│         Doctor Clinical Workstation       │            Patient Health Portal           │
│   (Vite + React 18 + Tailwind CSS)       │       (Vite + React 18 + Tailwind CSS)     │
│   • Multi-Image Lab  • Patient Timeline   │       • Prescriptions   • Care Timeline    │
│   • SOAP Notes       • Prescription Hub   │       • AI Health Assistant with RAG       │
└─────────────────────────────────────┬─────┴───────────────────────┬────────────────────┘
                                      │                             │
                                      ▼                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              FASTAPI BACKEND GATEWAY                                   │
│                                (Python 3.11+, ASGI)                                    │
│  • JWT Authentication & RBAC               • REST Endpoints (/api/v1/...)              │
│  • Pydantic Request/Response Validation    • Async Task Management                     │
└─────────────────────────────────────┬──────────────────────────────────────────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
┌─────────────────────────────────┐       ┌──────────────────────────────────────────────┐
│       AI ORCHESTRATOR SWARM     │       │            MULTIMODAL INFERENCE              │
├─────────────────────────────────┤       ├──────────────────────────────────────────────┤
│ 1. Perception & OCR Agent       │       │ • Vision: Microsoft BiomedCLIP ViT-B/16      │
│ 2. Clinical Safety Guardrails   │       │ • Projection: BioMistral Multimodal Heads    │
│ 3. Longitudinal History Agent   │       │ • Reasoning: Groq OSS 120B / BioMistral      │
│ 4. Clinical Scribe (SOAP)       │       │ • OCR: RapidOCR + PyMuPDF                    │
│ 5. Specialist Decision Support  │       │ • RAG: all-MiniLM-L6-v2 Embeddings           │
│ 6. Medical Translation Agent    │       │                                              │
└────────────────┬────────────────┘       └───────────────────────┬──────────────────────┘
                 │                                                │
                 └────────────────────┬───────────────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               SUPABASE POSTGRESQL & VECTOR                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • Relational Tables (Patients, Encounters, Reports, Medications, Allergies)            │
│ • pgvector Vector Store (Clinical Guidelines, Knowledge Base Embeddings)               │
│ • Supabase Storage (DICOM, Radiographs, Pathology PDFs)                                │
│ • Row-Level Security (RLS) Tenant Data Isolation                                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
Radiology_gpt/
├── .env.example                  # Environment configuration template
├── .gitignore                    # Git exclusion rules (weights, env, logs)
├── docker-compose.yml            # Container orchestration specification
├── README.md                     # Project documentation
├── run.bat                       # One-click Windows startup script
├── run.ps1                       # PowerShell startup & environment verification script
├── train_radiology_gpt.ipynb     # Notebook for model training & adapter fine-tuning
│
├── backend/                      # FastAPI Python Application
│   ├── app/
│   │   ├── main.py               # Application entry point & CORS configuration
│   │   ├── agents/               # 6 AI agent implementations
│   │   │   ├── safety_agent.py   # Deterministic drug interaction & allergy rules
│   │   │   ├── history_agent.py  # Longitudinal clinical trend analysis
│   │   │   ├── scribe_agent.py   # Automated SOAP generation
│   │   │   └── ...
│   │   ├── api/routes/           # API endpoints (patients, encounters, reports, etc.)
│   │   ├── core/                 # Settings, security, database session, logging
│   │   ├── database/             # SQLAlchemy ORM models & repository abstractions
│   │   ├── inference/            # Multimodal pipeline (BiomedCLIP + Projector + LLM)
│   │   ├── processing/           # Document processors, RapidOCR, image transforms
│   │   ├── rag/                  # Vector search, document chunking, embedding store
│   │   └── schemas/              # Pydantic schemas for data transfer
│   └── requirements.txt          # Python dependencies
│
├── frontend/                     # React + TypeScript Web Application
│   ├── src/
│   │   ├── components/           # UI components (cards, badges, modals, charts)
│   │   ├── context/              # Auth & session state
│   │   ├── hooks/                # TanStack React Query hooks
│   │   ├── pages/
│   │   │   ├── lab/              # AI Diagnostic Lab (Multi-image upload & analysis)
│   │   │   ├── patients/         # Doctor Workstation & Longitudinal Summary
│   │   │   └── patient/          # Isolated Patient Portal & AI Health Assistant
│   │   └── services/             # Axios API client services
│   ├── package.json              # Frontend dependencies
│   └── vite.config.ts            # Vite bundler configuration
│
├── knowledge_base/               # RAG Clinical Guideline Documents
│   └── clinical_guidelines/      # Reference ranges for CBC, BP, metabolic, home care
│
├── supabase/                     # Database Migrations & Schemas
│   ├── migrations/               # SQL files (pgvector, tables, RLS policies)
│   └── seed.sql                  # Seed data for development & demonstrations
│
└── checkpoints/                  # Model Weights Directory (.gitkeep preserved)
    └── lora_adapter/             # LoRA configuration, chat templates, and tokenizer configs
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.11+** installed and available on PATH
- **Node.js 18+** & **npm** installed
- **Supabase Account** (Free tier supported) for PostgreSQL and storage
- *(Optional)* **Groq API Key** for ultra-fast 120B model inference

---

### Step 1: Clone & Configure Environment

```bash
git clone https://github.com/lokeshdhuria23/Radiology_gpt.git
cd Radiology_gpt

# Create local environment file from template
copy .env.example .env
```

Open `.env` and fill in your Supabase credentials and API keys:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_DB_URL=postgresql+asyncpg://postgres:your-db-password@db.your-project.supabase.co:5432/postgres
SUPABASE_STORAGE_BUCKET=medical-files

# AI & LLM Inference
GROQ_API_KEY=your-groq-api-key
OCR_ENABLED=true
VECTOR_SEARCH_ENABLED=true
DEMO_MODE=false
```

---

### Step 2: Initialize Supabase Database

Run the provided SQL migrations in your **Supabase SQL Editor** in numerical order:

1. `supabase/migrations/001_extensions.sql` — Enables `pgvector` and `uuid-ossp`
2. `supabase/migrations/002_tables.sql` — Creates tables for patients, encounters, reports, and medications
3. `supabase/migrations/003_rls_policies.sql` — Establishes Row-Level Security
4. `supabase/migrations/004_storage.sql` — Configures secure medical storage buckets
5. *(Optional)* `supabase/seed.sql` — Populates sample patient profiles and diagnostic data

---

### Step 3: Run the Application

#### Option A: One-Click Startup (Windows)
Double-click `run.bat` or run:
```powershell
.\run.ps1
```
This automatically boots both the FastAPI backend and Vite frontend concurrently.

#### Option B: Manual Startup

**1. Backend (Terminal 1):**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**2. Frontend (Terminal 2):**
```powershell
cd frontend
npm install
npm run dev
```

---

### Step 4: Access the Interfaces

- **Doctor Workstation**: [http://localhost:5173/](http://localhost:5173/)
- **Patient Portal**: [http://localhost:5173/patient](http://localhost:5173/patient)
- **FastAPI Interactive Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **FastAPI ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

**Default Demo Credentials**:
- Doctor Login: `admin@demo.com` / `demo123`

---

## ⚙️ Model Checkpoints & Local Weights

Model weights exceeding 100 MB are excluded from the repository to adhere to GitHub file size limits.

To deploy fine-tuned local weights:
1. Place your projection head `projectors.pt` or LoRA weights `adapter_model.safetensors` inside `checkpoints/`.
2. Update `.env`:
   ```env
   CHECKPOINT_DIR=./checkpoints
   TEXT_MODEL_PATH=checkpoints/lora_adapter
   VISION_MODEL_PATH=checkpoints/projectors.pt
   ```
3. If local checkpoint weights are omitted, the system seamlessly leverages **Microsoft BiomedCLIP** over Hugging Face and **Groq Cloud 120B**, or graceful fallback in `DEMO_MODE=true`.

---

## 🔒 Security & Privacy

- **Data Isolation**: Patients can strictly view only their own records via authenticated patient session routing.
- **Strict Guardrails**: Clinical safety checks (allergy conflicts, dose safety, duplicate regimens) execute via deterministic logic independently of LLM temperature.
- **Secret Protection**: All credentials, tokens, and storage keys are managed through environment variables and strictly ignored by `.gitignore`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
