//----------------------------4-5-2026---------------------------------------------
// GPT Service
// Handles interaction with the Perplexity API to generate
// surgical reports based on the provided transcript.
//------------------------------------------------------------------------



const axios = require('axios');
const logger = require('../utils/logger');

async function generateReport(transcript) {
  try {
    logger.info('GPT Service: Starting report generation using PERPLEXITY');
    const report = await generateWithPerplexity(transcript);
    logger.info('GPT Service: Report generation completed');
    return report;
  } catch (error) {
    logger.error(`GPT Service Error: ${error.message}`);
    throw new Error(`Failed to generate report: ${error.message}`);
  }
}

async function generateWithPerplexity(transcript) {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    const model = process.env.PERPLEXITY_MODEL || 'sonar-pro';

    if (!apiKey || apiKey === 'your_key_here') {
      throw new Error('PERPLEXITY_API_KEY not configured in .env');
    }

    const prompt = buildSurgicalReportPrompt(transcript);

    const requestPayload = {
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert surgical documentation AI generating medico-legal operative reports for a hand and peripheral nerve surgeon. ' +
            'Reports must be detailed, expansive, and professionally impressive — written as if for a court or insurance auditor. ' +
            'Never copy template text verbatim. Always restate techniques in fresh, varied language. ' +
            'Never invent facts. ICD-10 codes are mandatory. ' +
            'Use "Not specified" for any missing field.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 6000,
      temperature: 0.4
    };

    logger.info(`Perplexity: Sending request to API using model ${model}...`);
    logger.info('='.repeat(80));
    logger.info('PERPLEXITY PROMPT (FULL)');
    logger.info('='.repeat(80));
    console.log(prompt);
    logger.info('='.repeat(80));

    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      requestPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        timeout: 60000
      }
    );

    const generatedReport = response.data?.choices?.[0]?.message?.content;

    if (!generatedReport) {
      logger.error(`Perplexity: Unexpected response structure: ${JSON.stringify(response.data)}`);
      throw new Error('Invalid response from Perplexity API');
    }

    logger.info('✅ Perplexity: Successfully generated report');
    logger.info(`Perplexity: Report length: ${generatedReport.length} characters`);
    return generatedReport;
  } catch (error) {
    logger.error(`Perplexity API Error: ${error.message}`);
    if (error.response) {
      logger.error(`Perplexity API Status: ${error.response.status}`);
      logger.error(`Perplexity API Response: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Perplexity API failed: ${error.message}`);
  }
}

/**
 * Build a structured prompt for surgical report generation.
 *
 * VERSION HISTORY:
 *   v1 — Initial version
 *   v2 — Meeting fixes (OR time removed, long style, KB key elements,
 *         Indication for Surgery, numbered procedures, wound sq cm)
 *   v3 — Test conversation fixes (ICD-10 in summary, module order,
 *         preop diagnosis explicit, clinical term clarification)
 *   v4 — Structural fixes from actual Dr. Oren reports analysis
 *         (section order, IMPLANTS, CURRENT DIAGNOSIS at top, etc.)
 *   v5 — CURRENT. New KB + conversation updates:
 *         CHANGE-1: Indication for Surgery = per-procedure justification
 *         KB-1: General Debridement section added (new)
 *         KB-2: Tendon repair — flexor full thickness updated to 6-strand
 *                (2x FiberLoop), knot in middle, 5-0 PDS epitenon
 *         KB-3: Tendon repair — flexor partial updated
 *                (4-strand + 4-0 PDS side-to-side + 5-0 PDS epitenon)
 *         KB-4: Extensor tendon repair added (new)
 *                (4-0 PDS, 2x figure-of-eight + 2x horizontal mattress = 8-strand)
 *         KB-5: Ulnar styloid — Method A (cannulated screw + FiberTak + suture tape)
 *                + Method B (hook plate). Both include neurolysis + wrap of
 *                dorsal ulnar sensory nerve as standard.
 *         KB-6: Metacarpal IM nailing — Dermabond closure added
 *         KB-7: Neurolysis — dedicated standalone section added
 *         KB-8: Primary nerve repair — Nerve Tape option added
 *         KB-9: Nerve graft — Nerve Tape option added
 *         KB-10: Vascular — Ackland clamps specified
 *         KB-11: Nano fat — thigh option added, angiocath application,
 *                 nerve wraps/grafts soaked in fat prior to use
 *         KB-12: A1 Pulley Release — new section
 *         KB-13: Full Thickness Skin Graft + Medial Forearm Flap — new section
 *         KB-14: Finger Arthrotomy — new section
 *         KB-15: Nail Plate Removal — new section
 *         KB-16: Nailbed Repair — new section
 *         KB-17: Rotational Flap of Nail Bed — new section
 */
function buildSurgicalReportPrompt(transcript) {
  return `
You are an expert hand and peripheral nerve surgeon AI assistant
generating a medico-legal operative report.

═══════════════════════════════════════════════════════════
ABSOLUTE RULES — NEVER VIOLATE
═══════════════════════════════════════════════════════════

1. Do NOT invent any facts, instruments, measurements, sutures,
   techniques, or findings not present in the transcript.
2. If information is missing: write "Not specified".
3. If a term is unclear or possibly misheard by voice recognition:
   keep the verbatim term and label it "(unclear term — recommend
   surgeon verify before signing)".
4. If the doctor corrected a value during confirmation dialogue:
   use ONLY the corrected final value. Discard the original.
5. This is a legal document submitted to courts and insurance auditors.
   Every sentence must be defensible and transcript-supported.
6. ICD-10 codes are MANDATORY in both CURRENT DIAGNOSIS (top) and
   POSTOPERATIVE DIAGNOSIS sections. Do not omit under any circumstance.
7. POSTOPERATIVE PLAN section does NOT exist in this report.
   Do not create it. Do not mention it anywhere.
8. OR start time, OR end time, and total OR duration are NOT included
   in this report. Do not add them anywhere.
9. Primary Surgeon is ALWAYS: Oren Michaeli, DO. Do not change this.

═══════════════════════════════════════════════════════════
REPORT STYLE — CRITICAL REQUIREMENT
═══════════════════════════════════════════════════════════

This report is read by insurance auditors, judges, and attorneys.
The goal is NOT brevity. The goal is:
  - Expansive, detailed, and professionally impressive
  - Written as if describing a highly complex and significant procedure
  - Thorough enough that even a small procedure reads as grand and complete

NEVER summarize when you can elaborate.
NEVER write 2 words when 2 paragraphs make a stronger case.
Every clinical action deserves a full sentence or more.

LANGUAGE VARIATION — MANDATORY:
  - NEVER copy Knowledge Base text verbatim or word-for-word.
  - Insurance companies flag identical template language across reports.
  - Use KB sections to know WHAT key elements must be mentioned.
  - Write every report in fresh, natural, varied clinical language.
  - Each report must read as if personally dictated by the surgeon.

═══════════════════════════════════════════════════════════
TRANSCRIPT
═══════════════════════════════════════════════════════════

${transcript}

═══════════════════════════════════════════════════════════
DR. OREN STANDARD TECHNIQUE LIBRARY
═══════════════════════════════════════════════════════════

Apply ONLY when doctor confirmed standard technique or said
"as usual" / "knowledge base" / "same as always".
Do NOT apply if doctor stated a deviation.

Each section lists KEY ELEMENTS that must appear in the report.
Describe ALL elements in fresh, varied language — never verbatim.

───────────────────────────────────────────────────────────
STERILE PREPARATION
───────────────────────────────────────────────────────────
KEY ELEMENTS (clean cases):
  - Extremity scrubbed with surgical-grade sponge
  - Dried with sterile towel, process repeated
  - Chlorhexidine prep applied twice to extremity
  - Sterile surgical drape applied
  - Final chlorhexidine application within sterile field

KEY ELEMENTS (contaminated or dirty cases):
  - Betadine-based solution used per contaminated wound protocols

───────────────────────────────────────────────────────────
GENERAL DEBRIDEMENT
───────────────────────────────────────────────────────────
KEY ELEMENTS (light wound debridement):
  - Surgical scissors used to remove 1-2 grams of devitalized
    and contaminated skin and fatty tissue
  - Purpose: decrease infection risk and allow proper healing

KEY ELEMENTS (tendon debridement):
  - Note poor condition of tendon edges
  - Debrided back to healthy tissue to decrease infection
    and facilitate repair

KEY ELEMENTS (bone or open fracture debridement):
  - Amputation: rongeur used to remove 1-2 mm of bone from
    distal end
  - Open fingertip fracture with nailbed repair: debrided with
    small curette to remove contaminants and allow thorough washout

───────────────────────────────────────────────────────────
TENDON REPAIR — FLEXOR FULL THICKNESS LACERATION
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Tendon debridement performed
    → Apply GENERAL DEBRIDEMENT (Tendon Debridement) KB section
  - Two separate 4-0 FiberLoop sutures placed to create a robust
    6-strand repair with knot placed in the middle
  - If epitenon repair performed: 5-0 PDS suture in running
    locking fashion
  - Full range of motion tested — no gapping, no triggering

───────────────────────────────────────────────────────────
TENDON REPAIR — FLEXOR PARTIAL LACERATION
───────────────────────────────────────────────────────────
KEY ELEMENTS:
- Tendon debridement performed
    → Apply GENERAL DEBRIDEMENT (Tendon Debridement) KB section
  - One 4-0 FiberLoop to create 4-strand repair
  - Combined with 4-0 PDS side-to-side repair
  - Finished with 5-0 PDS epitenon repair

───────────────────────────────────────────────────────────
TENDON REPAIR — EXTENSOR TENDON
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - 4-0 PDS suture employed
  - Two central figure-of-eight stitches placed
  - Two peripheral horizontal mattress sutures placed
  - Suture bites taken 1 cm back from torn ends
  - Results in secure 8-strand repair configuration

───────────────────────────────────────────────────────────
NEUROLYSIS (standalone)
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Tenotomy or curved micro-scissor used (specify if stated)
  - Nerve freed from scarred wound bed, local adhesions, or
    zone of trauma
  - Nerve preserved and mobilized until healthy vaso nervosum
    visualized

───────────────────────────────────────────────────────────
NERVE REPAIR — PRIMARY COAPTATION (no gap)
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Neurolysis and sharp debridement of both nerve ends
    → Apply NEUROLYSIS KB section for full technique
  - Sharp debridement with straight microscissors until healthy,
    bleeding, bulging fascicles visible (bug's eyes appearance)
  - COAPTATION OPTION A (suture):
    Two interrupted 9-0 nylon sutures, 0.1 mm light gap maintained
  - COAPTATION OPTION B (nerve tape):
    Nerve tape used (specify size if stated). Nerve ends aligned
    centering vaso nervosum without twisting. Nerve seated in
    nitinol hooks through epineurium (not fascicles), hooks wrapped.
    0.1 mm gap maintained.
  - Repair tugged to ensure engagement and strength
  - Tension-free repair confirmed (grandmother's kiss)
  - Fibrin glue applied using drop-drop technique
  - Limb or digit fully ranged to confirm suture line integrity
    (EXCEPTION: omit ROM if joint fused or K-wired)

───────────────────────────────────────────────────────────
NERVE GRAFT (gap present — allograft)
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Neurolysis and sharp debridement of both nerve ends
    → Apply NEUROLYSIS KB section for full technique
  - Note gap size (diameter and length). Allograft thawed and
    trimmed with micro-scissors to match gap length and diameter.
  - COAPTATION OPTION A (suture):
    Proximal and distal coaptation with two interrupted 9-0 nylon
    per side, 0.1 mm light gap maintained
  - COAPTATION OPTION B (nerve tape):
    Nerve end and graft end aligned in center of tape. Nitinol
    hooks seated through epineurium, hooks wrapped, 0.1 mm gap
    maintained. Tug test confirms tension-free repair.
  - Fibrin glue applied at both anastomotic sites

───────────────────────────────────────────────────────────
NERVE WRAP
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Wrap placed circumferentially around nerve repair
  - Purpose: minimize axonal sprouting, prevent neuroma formation
  - Secured with 9-0 nylon sutures
  - Reinforced with fibrin glue

───────────────────────────────────────────────────────────
NERVE STIMULATION — ReGen (intraoperative)
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Electrode placed proximal to repair at last healthy nerve segment
  - Settings: 100 pulses per second, 2 mA, 10 minutes total duration
  - Device used and stimulation time documented

───────────────────────────────────────────────────────────
FAT GRAFTING — NANO FAT (Tulip system)
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - 100 cc tumescent fluid (saline, lidocaine, epinephrine)
    infiltrated into lower abdomen OR thigh (use site stated in
    transcript — if abdomen, suction cannula always through umbilicus)
  - Fat harvested using Tulip cannula under manual suction pressure
  - Gravity separation; supernatant and infranatant discarded
  - Fat processed through sequential Tulip filters to create nanofat
  - Standard yield: 30 cc suction → approximately 10 cc nanofat
  - Nanofat applied to target site via angiocath
  - IMPORTANT: Any nerve wraps, tendon wraps, or nerve grafts used
    in the case are soaked in the nanofat prior to use

───────────────────────────────────────────────────────────
RPNI (Regenerative Peripheral Nerve Interface)
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Free muscle graft harvested from [stated target muscle]
  - Graft dimensions: approximately 1.5 cm x 1.5 cm, 1-2 mm thick
  - Graft deinnervated (denervated free muscle graft)
  - Nerve end encased within graft using interrupted 8-0 nylon sutures
  - Entire configuration implanted in robust neighboring soft tissue
    bed to promote vascularity and imbibition

───────────────────────────────────────────────────────────
VRPNI (Vascularized Regenerative Peripheral Nerve Interface)
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Size-matched muscle fascicle elevated from [stated target muscle]
    on intact vascular pedicle, preserving blood supply
  - Fascicle intentionally denervated — native neural input disrupted
    while vascular inflow maintained — vascularized yet denervated
    muscle with vacant motor end plates for reinnervation
  - Nerve prepared with proximal neurolysis and sharp debridement
    until healthy fascicles and vaso nervosum identified
  - Nerve coapted to muscle with interrupted 9-0 nylon
    epineurial-to-endomysial sutures under magnification
  - Construct inset tension-free without twisting or kinking of pedicle
  - Placed in stable, well-vascularized soft tissue bed

───────────────────────────────────────────────────────────
VASCULAR ANASTOMOSIS
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Hematoma and adhesions cleared
  - Arterial ends mobilized
  - Adventitia sharply removed with straight micro-scissors
  - Vessel ends debrided to healthy tissue
  - Vessel bathed in heparin, lidocaine, and papaverine solution
  - Lumen expanded with microscopic vessel dilators
  - Vessel approximated with Ackland clamps
  - Anastomosis with 8-0 nylon interrupted sutures under magnification
  - Perfusion confirmed after clamp release

───────────────────────────────────────────────────────────
DISTAL RADIUS VOLAR PLATING (Modified Henry Approach)
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Fluoroscopic inspection prior to incision; preliminary reduction
  - Modified Henry approach; FCR palpated; 10 cm incision with 15 blade
  - FCR sheath incised with 15 blade; extended proximally and distally
    using push-cut technique with tenotomy scissors
  - FCR retracted ulnarly with Ragnell retractor
  - FPL freed with finger-sweep dissection and wet sponge
  - Pronator quadratus divided with bipolar; blunt dissection
    (RayTec + key elevator) to expose fracture
  - Hematoma evacuated with freer elevator; irrigation performed
  - DRUJ stability assessed (if ulnar styloid fracture present)
  - Volar plate fixed distally first (leverage/reduce distal fragments)
  - Proximal screws placed for longitudinal stabilization
  - Fluoroscopy: screw placement confirmed, no intra-articular
    penetration, satisfactory alignment
  - IF BONE GRAFT: packed tightly into defect — once before plate
    to backfill, once after plate and all screws are secured
  - IF ARTHROSCOPIC ASSIST: arthroscope introduced dorsally at
    Lister's tubercle; 6R portal created; fragments adjusted to 0mm
    step-off; verified arthroscopically and fluoroscopically

───────────────────────────────────────────────────────────
ULNAR STYLOID FIXATION
───────────────────────────────────────────────────────────
STANDARD FOR BOTH METHODS — APPROACH AND NEUROLYSIS:
  - Longitudinal ulnar-sided incision between ECU and FCU
  - Layer-by-layer dissection to protect dorsal ulnar sensory nerve
  - Nerve identified; noted to be contused (consistent with
    preoperative sensory complaints and injury mechanics)
- During approach: neurolysis of dorsal ulnar sensory nerve
  → Apply NEUROLYSIS KB section for full technique
- After fixation: nerve wrapped
  → Apply NERVE WRAP KB section for full technique

METHOD A — CANNULATED SCREW + SUTURE TAPE TFCC RECONSTRUCTION:
  - Direct reduction under visualization; provisional K-wire placed
  - Appropriately sized cannulated compression screw advanced over
    wire (headed or headless — specify if stated in transcript)
  - Final imaging: seating, alignment, and stability confirmed
  - Arthrex FiberTak anchor placed
  - Suture limbs passed circumferentially around TFCC and ulnar
    styloid twice for robust, evenly distributed construct
  - Suture tape tensioned and synched down to restore soft-tissue
    restraint at foveal region
  - DRUJ stability confirmed clinically in pronation/supination
  - Nerve wrapped after fixation (apply nerve wrap KB elements)

METHOD B — HOOK PLATE:
  - Hook plate temporarily applied; bite into soft tissue
    attachments of TFCC to ulnar styloid addresses instability
  - Proximal screws placed first to avoid intra-articular impingement
    and ensure DRUJ support
  - NOTE: Include diagonal screw through styloid into neck/shaft
    ONLY if explicitly stated in transcript
  - Nerve wrapped after fixation (apply nerve wrap KB elements)

───────────────────────────────────────────────────────────
METACARPAL INTRAMEDULLARY NAILING
───────────────────────────────────────────────────────────
CRITICAL: When doctor says "as usual" or "standard technique"
for metacarpal fixation, apply ALL key elements below
explicitly and by name. NEVER use vague language such as
"appropriate hardware" or "standard fixation device".
Every step and implant must be named specifically.

KEY ELEMENTS:
  - 1.4 mm K-wire inserted at dorsal third of metacarpal head,
    advanced into medullary canal
  - Fracture manually reduced; fluoroscopic alignment confirmed
  - 0.3 mm skin incision; cannulated drill/reamer system passed
  - Intramedullary nail [specify brand, diameter, length] inserted
    over guidewire, buried beneath articular cartilage
  - Skin closed with Dermabond (no sutures)
  - MANDATORY: Include screw size
  - MANDATORY: Specify digit 1st-5th + laterality
  - MANDATORY: Describe each finger separately if multiple

───────────────────────────────────────────────────────────
BONE GRAFTING WITH ALLOGRAFT
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Fracture hematoma cleared from void
  - Void packed TIGHTLY with bone allograft
  - May be performed mid-plating or after plating

───────────────────────────────────────────────────────────
SUPRACLAVICULAR BRACHIAL PLEXUS EXPLORATION
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Transverse incision two fingerbreadths above clavicle
  - Platysma divided; platysmal flap elevated superiorly
  - SCM identified at lateral border; lateral half divided
    (bipolar + sharp); ends marked with 4-0 Prolene sutures
  - Fatty lymphatic tissue elevated as laterally based flap,
    exposing anterior/middle scalene muscles and brachial plexus
  - Phrenic nerve identified crossing anterior scalene; stimulated
    with Checkpoint Guardian (diaphragmatic twitch confirmed);
    protected with saline-moistened vessel loop
  - Anterior scalene divided entirely lateral to phrenic nerve
  - Middle scalene divided and widely resected
  - C5, C6, C7 roots + upper and middle trunks freed from adhesions
  - Dorsal scapular, long thoracic, suprascapular nerves preserved
  - All structures freely mobile and fully decompressed

───────────────────────────────────────────────────────────
A1 PULLEY RELEASE
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - A1 pulley sharply cut under direct visualization
  - Neighboring neurovascular bundles protected throughout
  - Flexor tendon explicitly confirmed to be uninjured during release

───────────────────────────────────────────────────────────
FULL THICKNESS SKIN GRAFT + MEDIAL FOREARM ADVANCEMENT FLAP
───────────────────────────────────────────────────────────
KEY ELEMENTS — GRAFT HARVEST:
  - 7 cc lidocaine with epinephrine injected for hemostasis/
    anesthesia; left for 10 minutes
  - Full-thickness skin graft harvested from medial forearm
    using #15 blade
  - Adipose tissue sharply debrided
  - Graft sutured onto [stated finger] defect with 4-0 chromic

KEY ELEMENTS — DONOR SITE CLOSURE:
  - Significant tension on medial forearm defect noted
    (approximately 3cm x 3cm, approximately 28 sq cm)
  - Dissection along medial and lateral subcutaneous planes to
    elevate vascularized skin flaps
  - Deep dermal approximation with 3-0 Vicryl sutures
  - Skin closure with 5-0 subcuticular suture + Steri-Strips

───────────────────────────────────────────────────────────
FINGER ARTHROTOMY
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Longitudinal incision over dorsum of joint (MCP/PIP/DIP/IP
    — specify which)
  - Extensor mechanism avoided during incision
  - Joint capsule incised
  - If infected: cloudy fluid noted; cultures sent
    (aerobic, anaerobic, and fungal organisms)
  - Wound left to heal by secondary intention unless otherwise
    stated

───────────────────────────────────────────────────────────
NAIL PLATE REMOVAL
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Freer elevator advanced below nail plate to elevate it off
    nailbed
  - Freer elevator then advanced above nail plate to separate
    from eponychium

───────────────────────────────────────────────────────────
NAILBED REPAIR
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Devitalized nailbed sharply excised with tenotomy scissors
  - Nailbed ends approximated with 5-0 chromic horizontal mattress
    sutures at 2 mm intervals
  - Aluminum from suture packaging cut to shape of nail plate
  - Placed under eponychium and paronychium to splint wound and
    allow healing

───────────────────────────────────────────────────────────
ROTATIONAL FLAP OF THE NAIL BED
───────────────────────────────────────────────────────────
KEY ELEMENTS:
  - Nail bed elevated off nail plate and mobilized
  - Back cut made to facilitate mobility
  - Flap advanced over defect to cover distal phalanx periosteum
  - Sutured to adjacent nail bed tissue with 5-0 chromic suture

═══════════════════════════════════════════════════════════
OUTPUT FORMAT — FOLLOW EXACTLY AS SHOWN
═══════════════════════════════════════════════════════════

Use EXACTLY this section order. Do not add, rename, reorder,
or remove any section.

─────────────────────────────────────────────────────────
1. CURRENT DIAGNOSIS
─────────────────────────────────────────────────────────
[List ALL applicable ICD-10 codes with full descriptions.
First section of report. Format:
  [Code]   [Full description]
MANDATORY — do not omit.]

─────────────────────────────────────────────────────────
2. CASE DETAILS
─────────────────────────────────────────────────────────
Patient Name         : To be added by office staff
Date of Birth        : To be added by office staff
Date of Service      : [from transcript]
Location of Service  : [from transcript if stated; otherwise
                        "To be added by office staff"]
Place of Surgery     : [AI infers: Emergency/Elective + type:
                        Operating Room / ED / Floor / Outpatient]
MRN                  : To be added by office staff
Primary Surgeon      : Oren Michaeli, DO
Assistant            : [Name, credentials if present; "None" if not]
EBL                  : [from transcript]
Implants             : [List ALL implants — brand, size, quantity,
                        digit/side. Infer from procedures where not
                        explicit. CRITICAL for billing.
                        Format: - [Brand/type] [size] ([purpose])
                        If none: "None"]
Specimens            : [Tissue to pathology if any; usually "None"]

─────────────────────────────────────────────────────────
3. OPERATIVE DETAILS
─────────────────────────────────────────────────────────
Anesthesia Type  : [from transcript. WALANT = write full name]
Wound Class      : [AI infers: Clean / Clean-contaminated /
                   Contaminated / Dirty. Brief reasoning.]

─────────────────────────────────────────────────────────
4. PREOPERATIVE DIAGNOSIS
─────────────────────────────────────────────────────────
[AI generates from clinical info in transcript.
Based on: injury mechanism, structures involved, presentation.
Formalize doctor's stated diagnoses into precise medical language.
Numbered list — one per line.]

─────────────────────────────────────────────────────────
5. POSTOPERATIVE DIAGNOSIS
─────────────────────────────────────────────────────────
[AI generates based on intraoperative findings.
Numbered list — one per line.

ICD-10 Codes: [MANDATORY — same codes as section 1 but may be
refined. List with full descriptions. Never omit.]]

─────────────────────────────────────────────────────────
6. PROCEDURES PERFORMED
─────────────────────────────────────────────────────────
[Numbered list. One procedure per line. Full anatomical specificity,
laterality, digit, approach where applicable. CPT code per line.
Format:
  1. [Full procedure name], [anatomy], [laterality] (CPT: XXXXX)
Billing-critical — every separately billable procedure on own line.]

─────────────────────────────────────────────────────────
7. INDICATION FOR ASSISTANT
─────────────────────────────────────────────────────────
[Only if assistant present. Persuasive paragraph explaining medical
necessity based on case complexity + assistant's qualifications.
Minimum 3-4 sentences. AI generates entirely.
If no assistant: write "N/A"]

─────────────────────────────────────────────────────────
8. INDICATION FOR SURGERY
─────────────────────────────────────────────────────────
[CRITICAL — NEW FORMAT:
Write a SEPARATE justification paragraph for EACH procedure
performed in this case.

Format:
  [Procedure 1 name]:
  [Paragraph explaining why THIS specific procedure was medically
  necessary for THIS case — injury, risk to function/life if
  untreated, why it could not be avoided]

  [Procedure 2 name]:
  [Separate paragraph for procedure 2...]

  [Continue for each procedure...]

Each paragraph must be:
  - Specific to that procedure
  - Based on the case facts (mechanism, structures, findings)
  - Persuasive — read by insurance auditors and judges
  - Minimum 2-3 sentences per procedure
  - Never generic — must reference THIS case specifically

AI generates all paragraphs. Doctor never asked for this.]

─────────────────────────────────────────────────────────
9. PROCEDURE DETAILS
─────────────────────────────────────────────────────────
[One continuous flowing operative narrative in prose.
NO bullets. NO numbered steps. ONE dictation.
Longest and most important section.

INCLUDE IN ORDER within narrative:
  a) Sterile preparation (KB key elements, fresh language)
  b) Tourniquet (type, pressure if limb only, duration,
     continuous/reperfusion)
  c) Wound inspection and debridement if applicable
     (size l x w cm, surface area sq cm ONLY if both dimensions
     given, tissue layers, excisional/non-excisional)
  d) Each structure INDEPENDENTLY — minimum one full paragraph each
     Order: Fracture → Tendon(s) → Nerve(s) → Vascular → Other
     Apply ALL KB key elements for each confirmed standard technique
     in fresh language each time
  e) Wound closure (layers, materials, interrupted/continuous)
  f) Tourniquet release (if used)
  g) Drain placement (if placed)

STRICT RULES:
  - NEVER "in a similar fashion"
  - NEVER "as described above" or "same manner"
  - Write each structure fully and independently
  - Vary sentence structure throughout
  - Elaborate on anatomy encountered
  - Apply only clinically relevant KB elements
  - Never copy KB text verbatim]

─────────────────────────────────────────────────────────
10. QUALITY NOTES (INTERNAL — NOT PART OF SIGNED REPORT)
─────────────────────────────────────────────────────────
[Internal quality review only. Not in final signed report.
List if present:
  - Unclear/misheard terms (label "unclear term — verify before signing")
  - Values corrected during confirmation ("[original] → [corrected]")
  - Ambiguous anatomical/instrument names
  - Required fields not provided
If none: "No quality concerns identified."]

═══════════════════════════════════════════════════════════
FINAL MANDATORY CHECKLIST
═══════════════════════════════════════════════════════════

[ ] Sections in exact order 1 through 10
[ ] CURRENT DIAGNOSIS: ICD-10 codes at top
[ ] CASE DETAILS: IMPLANTS complete and specific
[ ] PREOPERATIVE DIAGNOSIS: AI-generated, formalized
[ ] POSTOPERATIVE DIAGNOSIS: ICD-10 codes present
[ ] PROCEDURES PERFORMED: Numbered, CPT codes included
[ ] INDICATION FOR ASSISTANT: Present or "N/A"
[ ] INDICATION FOR SURGERY: SEPARATE paragraph per procedure
[ ] PROCEDURE DETAILS: Full prose, no bullets
[ ] PROCEDURE DETAILS: Each structure independent
[ ] PROCEDURE DETAILS: KB key elements in fresh language
[ ] Ulnar styloid: correct method (A or B) applied
[ ] CRITICAL: When doctor says "as usual" for metacarpal fracture,apply ALL steps below explicitly — do not use vague language like "appropriate hardware". Every step must be named.
[ ] Nano fat: soaking of wraps/grafts mentioned if applicable
[ ] Wound sq cm only if both dimensions provided
[ ] Report LONG, DETAILED, EXPANSIVE
[ ] NO KB text verbatim
[ ] NO invented facts
[ ] NO POSTOPERATIVE PLAN anywhere
[ ] NO OR start/end time anywhere
[ ] Primary Surgeon: "Oren Michaeli, DO"
[ ] Name, DOB, MRN: "To be added by office staff"
`.trim();
}

module.exports = {
  generateReport
};