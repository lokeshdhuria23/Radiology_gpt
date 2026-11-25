import asyncio
import os
import uuid
import re
from pathlib import Path
from typing import List, Dict, Optional
import asyncpg
from app.core.config import settings

KB_DIR = Path("../knowledge_base").resolve()

# Map folder to source info
SOURCE_MAP = {
    "clinical_guidelines": {
        "id": "80000000-0000-0000-0000-000000000001",
        "name": "Clinical Practice Guidelines",
        "type": "clinical_guidelines",
        "description": "Evidence-based clinical guidelines from ACR, ACC/AHA, ADA, and KDIGO.",
        "category": "Guidelines",
    },
    "drug_references": {
        "id": "80000000-0000-0000-0000-000000000002",
        "name": "Drug & Contrast Safety References",
        "type": "drug_database",
        "description": "ACR contrast media protocols, FDA drug safety warnings, and high-risk drug-drug interactions.",
        "category": "Pharmacology",
    },
    "medical_references": {
        "id": "80000000-0000-0000-0000-000000000003",
        "name": "Medical & Radiology Reference Lexicons",
        "type": "medical_reference",
        "description": "Standard diagnostic systems including Lung-RADS v2022, normal lab ranges, and emergency imaging findings.",
        "category": "Reference",
    },
}


def get_embedding_model():
    """Load FastEmbed (ONNX) TextEmbedding model (384 dimensions)."""
    try:
        from fastembed import TextEmbedding
        print("Loading FastEmbed 'BAAI/bge-small-en-v1.5' (384 dimensions)...")
        model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        print("✓ FastEmbed model initialized successfully.")
        return model
    except Exception as e:
        print(f"⚠️ FastEmbed load warning: {e}")
        return None


def chunk_document(content: str, max_words: int = 250, overlap: int = 30) -> List[Dict]:
    """Chunk markdown documents by markdown headers (##, ###) or paragraphs."""
    sections = re.split(r"(?=\n#{1,3}\s+)", content)
    chunks = []
    idx = 0
    
    for sec in sections:
        sec = sec.strip()
        if not sec:
            continue
        
        first_line = sec.split("\n")[0].strip("# ")
        words = sec.split()
        
        if len(words) <= max_words:
            chunks.append({
                "index": idx,
                "title": first_line[:100],
                "text": sec,
            })
            idx += 1
        else:
            w_idx = 0
            while w_idx < len(words):
                chunk_slice = words[w_idx:w_idx + max_words]
                text_slice = " ".join(chunk_slice)
                chunks.append({
                    "index": idx,
                    "title": f"{first_line[:80]} (Part {idx + 1})",
                    "text": text_slice,
                })
                idx += 1
                w_idx += (max_words - overlap)
                
    return chunks


async def ingest():
    url = settings.SUPABASE_DB_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url, timeout=30)
    print(f"Connected to Supabase PostgreSQL.")

    embed_model = get_embedding_model()

    total_docs = 0
    total_chunks = 0

    for folder_name, src_info in SOURCE_MAP.items():
        folder_path = KB_DIR / folder_name
        if not folder_path.exists():
            continue

        src_id = uuid.UUID(src_info["id"])
        
        # Clean insert/update for knowledge_sources
        await conn.execute("""
            INSERT INTO knowledge_sources (id, name, source_type, description, created_at, updated_at)
            VALUES ($1, $2, $3, $4, now(), now())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                updated_at = now();
        """, src_id, src_info["name"], src_info["type"], src_info["description"])
        print(f"\n📂 Source: {src_info['name']}")

        for file_path in folder_path.glob("*.*"):
            if file_path.name.startswith(".") or file_path.suffix.lower() not in [".md", ".txt", ".csv", ".json"]:
                continue

            doc_title = file_path.stem.replace("_", " ").title()
            content = file_path.read_text(encoding="utf-8")
            chunks = chunk_document(content)
            # Check if document already exists to ensure idempotency
            existing_doc = await conn.fetchrow(
                "SELECT id FROM knowledge_documents WHERE source_id = $1 AND file_path = $2",
                src_id, str(file_path.name)
            )
            if existing_doc:
                doc_id = existing_doc["id"]
                await conn.execute("DELETE FROM knowledge_chunks WHERE document_id = $1", doc_id)
                await conn.execute("""
                    UPDATE knowledge_documents 
                    SET title = $1, file_type = $2, category = $3, ingestion_status = 'completed',
                        chunk_count = $4, updated_at = now()
                    WHERE id = $5
                """, doc_title, file_path.suffix.lower().lstrip("."), src_info["category"], len(chunks), doc_id)
            else:
                doc_id = uuid.uuid4()
                await conn.execute("""
                    INSERT INTO knowledge_documents (
                        id, source_id, title, file_path, file_type, category, 
                        ingestion_status, chunk_count, metadata, created_at, updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7, '{}'::jsonb, now(), now())
                """, doc_id, src_id, doc_title, str(file_path.name), file_path.suffix.lower().lstrip("."), src_info["category"], len(chunks))
            
            # Compute embeddings for all chunks in batch
            texts = [ch["text"] for ch in chunks]
            vectors = list(embed_model.embed(texts)) if embed_model else []
            
            for i, ch in enumerate(chunks):
                vec = vectors[i].tolist() if i < len(vectors) else [0.0]*384
                vec_str = "[" + ",".join(str(round(v, 6)) for v in vec) + "]"
                
                chunk_id = uuid.uuid4()
                await conn.execute("""
                    INSERT INTO knowledge_chunks (
                        id, document_id, source_id, category, title, chunk_text, chunk_index, embedding, metadata, created_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, '{}'::jsonb, now())
                """, chunk_id, doc_id, src_id, src_info["category"], ch["title"], ch["text"], ch["index"], vec_str)
                total_chunks += 1

            total_docs += 1
            print(f"  ✓ {doc_title} ({len(chunks)} chunks embedded)")

    print(f"\n==================================================")
    print(f"🎉 Ingestion Complete!")
    print(f"Total Documents Ingested: {total_docs}")
    print(f"Total Chunks Embedded in pgvector: {total_chunks}")
    print(f"==================================================")

    # Test sample vector retrieval
    print("\n🔍 Testing semantic vector search (RAG verification)...")
    test_query = "What is the recommended follow-up for a 7 mm solid lung nodule on CT?"
    q_vec = list(embed_model.embed([test_query]))[0].tolist()
    q_vec_str = "[" + ",".join(str(round(v, 6)) for v in q_vec) + "]"
    
    results = await conn.fetch("""
        SELECT title, chunk_text, (1 - (embedding <=> $1::vector)) as similarity
        FROM knowledge_chunks
        ORDER BY embedding <=> $1::vector ASC
        LIMIT 2;
    """, q_vec_str)
    
    for i, r in enumerate(results):
        print(f"\nTop Match #{i+1} [Similarity: {r['similarity']:.4f}]: {r['title']}")
        print(r['chunk_text'][:250].strip() + "...")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(ingest())
