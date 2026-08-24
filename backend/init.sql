-- =============================================================================
-- GyaanSetu MMRCL Document Intelligence Database Initialization Script
-- Database: PostgreSQL with pgvector extension
-- =============================================================================

-- 1. Enable pgvector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Create Tags Table
CREATE TABLE IF NOT EXISTS tags (
    id VARCHAR(100) PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    bg_class VARCHAR(100) DEFAULT 'bg-transparent' NOT NULL,
    border_class VARCHAR(100) DEFAULT 'border-[#1d4ed8]' NOT NULL,
    text_class VARCHAR(100) DEFAULT 'text-[#1d4ed8]' NOT NULL,
    hex VARCHAR(50) DEFAULT '#1d4ed8' NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Create Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    lineage_id VARCHAR(100),
    title VARCHAR(500) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    document_type VARCHAR(100),
    project VARCHAR(255),
    department VARCHAR(255),
    year INTEGER,
    version VARCHAR(50) DEFAULT 'v1.0' NOT NULL,
    revision_label VARCHAR(50),
    doc_status VARCHAR(50) DEFAULT 'Current' NOT NULL,
    order_index INTEGER DEFAULT 0 NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_hash VARCHAR(64),
    content_hash VARCHAR(64),
    file_size BIGINT DEFAULT 0 NOT NULL,
    formatted_size VARCHAR(50),
    page_count INTEGER,
    status VARCHAR(50) DEFAULT 'uploaded' NOT NULL,
    error_message TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for Documents Table
CREATE INDEX IF NOT EXISTS idx_documents_lineage_id ON documents(lineage_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department);
CREATE INDEX IF NOT EXISTS idx_documents_doc_status ON documents(doc_status);
CREATE INDEX IF NOT EXISTS idx_documents_order_index ON documents(order_index);

-- 5. Create Document Chunks Table (with 384-dimensional pgvector embeddings)
CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER,
    section VARCHAR(1000),
    subsection VARCHAR(1000),
    element_type VARCHAR(100) DEFAULT 'text' NOT NULL,
    content TEXT NOT NULL,
    metadata_json JSONB,
    embedding vector(384),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for Document Chunks Table
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_page ON document_chunks(page_number);

-- Vector Cosine Similarity Index (HNSW for high-speed approximate nearest neighbor search)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- 6. Seed Default MMRCL Departments
INSERT INTO departments (name, description)
VALUES 
    ('Rolling Stock', 'Metro coaches, bogies, pantographs, and traction propulsion systems.'),
    ('Signaling', 'CBTC ATS, train control, interlocking, and telemetry systems.'),
    ('Civil', 'Track, tunnels, viaducts, drainage, and station structural works.'),
    ('Procurement', 'Tenders, contracts, GCC, vendor SLA, and supply chain documents.'),
    ('Safety & Compliance', 'CMRS clearances, hazard logs, audits, and safety SOPs.'),
    ('Power & Traction', '25kV AC OHE, substations, third rail, and electrical distribution.')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description;

-- 7. Seed Default MMRCL Tags
INSERT INTO tags (id, label, bg_class, border_class, text_class, hex)
VALUES 
    ('tender_gcc', 'Tender / GCC', 'bg-transparent', 'border-[#1d4ed8]', 'text-[#1d4ed8]', '#1d4ed8'),
    ('cmrs_safety', 'CMRS Safety', 'bg-transparent', 'border-[#0e7490]', 'text-[#0e7490]', '#0e7490'),
    ('high_priority', 'High Priority', 'bg-transparent', 'border-[#dc2626]', 'text-[#dc2626]', '#dc2626'),
    ('monsoon_sop', 'Monsoon SOP', 'bg-transparent', 'border-[#d97706]', 'text-[#d97706]', '#d97706'),
    ('vendor_sla', 'Vendor SLA', 'bg-transparent', 'border-[#c2410c]', 'text-[#c2410c]', '#c2410c')
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    bg_class = EXCLUDED.bg_class,
    border_class = EXCLUDED.border_class,
    text_class = EXCLUDED.text_class,
    hex = EXCLUDED.hex;

-- Confirmation
SELECT 'GyaanSetu database initialization complete!' AS status;
