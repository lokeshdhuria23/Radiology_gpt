# Knowledge Base

Place medical knowledge documents here for RAG (Retrieval-Augmented Generation) retrieval.

## Supported Formats
- `.txt` — Plain text documents
- `.pdf` — PDF documents
- `.md` — Markdown documents
- `.json` — Structured JSON data
- `.csv` — Tabular data

## Organization

You can organize files into subdirectories:

```
knowledge_base/
├── clinical_guidelines/
│   ├── hypertension_guidelines.pdf
│   └── diabetes_management.txt
├── drug_references/
│   ├── drug_interactions.csv
│   └── formulary.json
├── medical_references/
│   └── anatomy_reference.txt
└── README.md
```

## How It Works

1. Add knowledge source in the **Knowledge Base** page of the app
2. Upload documents to the source
3. Documents are chunked, embedded, and indexed with pgvector
4. During AI analysis, relevant chunks are retrieved to provide context

## Notes

- Keep documents focused and well-structured for best retrieval quality
- Very large documents will be chunked automatically
- The system supports fixed-size, semantic, and medical section-aware chunking
