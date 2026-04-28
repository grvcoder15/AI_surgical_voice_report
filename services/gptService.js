const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Main function to generate a surgical report from a transcript
 * Uses Perplexity for report generation
 * @param {string} transcript - The conversation transcript from the call
 * @returns {Promise<string>} - The generated surgical report
 */
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

/**
 * Generate surgical report using Perplexity API
 * @param {string} transcript - The conversation transcript
 * @returns {Promise<string>} - The generated report
 */
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
          content: 'You are a medical AI assistant that generates professional surgical reports from voice transcripts. Do not invent facts and use "Not specified" when missing.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2
    };

    logger.info(`Perplexity: Sending request to API using model ${model}...`);
    logger.info('Perplexity: Prompt and payload logging enabled');
    logger.info('='.repeat(80));
    logger.info('PERPLEXITY PROMPT (FULL)');
    logger.info('='.repeat(80));
    console.log(prompt);
    logger.info('='.repeat(80));
    logger.info('PERPLEXITY REQUEST PAYLOAD (FULL)');
    logger.info('='.repeat(80));
    console.log(JSON.stringify(requestPayload, null, 2));
    logger.info('='.repeat(80));

    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      requestPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        timeout: 45000
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
 * Generate surgical report using Google Gemini API with retry logic
 * @param {string} transcript - The conversation transcript
 * @returns {Promise<string>} - The generated report
 */
async function generateWithGemini(transcript) {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000; // 1 second
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      
      if (!apiKey || apiKey === 'your_key_here') {
        throw new Error('GEMINI_API_KEY not configured in .env - please add your actual API key');
      }
      
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const prompt = buildSurgicalReportPrompt(transcript);
      
      logger.info(`Gemini (Attempt ${attempt}/${MAX_RETRIES}): Sending request to API...`);
      logger.info(`Gemini: Using model: ${model}`);
      
      const response = await axios.post(endpoint, {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });
      
      // Extract the generated text from Gemini response
      if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
        logger.error(`Gemini: Unexpected response structure: ${JSON.stringify(response.data)}`);
        throw new Error('Invalid response from Gemini API');
      }
      
      const generatedReport = response.data.candidates[0].content.parts[0].text;
      
      logger.info('✅ Gemini: Successfully generated report');
      logger.info(`Gemini: Report length: ${generatedReport.length} characters`);
      return generatedReport;
      
    } catch (error) {
      logger.error(`Gemini API Error (Attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);
      
      if (error.response) {
        logger.error(`Gemini API Status: ${error.response.status}`);
        logger.error(`Gemini API Response: ${JSON.stringify(error.response.data)}`);
        
        // Provide helpful error messages for specific status codes
        if (error.response.status === 404) {
          throw new Error(`Gemini model not found: ${model}. Set GEMINI_MODEL in .env to a supported model such as gemini-2.5-flash or gemini-flash-latest.`);
        } else if (error.response.status === 400) {
          throw new Error(`Gemini API bad request: ${error.response.data.error?.message || 'Invalid request'}`);
        } else if (error.response.status === 403) {
          throw new Error('Gemini API access denied - Please check API key has proper permissions and Generative Language API is enabled');
        } else if (error.response.status === 429) {
          logger.warn('Gemini API rate limit exceeded - will retry...');
          if (attempt < MAX_RETRIES) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
            logger.info(`Waiting ${delay}ms before retry...`);
            await sleep(delay);
            continue;
          }
          throw new Error('Gemini API rate limit exceeded after all retries');
        } else if (error.response.status === 503) {
          logger.warn('Gemini API service temporarily unavailable (503) - will retry...');
          if (attempt < MAX_RETRIES) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
            logger.info(`Waiting ${delay}ms before retry...`);
            await sleep(delay);
            continue;
          }
          throw new Error('Gemini API service temporarily unavailable after all retries');
        }
      }
      
      // For other errors on last attempt, throw
      if (attempt === MAX_RETRIES) {
        throw new Error(`Gemini API failed after ${MAX_RETRIES} attempts: ${error.message}`);
      }
      
      // For other transient errors, retry with backoff
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
      logger.info(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

/**
 * Utility function to sleep for a given number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate surgical report using Azure OpenAI API
 * @param {string} transcript - The conversation transcript
 * @returns {Promise<string>} - The generated report
 */
async function generateWithAzure(transcript) {
  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    
    if (!endpoint || !apiKey || !deploymentName) {
      throw new Error('Azure OpenAI credentials not configured in .env');
    }
    
    const prompt = buildSurgicalReportPrompt(transcript);
    
    logger.info('Azure OpenAI: Sending request to API...');
    
    // Azure OpenAI endpoint format
    const azureEndpoint = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;
    
    const response = await axios.post(
      azureEndpoint,
      {
        messages: [
          {
            role: 'system',
            content: 'You are a medical AI assistant that generates professional surgical reports from voice transcripts.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      }
    );
    
    const generatedReport = response.data.choices[0].message.content;
    
    logger.info('Azure OpenAI: Successfully generated report');
    return generatedReport;
    
  } catch (error) {
    logger.error(`Azure OpenAI API Error: ${error.message}`);
    if (error.response) {
      logger.error(`Azure API Response: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Azure OpenAI API failed: ${error.message}`);
  }
}

/**
 * Build a structured prompt for surgical report generation
 * @param {string} transcript - The voice transcript
 * @returns {string} - The formatted prompt
 */
// function buildSurgicalReportPrompt(transcript) {
//   return `
// You are a professional medical AI assistant. Convert the surgical voice transcript into a comprehensive operative report that is both narrative and structured.

// TRANSCRIPT:
// ${transcript}

// OUTPUT REQUIREMENTS (MUST FOLLOW):

// 1) Start with a clear prose narrative under heading "OPERATIVE NARRATIVE".
// - Write this as a chronological story of the case from indication to closure and postoperative plan.
// - Keep medical documentation tone: concise, formal, and complete.

// 2) Then add heading "KEY STRUCTURED DATA POINTS" and provide bullet points for all extracted facts.
// - Include every usable value from the transcript.
// - Use exact units and numbers when available.

// 3) Then include these formal sections in order:

// 1. **PATIENT INFORMATION**
//    - Patient demographics (age, gender, etc.)
//   - Laterality and anatomic site
//    - If not mentioned, write "Not specified"

// 2. **PRE-OPERATIVE DIAGNOSIS**
//    - Primary diagnosis before surgery
//    - If not mentioned, write "Not specified"

// 3. **PROCEDURE PERFORMED**
//    - Name of the surgical procedure
//    - Type (e.g., laparoscopic, open, etc.)

// 4. **OPERATIVE FINDINGS**
//    - Key findings during the procedure
//    - Anatomical observations
//    - Pathological findings

// 5. **OPERATIVE TECHNIQUE**
//    - Step-by-step description of the surgical approach
//    - Instruments used
//   - Technique details
//   - Tourniquet details (type, pressure, duration)
//   - Wound details (size, depth, tissues, debridement type, closure material)
//   - Nerve repair details (gap/no gap, repair type, stimulation, wrap, standard vs deviation)

// 6. **COMPLICATIONS**
//    - Any complications during surgery
//    - If none, write "None reported"

// 7. **POST-OPERATIVE PLAN**
//    - Recovery instructions
//    - Follow-up care
//    - Medication recommendations

// 8. **QUALITY/CERTAINTY NOTES**
//   - If any term appears unclear or potentially misheard (example: "Volunte"), keep verbatim term and label it as "unclear term from dictation".
//   - If a statement was corrected during confirmation dialogue, use the corrected final value.
//   - List only transcript-supported facts. Do not add unspoken assumptions.

// IMPORTANT:
// - Use professional medical terminology
// - Be detailed but avoid filler text
// - If any information is missing from the transcript, write "Not specified"
// - Do not invent instruments, sutures, prep solutions, procedural steps, or measurements unless explicitly present in transcript
// - Keep final report internally consistent
// `.trim();
// }

function buildSurgicalReportPrompt(transcript) {
  return `
You are an expert hand and peripheral nerve surgeon 
AI assistant generating a medico-legal operative report.

CRITICAL RULES:
- Do NOT invent any facts, instruments, measurements, 
  or techniques not present in transcript
- Do NOT add assumptions
- If information missing: write "Not specified"
- If term unclear or possibly misheard: keep verbatim 
  and label as "(unclear term from dictation)"
- Use corrected values if correction was made during 
  confirmation dialogue
- This is a legal document — accuracy is mandatory

TRANSCRIPT:
${transcript}

STANDARD TECHNIQUE LIBRARY:
Apply these ONLY if doctor confirmed standard technique.
Do NOT apply if deviation was stated.

STERILE PREPARATION:
Clean cases:
- Extremity meticulously scrubbed using surgical-grade sponge
- Dried with sterile towel, process repeated
- Double application of chlorhexidine preparation stick
- Sterile surgical drape applied
- Final chlorhexidine application within sterile field
Contaminated cases:
- Betadine-based solution per contaminated wound protocol

NERVE REPAIR (PRIMARY COAPTATION):
- Neurolysis performed until healthy fascicles and 
  vaso nervosum identified
- Nerve ends sharply debrided using straight microscissors
- Healthy fascicles visible, viable, bleeding, 
  slightly bulging
- Coaptation performed using two interrupted 9-0 
  nylon sutures
- Small gap of approximately 0.1 mm intentionally 
  maintained
- Repair confirmed tension-free
- Fibrin glue applied using drop-drop technique
- Full range of motion tested post-repair

NERVE GRAFT:
- Allograft thawed and trimmed using microscissors
- Both ends coapted using interrupted 9-0 nylon sutures
- Fibrin glue applied proximally and distally

NERVE WRAP:
- Applied circumferentially to minimize axonal 
  sprouting and prevent neuroma formation
- Secured using 9-0 nylon sutures
- Reinforced with fibrin glue

NERVE STIMULATION (ReGen):
- Electrode placed proximal to repair at last 
  healthy segment
- Settings: 100 pulses per second, 10 minutes, 2 mA
- Device and stimulation time documented

VASCULAR ANASTOMOSIS:
- Hematoma and adhesions removed
- Arterial ends mobilized
- Adventitia sharply removed using straight micro-scissors
- Vessel ends debrided until healthy tissue visible
- Vessel bathed in solution of heparin, lidocaine, 
  and papaverine
- Lumen expanded using microscopic vessel dilators
- Vessel approximated using clamps
- Anastomosis performed using 8-0 nylon sutures 
  under magnification
- Perfusion confirmed following clamp release

DISTAL RADIUS VOLAR PLATING (MODIFIED HENRY APPROACH):
- Prior to incision, fracture inspected under 
  fluoroscopic guidance
- Preliminary reduction attempted
- Modified Henry approach utilized
- FCR tendon palpated and longitudinal incision made
- FCR sheath incised sharply and extended using 
  push-cut technique
- FCR retracted ulnarly using Ragnell retractor
- FPL mobilized using finger-sweep dissection
- Pronator quadratus divided using bipolar cautery
- Blunt dissection to expose fracture
- Fracture hematoma evacuated
- Distal screws placed first to restore articular 
  alignment and volar tilt
- Proximal screws placed for longitudinal stability
- Fluoroscopy confirms appropriate screw placement,
  absence of intra-articular penetration, 
  and satisfactory alignment

METACARPAL INTRAMEDULLARY NAILING:
- 1.4 mm K-wire inserted at dorsal third of 
  metacarpal head
- Advanced into medullary canal
- Fracture reduced manually
- Alignment confirmed fluoroscopically
- Skeletal Dynamics intramedullary nail inserted 
  over guidewire
- Implant buried beneath articular cartilage

OUTPUT FORMAT — FOLLOW EXACTLY:

Generate the report using ONLY these headers in order:

PREOPERATIVE DIAGNOSIS
[Single clear diagnostic statement]

POSTOPERATIVE DIAGNOSIS
[Single clear diagnostic statement]

PROCEDURE PERFORMED
[Procedure name and type]

ANESTHESIA
[Type of anesthesia used]

ASSISTANT SURGEON
[Name and reason, or None]

FINDINGS
[Key intraoperative findings as flowing prose]

TECHNIQUE
[Write as continuous narrative prose — NO bullet points.
NO numbered steps. ONE flowing operative story.
Include in this order:
1. Sterile preparation (apply library if standard)
2. Tourniquet application (type, pressure, duration)
3. Wound inspection and debridement if applicable
4. Main procedure (apply technique library if standard)
5. Additional procedures independently described
6. Wound closure details
7. Tourniquet release
8. Drain placement if applicable
Write each structure independently if multiple.
NEVER use phrase "similar fashion".
Vary language throughout.
Read as natural surgical dictation.]

COMPLICATIONS
[None reported, or describe]

POSTOPERATIVE PLAN
[Specific plan as stated by surgeon]

PATIENT INFORMATION
- Name: [from transcript]
- Date of Birth: [from transcript]
- Age: [from transcript]
- Gender: [from transcript]
- Laterality: [from transcript]

QUALITY NOTES
[List any unclear terms from dictation,
any corrections made during confirmation,
any fields that were not specified]

IMPORTANT FINAL RULES:
- Technique section must be flowing narrative prose
- Apply standard technique library only where 
  doctor confirmed standard technique
- Each structure treated independently described
- Report must be legally defensible
- Report must be coding-supportive
- Do NOT invent any facts
`.trim();
}

module.exports = {
  generateReport
};
