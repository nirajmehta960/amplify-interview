# Backend Phase 7 — Document Parsing and Match Analysis

**What this covers:** turning an uploaded PDF into structured data, and comparing it against a job description.
**Files:** `backend/app/services/{resume_parser,jd_parser,matching_engine}.py`
**You need to know:** PDF/DOCX text extraction, LLM-based structuring

---

## The two-step pipeline

The pattern that matters:

```
raw bytes ──(deterministic)──▶ plain text ──(LLM)──▶ structured object
   PDF/DOCX      PyPDF2/docx                 chat_completion_structured
```

**Never send raw file bytes to an LLM.** Extract text with a real parser first, then use the model only for the part that genuinely needs judgement — understanding that "Senior SWE @ Acme, 2019-2023" is a job title, company, and date range.

This split makes the deterministic half testable and cheap, and confines the expensive, non-deterministic half to the task that actually requires it.

---

## Text extraction

```python
def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))
    parts = [page.extract_text() for page in reader.pages]
    text = "\n\n".join(p for p in parts if p)
    if not text.strip():
        raise ValueError("Could not extract text from PDF. The file may be image-based.")
    return text
```

The blank-result guard is the important line. A **scanned résumé is an image**, and PyPDF2 returns empty strings for every page with no error. Without this check the user gets a bizarre LLM hallucination built from nothing; with it they get an actionable message. Handling image-based PDFs properly needs OCR (Textract/Tesseract), which this app deliberately does not do.

`extract_text` dispatches on content type with `.endswith("pdf")` / `.endswith("docx")` tolerance, because browsers send several MIME spellings for the same format (`application/pdf` vs `application/x-pdf`, and the very long OpenXML string for `.docx`).

DOCX extraction is simpler — `docx.Document(BytesIO(...))` and join non-blank paragraphs — but note it ignores tables, so table-based résumé layouts lose content.

---

## LLM structuring

```python
async def parse_resume(file_bytes, content_type) -> Tuple[ParsedResume, str, TokenUsage]:
    raw_text = extract_text(file_bytes, content_type)
    messages = build_resume_extraction_prompt(raw_text)
    parsed, usage = await chat_completion_structured(
        messages, response_model=ParsedResume,
        temperature=0.1, max_tokens=3000,
    )
    return parsed, raw_text, usage
```

Three details:

**`temperature=0.1`** — extraction is transcription, not creation. Any variation is an error.

**Both parsed *and* raw text are returned.** The raw text is persisted (capped at 50,000 chars) so you can re-parse later with a better prompt or a better model without asking the user to re-upload. Cheap insurance.

**`max_tokens=3000`** — a fully structured résumé with work history, education, projects, and skills is a large JSON object. Set this too low and the JSON is truncated mid-object, which surfaces as a confusing parse error rather than an obvious limit error.

`jd_parser` is the same, minus step one (JD text arrives in the request body) plus a guard:

```python
if len(raw_text.strip()) < 50:
    raise ValueError("Job description is too short to analyze")
```

Cheap, fast, and it prevents a pointless paid API call on junk input.

---

## The matching engine

`analyze_match(resume: ParsedResume, jd: ParsedJobDescription) -> MatchAnalysis` is where the product's personalization actually originates.

**It renders typed models, not raw text.** By this point both sides are structured, so the prompt is built from clean fields rather than the original document:

```python
def _format_experience(experiences: List[WorkExperience]) -> str:
    lines = []
    for exp in experiences[:5]:
        lines.append(f"{exp.title} at {exp.company} ({exp.start_date} - {exp.end_date})")
        for bullet in exp.bullets[:4]:
            lines.append(f"  • {bullet}")
        if exp.technologies:
            lines.append(f"  Technologies: {', '.join(exp.technologies)}")
    return chr(10).join(lines)
```

Note `chr(10)` instead of `"\n"` — f-string expressions could not contain backslashes before Python 3.12. A quirk worth recognizing when you meet it.

Truncation is everywhere: 5 roles, 4 bullets each, 20 skills, 3 education entries, 3 projects with 100-char descriptions, 8 responsibilities. Bounded prompt, bounded cost.

The output:

```python
class MatchAnalysis(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    skill_matches: List[SkillMatch]        # per-skill: found?, evidence, importance
    matched_skills / missing_skills / transferable_skills: List[str]
    experience_alignment: str
    strengths / gaps / interview_focus_areas: List[str]
```

`interview_focus_areas`, `missing_skills`, and `strengths` feed **straight into the question-generation prompt**. That is the coupling that makes generated questions target the candidate's real gaps instead of being generic.

`SkillMatch.resume_evidence` is a nice touch: the model must cite where in the résumé it found a skill, which discourages it from asserting matches that aren't there.

---

## The full flow

```
POST /api/resume/upload   → bytes → text → ParsedResume       → stored
POST /api/resume/jd       → text  → ParsedJobDescription      → stored
POST /api/resume/match    → both  → MatchAnalysis             → returned
POST /api/interview/session → match feeds question generation → personalized interview
```

Each step is separately persisted, so a user can upload one résumé and match it against many job descriptions without re-parsing.

---

## 🧠 Check your understanding

1. Why extract text deterministically before involving an LLM?
2. What happens with a scanned résumé, and how is it detected?
3. Why store raw text when the structured version already exists?
4. What goes wrong if `max_tokens` is too low for extraction?
5. Why does the match prompt render typed model fields rather than the original document text?
6. Which three `MatchAnalysis` fields drive question personalization?
7. Why does `SkillMatch` require evidence?

---

## ⚠️ Note

`routers/resume.py`'s `/match` endpoint fetches the résumé and JD documents independently and re-hydrates their `parsed_data` into Pydantic models in the handler body. Under Postgres this becomes a two-row fetch or a join — see the migration plan.

DOCX table content is silently dropped, so résumés built on a table layout lose data with no warning.

---

**Next:** [Phase 8 — The interview engine](PHASE_08_interview_engine.md)
