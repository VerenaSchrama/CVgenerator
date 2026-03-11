# CVgenerator

Generates role-tailored CVs based on initial CV + role description.

---

Phase 1: Parse DOCX CVs into a strict JSON schema.  
Phase 2: Deterministic tailoring, validation guardrails, and /review page.  
Phase 3: Diff view, accept/reject controls, per-section change management.  
Phase 4: DOCX export of the current (edited) CV.

No auth. No database. Projects are always sorted by year (newest first).  
**AI (optional):** Profile text can be rewritten to match the role. Set `ANTHROPIC_API_KEY` (Claude) or `OPENAI_API_KEY` (OpenAI); Claude has priority if both are set.

## Setup

```bash
npm install
npm run dev
```

Optional: kopieer `.env.example` naar `.env` en vul `ANTHROPIC_API_KEY` of `OPENAI_API_KEY` in voor AI-profielherschrijving.

Open [http://localhost:3000](http://localhost:3000).

## How to Test Manually (Phase 3)

1. **Parse**: Upload a DOCX CV, click **Parse CV**. JSON appears below.
2. **Role description**: Paste a job description (e.g. "Python developer, data analytics").
3. **Focus** (optional): Add focus keywords (e.g. "Python, AWS").
4. **Generate & Review**: Click **Generate & Review**. You are navigated to `/review`.
5. **Review page — Original vs Current**:
   - Two columns: Original (parsed) vs Current (editable).
   - Word-level diff: green = added, gray strikethrough = removed.
   - Projects are always chronological (newest first). No project reordering.
6. **Per-section controls** (Current column):
   - **Profile**: Accept (→ suggested), Reject (→ original), Reset (→ suggested).
   - **Projects**: Per project Accept/Reject description; Reset Projects.
   - **Skills**: Accept/Reject text; Accept order / Reject order; Reset.
   - Education & Certifications: locked (read-only).
7. **Persistence**: Edits and accept/reject state persist in sessionStorage. Refresh to verify.
8. **Download DOCX**: Click to download the current CV as a .docx file.

## Local Dev Fixture

For development, you can test with a sample CV. If you have a file at:

```
/mnt/data/Verena Schrama CV.docx
```

Use it as follows:

- **Option A**: Copy it into the project and select via the file input:
  ```bash
  cp "/mnt/data/Verena Schrama CV.docx" ./sample-cv.docx
  ```
  Then choose `sample-cv.docx` in the UI.

- **Option B**: Use curl to hit the API directly:
  ```bash
  curl -X POST -F "file=@/mnt/data/Verena Schrama CV.docx" http://localhost:3000/api/parse
  ```

(Do not hardcode this path in the app; it is for local dev only.)

## Expected CV Format

The parser expects these exact headings:

- **Profile**
- **Technical skills** (subsections: Frameworks, Programming, Database, OS, Cloud, Tools, Other)
- **Other projects** (each project starts with a year range like `2019 - 2023`)
- **Education**
- **Certificering** OR **Certifications**

Missing sections produce a structured error.

## API

- **POST** `/api/parse`  
  - Body: `multipart/form-data` with `file` (DOCX)  
  - Success (200): `StructuredCV` JSON  
  - Parse error (422): `{ error: { code, message, details? } }`  
  - Server error (500): `{ error: { code, message, details? } }`

## Tests

```bash
npm run test
```

