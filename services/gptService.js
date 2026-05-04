// const axios = require('axios');
// const logger = require('../utils/logger');

// /**
//  * Main function to generate a surgical report from a transcript
//  * Uses Perplexity for report generation
//  * @param {string} transcript - The conversation transcript from the call
//  * @returns {Promise<string>} - The generated surgical report
//  */
// async function generateReport(transcript) {
//   try {
//     logger.info('GPT Service: Starting report generation using PERPLEXITY');
//     const report = await generateWithPerplexity(transcript);
    
//     logger.info('GPT Service: Report generation completed');
//     return report;
    
//   } catch (error) {
//     logger.error(`GPT Service Error: ${error.message}`);
//     throw new Error(`Failed to generate report: ${error.message}`);
//   }
// }

// /**
//  * Generate surgical report using Perplexity API
//  * @param {string} transcript - The conversation transcript
//  * @returns {Promise<string>} - The generated report
//  */
// async function generateWithPerplexity(transcript) {
//   try {
//     const apiKey = process.env.PERPLEXITY_API_KEY;
//     const model = process.env.PERPLEXITY_MODEL || 'sonar-pro';

//     if (!apiKey || apiKey === 'your_key_here') {
//       throw new Error('PERPLEXITY_API_KEY not configured in .env');
//     }

//     const prompt = buildSurgicalReportPrompt(transcript);

//     const requestPayload = {
//       model,
//       messages: [
//         {
//           role: 'system',
//           content: 'You are a medical AI assistant that generates professional surgical reports from voice transcripts. Do not invent facts and use "Not specified" when missing.'
//         },
//         {
//           role: 'user',
//           content: prompt
//         }
//       ],
//       temperature: 0.2
//     };

//     logger.info(`Perplexity: Sending request to API using model ${model}...`);
//     logger.info('Perplexity: Prompt and payload logging enabled');
//     logger.info('='.repeat(80));
//     logger.info('PERPLEXITY PROMPT (FULL)');
//     logger.info('='.repeat(80));
//     console.log(prompt);
//     logger.info('='.repeat(80));
//     logger.info('PERPLEXITY REQUEST PAYLOAD (FULL)');
//     logger.info('='.repeat(80));
//     console.log(JSON.stringify(requestPayload, null, 2));
//     logger.info('='.repeat(80));

//     const response = await axios.post(
//       'https://api.perplexity.ai/chat/completions',
//       requestPayload,
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${apiKey}`
//         },
//         timeout: 45000
//       }
//     );

//     const generatedReport = response.data?.choices?.[0]?.message?.content;

//     if (!generatedReport) {
//       logger.error(`Perplexity: Unexpected response structure: ${JSON.stringify(response.data)}`);
//       throw new Error('Invalid response from Perplexity API');
//     }

//     logger.info('✅ Perplexity: Successfully generated report');
//     logger.info(`Perplexity: Report length: ${generatedReport.length} characters`);
//     return generatedReport;
//   } catch (error) {
//     logger.error(`Perplexity API Error: ${error.message}`);
//     if (error.response) {
//       logger.error(`Perplexity API Status: ${error.response.status}`);
//       logger.error(`Perplexity API Response: ${JSON.stringify(error.response.data)}`);
//     }
//     throw new Error(`Perplexity API failed: ${error.message}`);
//   }
// }

// /**
//  * Generate surgical report using Google Gemini API with retry logic
//  * @param {string} transcript - The conversation transcript
//  * @returns {Promise<string>} - The generated report
//  */
// async function generateWithGemini(transcript) {
//   const MAX_RETRIES = 3;
//   const INITIAL_RETRY_DELAY = 1000; // 1 second
  
//   for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
//     try {
//       const apiKey = process.env.GEMINI_API_KEY;
//       const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      
//       if (!apiKey || apiKey === 'your_key_here') {
//         throw new Error('GEMINI_API_KEY not configured in .env - please add your actual API key');
//       }
      
//       const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
//       const prompt = buildSurgicalReportPrompt(transcript);
      
//       logger.info(`Gemini (Attempt ${attempt}/${MAX_RETRIES}): Sending request to API...`);
//       logger.info(`Gemini: Using model: ${model}`);
      
//       const response = await axios.post(endpoint, {
//         contents: [
//           {
//             parts: [
//               {
//                 text: prompt
//               }
//             ]
//           }
//         ]
//       }, {
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         timeout: 30000 // 30 second timeout
//       });
      
//       // Extract the generated text from Gemini response
//       if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
//         logger.error(`Gemini: Unexpected response structure: ${JSON.stringify(response.data)}`);
//         throw new Error('Invalid response from Gemini API');
//       }
      
//       const generatedReport = response.data.candidates[0].content.parts[0].text;
      
//       logger.info('✅ Gemini: Successfully generated report');
//       logger.info(`Gemini: Report length: ${generatedReport.length} characters`);
//       return generatedReport;
      
//     } catch (error) {
//       logger.error(`Gemini API Error (Attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);
      
//       if (error.response) {
//         logger.error(`Gemini API Status: ${error.response.status}`);
//         logger.error(`Gemini API Response: ${JSON.stringify(error.response.data)}`);
        
//         // Provide helpful error messages for specific status codes
//         if (error.response.status === 404) {
//           throw new Error(`Gemini model not found: ${model}. Set GEMINI_MODEL in .env to a supported model such as gemini-2.5-flash or gemini-flash-latest.`);
//         } else if (error.response.status === 400) {
//           throw new Error(`Gemini API bad request: ${error.response.data.error?.message || 'Invalid request'}`);
//         } else if (error.response.status === 403) {
//           throw new Error('Gemini API access denied - Please check API key has proper permissions and Generative Language API is enabled');
//         } else if (error.response.status === 429) {
//           logger.warn('Gemini API rate limit exceeded - will retry...');
//           if (attempt < MAX_RETRIES) {
//             const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
//             logger.info(`Waiting ${delay}ms before retry...`);
//             await sleep(delay);
//             continue;
//           }
//           throw new Error('Gemini API rate limit exceeded after all retries');
//         } else if (error.response.status === 503) {
//           logger.warn('Gemini API service temporarily unavailable (503) - will retry...');
//           if (attempt < MAX_RETRIES) {
//             const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
//             logger.info(`Waiting ${delay}ms before retry...`);
//             await sleep(delay);
//             continue;
//           }
//           throw new Error('Gemini API service temporarily unavailable after all retries');
//         }
//       }
      
//       // For other errors on last attempt, throw
//       if (attempt === MAX_RETRIES) {
//         throw new Error(`Gemini API failed after ${MAX_RETRIES} attempts: ${error.message}`);
//       }
      
//       // For other transient errors, retry with backoff
//       const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
//       logger.info(`Retrying in ${delay}ms...`);
//       await sleep(delay);
//     }
//   }
// }

// /**
//  * Utility function to sleep for a given number of milliseconds
//  * @param {number} ms - Milliseconds to sleep
//  * @returns {Promise<void>}
//  */
// function sleep(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

// /**
//  * Generate surgical report using Azure OpenAI API
//  * @param {string} transcript - The conversation transcript
//  * @returns {Promise<string>} - The generated report
//  */
// async function generateWithAzure(transcript) {
//   try {
//     const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
//     const apiKey = process.env.AZURE_OPENAI_API_KEY;
//     const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    
//     if (!endpoint || !apiKey || !deploymentName) {
//       throw new Error('Azure OpenAI credentials not configured in .env');
//     }
    
//     const prompt = buildSurgicalReportPrompt(transcript);
    
//     logger.info('Azure OpenAI: Sending request to API...');
    
//     // Azure OpenAI endpoint format
//     const azureEndpoint = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;
    
//     const response = await axios.post(
//       azureEndpoint,
//       {
//         messages: [
//           {
//             role: 'system',
//             content: 'You are a medical AI assistant that generates professional surgical reports from voice transcripts.'
//           },
//           {
//             role: 'user',
//             content: prompt
//           }
//         ],
//         max_tokens: 2000,
//         temperature: 0.3
//       },
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           'api-key': apiKey
//         }
//       }
//     );
    
//     const generatedReport = response.data.choices[0].message.content;
    
//     logger.info('Azure OpenAI: Successfully generated report');
//     return generatedReport;
    
//   } catch (error) {
//     logger.error(`Azure OpenAI API Error: ${error.message}`);
//     if (error.response) {
//       logger.error(`Azure API Response: ${JSON.stringify(error.response.data)}`);
//     }
//     throw new Error(`Azure OpenAI API failed: ${error.message}`);
//   }
// }

// /**
//  * Build a structured prompt for surgical report generation
//  * @param {string} transcript - The voice transcript
//  * @returns {string} - The formatted prompt
//  */
// // function buildSurgicalReportPrompt(transcript) {
// //   return `
// // You are a professional medical AI assistant. Convert the surgical voice transcript into a comprehensive operative report that is both narrative and structured.

// // TRANSCRIPT:
// // ${transcript}

// // OUTPUT REQUIREMENTS (MUST FOLLOW):

// // 1) Start with a clear prose narrative under heading "OPERATIVE NARRATIVE".
// // - Write this as a chronological story of the case from indication to closure and postoperative plan.
// // - Keep medical documentation tone: concise, formal, and complete.

// // 2) Then add heading "KEY STRUCTURED DATA POINTS" and provide bullet points for all extracted facts.
// // - Include every usable value from the transcript.
// // - Use exact units and numbers when available.

// // 3) Then include these formal sections in order:

// // 1. **PATIENT INFORMATION**
// //    - Patient demographics (age, gender, etc.)
// //   - Laterality and anatomic site
// //    - If not mentioned, write "Not specified"

// // 2. **PRE-OPERATIVE DIAGNOSIS**
// //    - Primary diagnosis before surgery
// //    - If not mentioned, write "Not specified"

// // 3. **PROCEDURE PERFORMED**
// //    - Name of the surgical procedure
// //    - Type (e.g., laparoscopic, open, etc.)

// // 4. **OPERATIVE FINDINGS**
// //    - Key findings during the procedure
// //    - Anatomical observations
// //    - Pathological findings

// // 5. **OPERATIVE TECHNIQUE**
// //    - Step-by-step description of the surgical approach
// //    - Instruments used
// //   - Technique details
// //   - Tourniquet details (type, pressure, duration)
// //   - Wound details (size, depth, tissues, debridement type, closure material)
// //   - Nerve repair details (gap/no gap, repair type, stimulation, wrap, standard vs deviation)

// // 6. **COMPLICATIONS**
// //    - Any complications during surgery
// //    - If none, write "None reported"

// // 7. **POST-OPERATIVE PLAN**
// //    - Recovery instructions
// //    - Follow-up care
// //    - Medication recommendations

// // 8. **QUALITY/CERTAINTY NOTES**
// //   - If any term appears unclear or potentially misheard (example: "Volunte"), keep verbatim term and label it as "unclear term from dictation".
// //   - If a statement was corrected during confirmation dialogue, use the corrected final value.
// //   - List only transcript-supported facts. Do not add unspoken assumptions.

// // IMPORTANT:
// // - Use professional medical terminology
// // - Be detailed but avoid filler text
// // - If any information is missing from the transcript, write "Not specified"
// // - Do not invent instruments, sutures, prep solutions, procedural steps, or measurements unless explicitly present in transcript
// // - Keep final report internally consistent
// // `.trim();
// // }

// function buildSurgicalReportPrompt(transcript) {
//   return `
// You are an expert hand and peripheral nerve surgeon 
// AI assistant generating a medico-legal operative report.

// CRITICAL RULES:
// - Do NOT invent any facts, instruments, measurements, 
//   or techniques not present in transcript
// - Do NOT add assumptions
// - If information missing: write "Not specified"
// - If term unclear or possibly misheard: keep verbatim 
//   and label as "(unclear term from dictation)"
// - Use corrected values if correction was made during 
//   confirmation dialogue
// - This is a legal document — accuracy is mandatory

// TRANSCRIPT:
// ${transcript}

// STANDARD TECHNIQUE LIBRARY:
// Apply these ONLY if doctor confirmed standard technique.
// Do NOT apply if deviation was stated.

// STERILE PREPARATION:
// Clean cases:
// - Extremity meticulously scrubbed using surgical-grade sponge
// - Dried with sterile towel, process repeated
// - Double application of chlorhexidine preparation stick
// - Sterile surgical drape applied
// - Final chlorhexidine application within sterile field
// Contaminated cases:
// - Betadine-based solution per contaminated wound protocol

// NERVE REPAIR (PRIMARY COAPTATION):
// - Neurolysis performed until healthy fascicles and 
//   vaso nervosum identified
// - Nerve ends sharply debrided using straight microscissors
// - Healthy fascicles visible, viable, bleeding, 
//   slightly bulging
// - Coaptation performed using two interrupted 9-0 
//   nylon sutures
// - Small gap of approximately 0.1 mm intentionally 
//   maintained
// - Repair confirmed tension-free
// - Fibrin glue applied using drop-drop technique
// - Full range of motion tested post-repair

// NERVE GRAFT:
// - Allograft thawed and trimmed using microscissors
// - Both ends coapted using interrupted 9-0 nylon sutures
// - Fibrin glue applied proximally and distally

// NERVE WRAP:
// - Applied circumferentially to minimize axonal 
//   sprouting and prevent neuroma formation
// - Secured using 9-0 nylon sutures
// - Reinforced with fibrin glue

// NERVE STIMULATION (ReGen):
// - Electrode placed proximal to repair at last 
//   healthy segment
// - Settings: 100 pulses per second, 10 minutes, 2 mA
// - Device and stimulation time documented

// VASCULAR ANASTOMOSIS:
// - Hematoma and adhesions removed
// - Arterial ends mobilized
// - Adventitia sharply removed using straight micro-scissors
// - Vessel ends debrided until healthy tissue visible
// - Vessel bathed in solution of heparin, lidocaine, 
//   and papaverine
// - Lumen expanded using microscopic vessel dilators
// - Vessel approximated using clamps
// - Anastomosis performed using 8-0 nylon sutures 
//   under magnification
// - Perfusion confirmed following clamp release

// DISTAL RADIUS VOLAR PLATING (MODIFIED HENRY APPROACH):
// - Prior to incision, fracture inspected under 
//   fluoroscopic guidance
// - Preliminary reduction attempted
// - Modified Henry approach utilized
// - FCR tendon palpated and longitudinal incision made
// - FCR sheath incised sharply and extended using 
//   push-cut technique
// - FCR retracted ulnarly using Ragnell retractor
// - FPL mobilized using finger-sweep dissection
// - Pronator quadratus divided using bipolar cautery
// - Blunt dissection to expose fracture
// - Fracture hematoma evacuated
// - Distal screws placed first to restore articular 
//   alignment and volar tilt
// - Proximal screws placed for longitudinal stability
// - Fluoroscopy confirms appropriate screw placement,
//   absence of intra-articular penetration, 
//   and satisfactory alignment

// METACARPAL INTRAMEDULLARY NAILING:
// - 1.4 mm K-wire inserted at dorsal third of 
//   metacarpal head
// - Advanced into medullary canal
// - Fracture reduced manually
// - Alignment confirmed fluoroscopically
// - Skeletal Dynamics intramedullary nail inserted 
//   over guidewire
// - Implant buried beneath articular cartilage

// OUTPUT FORMAT — FOLLOW EXACTLY:

// Generate the report using ONLY these headers in order:

// PREOPERATIVE DIAGNOSIS
// [Single clear diagnostic statement]

// POSTOPERATIVE DIAGNOSIS
// [Single clear diagnostic statement]

// PROCEDURE PERFORMED
// [Procedure name and type]

// ANESTHESIA
// [Type of anesthesia used]

// ASSISTANT SURGEON
// [Name and reason, or None]

// FINDINGS
// [Key intraoperative findings as flowing prose]

// TECHNIQUE
// [Write as continuous narrative prose — NO bullet points.
// NO numbered steps. ONE flowing operative story.
// Include in this order:
// 1. Sterile preparation (apply library if standard)
// 2. Tourniquet application (type, pressure, duration)
// 3. Wound inspection and debridement if applicable
// 4. Main procedure (apply technique library if standard)
// 5. Additional procedures independently described
// 6. Wound closure details
// 7. Tourniquet release
// 8. Drain placement if applicable
// Write each structure independently if multiple.
// NEVER use phrase "similar fashion".
// Vary language throughout.
// Read as natural surgical dictation.]

// COMPLICATIONS
// [None reported, or describe]

// POSTOPERATIVE PLAN
// [Specific plan as stated by surgeon]

// PATIENT INFORMATION
// - Name: [from transcript]
// - Date of Birth: [from transcript]
// - Age: [from transcript]
// - Gender: [from transcript]
// - Date of Surgery: [from transcript]
// - Surgery Start Time: [from transcript]
// - Surgery End Time: [from transcript]
// - Total Duration: [calculated from start and end time]
// - Laterality: [from transcript]

// QUALITY NOTES
// [List any unclear terms from dictation,
// any corrections made during confirmation,
// any fields that were not specified]

// IMPORTANT FINAL RULES:
// - Technique section must be flowing narrative prose
// - Apply standard technique library only where 
//   doctor confirmed standard technique
// - Each structure treated independently described
// - Report must be legally defensible
// - Report must be coding-supportive
// - Do NOT invent any facts
// `.trim();
// }


// module.exports = {
//   generateReport
// };


//---------------------------------------------------------------
// Updated GPT Service with enhanced logging and error handling
// Added Google Gemini generation method with retry logic
// Refined prompt for improved report quality
// ----------------------------------------------

// const axios = require('axios');
// const logger = require('../utils/logger');

// /**
//  * Main function to generate a surgical report from a transcript
//  * Uses Perplexity for report generation
//  * @param {string} transcript - The conversation transcript from the call
//  * @returns {Promise<string>} - The generated surgical report
//  */
// async function generateReport(transcript) {
//   try {
//     logger.info('GPT Service: Starting report generation using PERPLEXITY');
//     const report = await generateWithPerplexity(transcript);
//     logger.info('GPT Service: Report generation completed');
//     return report;
//   } catch (error) {
//     logger.error(`GPT Service Error: ${error.message}`);
//     throw new Error(`Failed to generate report: ${error.message}`);
//   }
// }

// /**
//  * Generate surgical report using Perplexity API
//  */
// async function generateWithPerplexity(transcript) {
//   try {
//     const apiKey = process.env.PERPLEXITY_API_KEY;
//     const model = process.env.PERPLEXITY_MODEL || 'sonar-pro';

//     if (!apiKey || apiKey === 'your_key_here') {
//       throw new Error('PERPLEXITY_API_KEY not configured in .env');
//     }

//     const prompt = buildSurgicalReportPrompt(transcript);

//     const requestPayload = {
//       model,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are an expert surgical documentation AI generating medico-legal operative reports for a hand and peripheral nerve surgeon. ' +
//             'Reports must be detailed, expansive, and professionally impressive — written as if for a court or insurance auditor. ' +
//             'Never copy template text verbatim. Always restate techniques in fresh, varied language. ' +
//             'Never invent facts. ICD-10 codes are mandatory. ' +
//             'Use "Not specified" for any missing field.'
//         },
//         {
//           role: 'user',
//           content: prompt
//         }
//       ],
//       max_tokens: 4000,
//       temperature: 0.4
//     };

//     logger.info(`Perplexity: Sending request to API using model ${model}...`);
//     logger.info('='.repeat(80));
//     logger.info('PERPLEXITY PROMPT (FULL)');
//     logger.info('='.repeat(80));
//     console.log(prompt);
//     logger.info('='.repeat(80));

//     const response = await axios.post(
//       'https://api.perplexity.ai/chat/completions',
//       requestPayload,
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${apiKey}`
//         },
//         timeout: 60000
//       }
//     );

//     const generatedReport = response.data?.choices?.[0]?.message?.content;

//     if (!generatedReport) {
//       logger.error(`Perplexity: Unexpected response structure: ${JSON.stringify(response.data)}`);
//       throw new Error('Invalid response from Perplexity API');
//     }

//     logger.info('✅ Perplexity: Successfully generated report');
//     logger.info(`Perplexity: Report length: ${generatedReport.length} characters`);
//     return generatedReport;
//   } catch (error) {
//     logger.error(`Perplexity API Error: ${error.message}`);
//     if (error.response) {
//       logger.error(`Perplexity API Status: ${error.response.status}`);
//       logger.error(`Perplexity API Response: ${JSON.stringify(error.response.data)}`);
//     }
//     throw new Error(`Perplexity API failed: ${error.message}`);
//   }
// }

// /**
//  * Generate surgical report using Google Gemini API with retry logic
//  */
// async function generateWithGemini(transcript) {
//   const MAX_RETRIES = 3;
//   const INITIAL_RETRY_DELAY = 1000;

//   for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
//     try {
//       const apiKey = process.env.GEMINI_API_KEY;
//       const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

//       if (!apiKey || apiKey === 'your_key_here') {
//         throw new Error('GEMINI_API_KEY not configured in .env - please add your actual API key');
//       }

//       const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
//       const prompt = buildSurgicalReportPrompt(transcript);

//       logger.info(`Gemini (Attempt ${attempt}/${MAX_RETRIES}): Sending request to API...`);

//       const response = await axios.post(
//         endpoint,
//         { contents: [{ parts: [{ text: prompt }] }] },
//         { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
//       );

//       if (!response.data?.candidates?.[0]) {
//         throw new Error('Invalid response from Gemini API');
//       }

//       const generatedReport = response.data.candidates[0].content.parts[0].text;
//       logger.info('✅ Gemini: Successfully generated report');
//       return generatedReport;
//     } catch (error) {
//       logger.error(`Gemini API Error (Attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);

//       if (error.response) {
//         const status = error.response.status;
//         if (status === 404) throw new Error('Gemini model not found. Check GEMINI_MODEL in .env');
//         if (status === 400) throw new Error(`Gemini bad request: ${error.response.data.error?.message}`);
//         if (status === 403) throw new Error('Gemini API access denied — check API key permissions');
//         if ((status === 429 || status === 503) && attempt < MAX_RETRIES) {
//           const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
//           logger.warn(`Rate limit — retrying in ${delay}ms...`);
//           await sleep(delay);
//           continue;
//         }
//       }

//       if (attempt === MAX_RETRIES) {
//         throw new Error(`Gemini API failed after ${MAX_RETRIES} attempts: ${error.message}`);
//       }
//       await sleep(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1));
//     }
//   }
// }

// /**
//  * Generate surgical report using Azure OpenAI API
//  */
// async function generateWithAzure(transcript) {
//   try {
//     const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
//     const apiKey = process.env.AZURE_OPENAI_API_KEY;
//     const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

//     if (!endpoint || !apiKey || !deploymentName) {
//       throw new Error('Azure OpenAI credentials not configured in .env');
//     }

//     const prompt = buildSurgicalReportPrompt(transcript);
//     logger.info('Azure OpenAI: Sending request to API...');

//     const azureEndpoint = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;

//     const response = await axios.post(
//       azureEndpoint,
//       {
//         messages: [
//           { role: 'system', content: 'You are a medical AI assistant that generates professional surgical reports from voice transcripts.' },
//           { role: 'user', content: prompt }
//         ],
//         max_tokens: 6000,
//         temperature: 0.4
//       },
//       { headers: { 'Content-Type': 'application/json', 'api-key': apiKey } }
//     );

//     const generatedReport = response.data.choices[0].message.content;
//     logger.info('Azure OpenAI: Successfully generated report');
//     return generatedReport;
//   } catch (error) {
//     logger.error(`Azure OpenAI API Error: ${error.message}`);
//     throw new Error(`Azure OpenAI API failed: ${error.message}`);
//   }
// }

// function sleep(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// /**
//  * Build a structured prompt for surgical report generation.
//  *
//  * VERSION HISTORY:
//  *   v1 — Initial version
//  *   v2 — Meeting fixes (OR time removed, long style, KB key elements,
//  *         Indication for Surgery, numbered procedures, wound sq cm)
//  *   v3 — Test conversation fixes (ICD-10 in summary, module order,
//  *         preop diagnosis explicit, clinical term clarification)
//  *   v4 — CURRENT. Major structural fix from actual Dr. Oren reports analysis:
//  *         STRUCTURAL-1: Report section order now matches actual reports exactly
//  *         STRUCTURAL-2: "Current Diagnosis" (ICD-10) added as FIRST section
//  *         STRUCTURAL-3: IMPLANTS section added to Case Details (critical for billing)
//  *         STRUCTURAL-4: SPECIMENS field added
//  *         STRUCTURAL-5: Location of Service + Place of Surgery added
//  *         STRUCTURAL-6: Standalone TOURNIQUET, WOUND, FINDINGS sections REMOVED —
//  *                        all folded into PROCEDURE DETAILS as per actual reports
//  *         STRUCTURAL-7: TECHNIQUE renamed to PROCEDURE DETAILS
//  *         STRUCTURAL-8: "Indication for Assistant" is its OWN separate section,
//  *                        separate from "Indication for Surgery"
//  *         STRUCTURAL-9: PREOPERATIVE DIAGNOSIS — AI generates this from clinical
//  *                        info in transcript (confirmed in meeting: "I want the AI
//  *                        to come up with the preoperative diagnoses"). FIX-A reverted.
//  *         STRUCTURAL-10: QUALITY NOTES kept but marked as internal/review use
//  *         KB-FIX-E: RPNI key elements corrected (1.5x1.5cm, 8-0 nylon, soft tissue bed)
//  *         KB-FIX-F: VRPNI key elements corrected (vascular pedicle, epineurial-to-endomysial)
//  *         KB-FIX-G: Nano Fat / Fat Grafting updated (100cc tumescent, umbilicus, Tulip filters)
//  *         KB-FIX-B: Supraclavicular Brachial Plexus added
//  *         KB-FIX-C: Ulnar Styloid Fixation added
//  *         KB-FIX-D: Bone Grafting with Allograft added
//  */
// function buildSurgicalReportPrompt(transcript) {
//   return `
// You are an expert hand and peripheral nerve surgeon AI assistant
// generating a medico-legal operative report.

// ═══════════════════════════════════════════════════════════
// ABSOLUTE RULES — NEVER VIOLATE
// ═══════════════════════════════════════════════════════════

// 1. Do NOT invent any facts, instruments, measurements, sutures,
//    techniques, or findings not present in the transcript.
// 2. If information is missing: write "Not specified".
// 3. If a term is unclear or possibly misheard by voice recognition:
//    keep the verbatim term and label it "(unclear term — recommend
//    surgeon verify before signing)".
// 4. If the doctor corrected a value during confirmation dialogue:
//    use ONLY the corrected final value. Discard the original.
// 5. This is a legal document submitted to courts and insurance auditors.
//    Every sentence must be defensible and transcript-supported.
// 6. ICD-10 codes are MANDATORY in both CURRENT DIAGNOSIS (top) and
//    POSTOPERATIVE DIAGNOSIS sections. Do not omit under any circumstance.
// 7. POSTOPERATIVE PLAN section does NOT exist in this report.
//    Do not create it. Do not mention it anywhere.
// 8. OR start time, OR end time, and total OR duration are NOT included
//    in this report. Do not add them anywhere.
// 9. Primary Surgeon is ALWAYS: Oren Michaeli, DO. Do not change this.

// ═══════════════════════════════════════════════════════════
// REPORT STYLE — CRITICAL REQUIREMENT
// ═══════════════════════════════════════════════════════════

// This report is read by insurance auditors, judges, and attorneys.
// The goal is NOT brevity. The goal is:
//   - Expansive, detailed, and professionally impressive
//   - Written as if describing a highly complex and significant procedure
//   - Thorough enough that even a small procedure reads as grand and complete

// NEVER summarize when you can elaborate.
// NEVER write 2 words when 2 paragraphs make a stronger case.
// Every clinical action deserves a full sentence or more.
// Discuss anatomy encountered — AI may appropriately expand on the
// anatomical structures and relationships observed during the procedure.

// LANGUAGE VARIATION — MANDATORY:
//   - NEVER copy Knowledge Base text verbatim or word-for-word.
//   - Insurance companies flag identical template language across reports.
//   - Use KB sections to know WHAT key elements must be mentioned.
//   - Write every report in fresh, natural, varied clinical language.
//   - Each report must read as if personally dictated by the surgeon
//     recalling this specific case — not read from a template.

// ═══════════════════════════════════════════════════════════
// TRANSCRIPT
// ═══════════════════════════════════════════════════════════

// ${transcript}

// ═══════════════════════════════════════════════════════════
// DR. OREN STANDARD TECHNIQUE LIBRARY
// ═══════════════════════════════════════════════════════════

// Apply ONLY when doctor confirmed standard technique or said
// "as usual" / "knowledge base" / "same as always".
// Do NOT apply if doctor stated a deviation.

// IMPORTANT: Each section lists KEY ELEMENTS that must appear in
// the report. Describe ALL elements in fresh, varied language
// every time — never copy the text below verbatim.

// ───────────────────────────────────────────────────────────
// STERILE PREPARATION
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS (clean cases):
//   - Extremity scrubbed with surgical-grade sponge
//   - Dried with sterile towel, process repeated
//   - Chlorhexidine prep applied twice to extremity
//   - Sterile surgical drape applied
//   - Final chlorhexidine application within sterile field

// KEY ELEMENTS (contaminated or dirty cases):
//   - Betadine-based solution used per contaminated wound protocols

// ───────────────────────────────────────────────────────────
// TENDON REPAIR
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS (standard 4-strand FiberLoop repair):
//   - Tendon ends identified and retrieved atraumatically
//   - 4-strand core repair using 4-0 FiberLoop suture
//   - Epitendinous running suture using 6-0 polypropylene
//   - Full range of motion tested — no gapping, no triggering

// KEY ELEMENTS (partial laceration less than 60%):
//   - Figure-of-eight repair using 4-0 FiberLoop

// ───────────────────────────────────────────────────────────
// NERVE REPAIR — PRIMARY COAPTATION (no gap)
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS:
//   - Neurolysis on both nerve ends until healthy vaso nervosum visible
//   - Sharp debridement with straight microscissors until healthy,
//     bleeding, bulging fascicles visible (may be described as
//     resembling a bug's eyes)
//   - Coaptation with two interrupted 9-0 nylon sutures
//   - Intentional 0.1 mm light gap maintained (tension-free;
//     may be described as a grandmother's kiss)
//   - Fibrin glue applied using drop-drop technique
//   - Limb or digit fully ranged to confirm suture line integrity
//     (EXCEPTION: omit range-of-motion if joint was fused or K-wired)

// ───────────────────────────────────────────────────────────
// NERVE GRAFT (gap present — allograft)
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS:
//   - Neurolysis and sharp debridement of both nerve ends as above
//   - Allograft thawed and trimmed to match gap length and diameter
//   - Proximal coaptation with interrupted 9-0 nylon
//   - Distal coaptation with interrupted 9-0 nylon
//   - Fibrin glue applied at both anastomotic sites

// ───────────────────────────────────────────────────────────
// NERVE WRAP
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS:
//   - Wrap placed circumferentially around nerve repair
//   - Purpose: minimize axonal sprouting, prevent neuroma formation
//   - Secured with 9-0 nylon sutures
//   - Reinforced with fibrin glue

// ───────────────────────────────────────────────────────────
// NERVE STIMULATION — ReGen (intraoperative)
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS:
//   - Electrode placed proximal to repair at last healthy nerve segment
//   - Settings: 100 pulses per second, 2 mA, 10 minutes total duration
//   - Device used and stimulation time documented

// ───────────────────────────────────────────────────────────
//   NERVE DESCRIPTION RULE:
// ─────────────────────────────────────────────────────────── 

// For nerve procedures:
// - Describe preparation, repair, and protection conceptually
// - DO NOT include:
//   - exact suture sizes
//   - exact technique phrases (e.g., "bug’s eye", "grandmother’s kiss")
//   - exact numeric gaps unless provided
// - Only include graft, wrap, or stimulation if explicitly stated

// ───────────────────────────────────────────────────────────
// FAT GRAFTING — NANO FAT (Tulip system)
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS:
//   - 100 cc tumescent fluid (saline, lidocaine, epinephrine)
//     infiltrated into lower abdomen
//   - Suction cannula introduced through the umbilicus
//   - Fat harvested using Tulip cannula under manual suction pressure
//   - Gravity separation performed; supernatant and infranatant
//     discarded
//   - Fat processed through sequential Tulip filters to create nanofat
//   - Approximately 10 cc reserved and prepared for injection
//   - Nanofat injected at target area using micro-cannulas

// ───────────────────────────────────────────────────────────
// RPNI (Regenerative Peripheral Nerve Interface)
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS:
//   - Free muscle graft harvested from [stated target muscle]
//   - Graft dimensions: approximately 1.5 cm x 1.5 cm, 1-2 mm thick
//   - Graft deinnervated (denervated free muscle graft)
//   - Nerve end encased within graft using interrupted 8-0 nylon sutures
//   - Entire configuration implanted in robust neighboring soft tissue
//     bed to promote vascularity and imbibition

// ───────────────────────────────────────────────────────────
// VRPNI (Vascularized Regenerative Peripheral Nerve Interface)
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS:
//   - Size-matched muscle fascicle elevated from [stated target muscle]
//     on intact vascular pedicle, preserving blood supply
//   - Fascicle intentionally denervated — native neural input disrupted
//     while vascular inflow maintained — creating vascularized yet
//     denervated muscle with vacant motor end plates for reinnervation
//   - Nerve prepared with proximal neurolysis and sharp debridement
//     until healthy fascicles and vaso nervosum identified
//   - Nerve coapted to muscle fascicle with interrupted 9-0 nylon
//     epineurial-to-endomysial sutures under magnification
//   - Construct inset tension-free without twisting or kinking of
//     vascular pedicle
//   - Final configuration placed in stable, well-vascularized soft
//     tissue bed to promote reinnervation and reduce neuroma risk

// ───────────────────────────────────────────────────────────
// VASCULAR ANASTOMOSIS
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS:
//   - Hematoma and adhesions cleared from operative field
//   - Arterial ends mobilized
//   - Adventitia sharply removed with straight micro-scissors
//   - Vessel ends debrided to healthy tissue
//   - Vessel bathed in heparin, lidocaine, and papaverine solution
//   - Lumen expanded with microscopic vessel dilators
//   - Vessel approximated with vascular clamps
//   - Anastomosis with 8-0 nylon interrupted sutures under magnification
//   - Perfusion confirmed after clamp release

// ───────────────────────────────────────────────────────────
// DISTAL RADIUS VOLAR PLATING (Modified Henry Approach)
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS:
//   - Fluoroscopic inspection prior to incision; preliminary reduction
//   - Modified Henry approach; FCR palpated; 10 cm incision with 15 blade
//   - FCR sheath incised with push-cut technique (tenotomy scissors)
//   - FCR retracted ulnarly with Ragnell retractor
//   - FPL freed with finger-sweep dissection
//   - Pronator quadratus divided with bipolar; blunt dissection to fracture
//   - Hematoma evacuated with freer elevator
//   - DRUJ stability assessed (if ulnar styloid fracture present)
//   - Volar plate fixed distally first, then proximal screws placed
//   - Fluoroscopy confirms screw placement, no intra-articular
//     penetration, satisfactory alignment
//   - IF ARTHROSCOPIC ASSIST: arthroscope introduced dorsally at
//     Lister's tubercle; 6R portal created; fragments adjusted to 0mm
//     step-off; verified arthroscopically and fluoroscopically

// ───────────────────────────────────────────────────────────
// ULNAR STYLOID FIXATION
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS:
//   - 2 cm incision between ECU and FCU
//   - Ulnar sensory nerve identified and protected
//   - TFCC instability addressed with specialized hook plate
//   - Screws placed proximally to avoid intra-articular impingement
//   - NOTE: Include diagonal screw ONLY if explicitly stated in transcript

// ───────────────────────────────────────────────────────────
// METACARPAL INTRAMEDULLARY NAILING
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS:
//   - 1.4 mm K-wire inserted at dorsal third of metacarpal head,
//     advanced into medullary canal
//   - Fracture manually reduced; fluoroscopic alignment confirmed
//   - 0.3 mm skin incision; cannulated drill/reamer system passed
//   - Skeletal Dynamics intramedullary nail inserted over guidewire,
//     buried beneath articular cartilage
//   - MANDATORY: Include screw size
//   - MANDATORY: Specify digit 1st-5th (1st=thumb, 5th=small) + laterality
//   - MANDATORY: Describe each finger separately if multiple involved

// ───────────────────────────────────────────────────────────
// BONE GRAFTING WITH ALLOGRAFT
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS:
//   - Fracture hematoma cleared from void
//   - Void packed TIGHTLY with bone allograft
//   - May be performed mid-plating or after plating as anatomically
//     appropriate — describe at correct point in narrative

// ───────────────────────────────────────────────────────────
// SUPRACLAVICULAR BRACHIAL PLEXUS EXPLORATION
// ───────────────────────────────────────────────────────────
// KEY ELEMENTS:
//   - Transverse incision two fingerbreadths above clavicle through
//     skin and subcutaneous tissue to clavicle level
//   - Platysma divided; platysmal flap elevated superiorly
//   - SCM identified at lateral border; lateral half divided with
//     bipolar and sharp dissection
//   - Proximal and distal SCM ends marked with 4-0 Prolene sutures
//   - Fatty lymphatic tissue elevated as laterally based flap,
//     exposing anterior/middle scalene muscles and brachial plexus
//   - Phrenic nerve identified crossing anterior scalene; confirmed
//     with Checkpoint Guardian stimulator (diaphragmatic twitch);
//     protected with saline-moistened vessel loop
//   - Anterior scalene divided entirely lateral to phrenic nerve
//   - Middle scalene divided and widely resected
//   - C5, C6, C7 roots with upper and middle trunks visualized,
//     freed from fascial adhesions
//   - Dorsal scapular, long thoracic, suprascapular nerves visualized
//     and preserved
//   - All interscalene structures freely mobile and fully decompressed

// ═══════════════════════════════════════════════════════════
// OUTPUT FORMAT — FOLLOW EXACTLY AS SHOWN
// ═══════════════════════════════════════════════════════════

// IMPORTANT: Use EXACTLY this section order. This matches Dr. Oren's
// actual operative report format. Do not add, rename, reorder, or
// remove any section.

// ─────────────────────────────────────────────────────────
// 1. CURRENT DIAGNOSIS
// ─────────────────────────────────────────────────────────
// [List ALL applicable ICD-10 codes with full descriptions.
// This is the very first section of the report.
// Format each line as:
//   [Code]   [Full description]
// Example:
//   S64.20XA   Injury of nerve at wrist and hand level, initial encounter
//   S66.001A   Unspecified injury of flexor tendon of right thumb

// Generate all relevant primary and secondary codes based on
// the procedures performed and injuries described.
// MANDATORY — do not omit this section.]

// ─────────────────────────────────────────────────────────
// 2. CASE DETAILS
// ─────────────────────────────────────────────────────────
// Patient Name         : [To be added by office staff]
// Date of Birth        : [To be added by office staff]
// Date of Service      : [from transcript]
// Location of Service  : [from transcript if stated; otherwise
//                        "To be added by office staff"]
// Place of Surgery     : [AI infers from case context:
//                        Emergency or Elective, then type:
//                        Operating Room / Emergency Department /
//                        Hospital Floor Bed / Outpatient]
// MRN                  : [To be added by office staff]
// Primary Surgeon      : Oren Michaeli, DO
// Assistant            : [Name, credentials if present;
//                        "None" if no assistant]
// EBL                  : [from transcript]
// Implants             : [List ALL implants used — brand, size, quantity,
//                        side/digit where applicable.
//                        Infer from procedures performed where not
//                        explicitly stated (e.g., nerve allograft used
//                        if nerve graft described, K-wires if fixation done).
//                        This field is CRITICAL for billing.
//                        Format:
//                          - [Brand/type] [size] ([location/purpose])
//                        If no implants: "None"]
// Specimens            : [If tissue was sent to pathology: describe.
//                        Usually: "None"]

// ─────────────────────────────────────────────────────────
// 3. OPERATIVE DETAILS
// ─────────────────────────────────────────────────────────
// Anesthesia Type  : [from transcript. If WALANT: write full name:
//                    "Wide Awake Local Anesthesia No Tourniquet (WALANT)"]
// Wound Class      : [AI infers automatically:
//                    Clean / Clean-contaminated / Contaminated / Dirty
//                    Include brief reasoning in parentheses.
//                    Example: "Dirty (traumatic industrial saw injury
//                    with devitalized tissue and foreign material)"]

// ─────────────────────────────────────────────────────────
// 4. PREOPERATIVE DIAGNOSIS
// ─────────────────────────────────────────────────────────
// [AI generates this from the clinical information in the transcript.
// Base it on: injury mechanism, structures involved, symptoms described,
// and clinical presentation.
// Do NOT simply copy what the doctor said verbatim — formalize and
// expand into complete, medically precise diagnostic statements.
// List each diagnosis on its own numbered line.
// If the doctor explicitly stated diagnoses, use those as the
// primary basis and formalize them.
// This should read as a clinical diagnosis list, not a narrative.]

// ─────────────────────────────────────────────────────────
// 5. POSTOPERATIVE DIAGNOSIS
// ─────────────────────────────────────────────────────────
// [AI generates this based on intraoperative findings described.
// Reflect what was found and repaired during the procedure.
// May elaborate on preoperative diagnosis based on findings.
// List each on its own numbered line.

// ICD-10 Codes: [MANDATORY — list all applicable codes with full
// descriptions. Same codes as CURRENT DIAGNOSIS section but
// may be expanded/refined based on intraoperative findings.
// Do not omit under any circumstance.]]

// ─────────────────────────────────────────────────────────
// 6. PROCEDURES PERFORMED
// ─────────────────────────────────────────────────────────
// [Numbered list. One procedure per line. Include full anatomical
// specificity, laterality, digit number, approach where applicable.
// Include CPT code where clearly determinable.
// Format:
//   1. [Full procedure name], [anatomy], [laterality] (CPT: XXXXX)
//   2. [Full procedure name], [anatomy], [laterality] (CPT: XXXXX)

// Be as specific as possible — this is used for billing.
// Each procedure billed separately must appear as its own line.]

// ─────────────────────────────────────────────────────────
// 7. INDICATION FOR ASSISTANT
// ─────────────────────────────────────────────────────────
// [Include ONLY if an assistant surgeon was present.
// Write a formal, persuasive paragraph explaining why an assistant
// was medically necessary for THIS specific case.
// Base argument on:
//   (1) Complexity and nature of the injury and procedures
//   (2) Assistant's specialty, years in practice, board certifications
// Insurance companies scrutinize this — make it compelling.
// AI generates entirely. Doctor never dictates this.
// Minimum 3-4 sentences.

// If no assistant was present: write "N/A"]

// ─────────────────────────────────────────────────────────
// 8. INDICATION FOR SURGERY
// ─────────────────────────────────────────────────────────
// [AI generates this entire section.
// Write a compelling, detailed explanation of why surgical
// intervention was medically necessary.
// Base on: injury mechanism, structures injured, clinical presentation,
// and risk to function/life if untreated.
// This is read by insurance auditors and judges.
// Must be persuasive, thorough, and specific to THIS case.
// Minimum 2 full paragraphs.
// Never ask the doctor to provide this — AI always generates it.]

// ─────────────────────────────────────────────────────────
// 9. PROCEDURE DETAILS
// ─────────────────────────────────────────────────────────
// [Write as one continuous, flowing operative narrative in prose.
// NO bullet points. NO numbered steps. ONE flowing dictation.
// This is the longest and most important section.

// INCLUDE IN THIS ORDER within the narrative:

//   a) STERILE PREPARATION
//      Apply KB key elements in fresh varied language.
//      State wound classification in this section.

//   b) TOURNIQUET (if used)
//      Describe fully within the narrative:
//      - Type (finger or limb)
//      - Pressure if limb tourniquet (NEVER state pressure for finger)
//      - Application time
//      - Continuous or reperfusion intervals
//      If not used: state this clearly.

//   c) WOUND INSPECTION AND DEBRIDEMENT (if wound present)
//      Describe fully within narrative:
//      - Size: length x width (cm)
//      - Surface area: calculated sq cm (ONLY if both dimensions given.
//        If only length given, note: "width not specified — sq cm
//        not calculable")
//      - Depth and tissue layers involved
//      - Excisional or non-excisional debridement
//      State wound classification again here if not already mentioned.

//   d) EACH INJURED STRUCTURE — INDEPENDENTLY
//      Write one full paragraph minimum for EACH structure.
//      Order: Fracture → Tendon(s) → Nerve(s) → Vascular → Other
//      For each: apply ALL KB key elements in fresh language.
//      NEVER use "as described above" or "in a similar fashion"
//      NEVER cross-reference one structure to another
//      Write each structure completely from scratch with full detail.

//   e) WOUND CLOSURE
//      Describe each layer closed and material used:
//      - Which layers (subcutaneous, skin, etc.)
//      - Suture material and size for each layer
//      - Interrupted vs continuous

//   f) TOURNIQUET RELEASE (if tourniquet was used)
//      State when released and hemostasis confirmed.

//   g) DRAIN PLACEMENT (if drain was placed)
//      Type and location.

// RULES:
//   - Vary sentence structure and vocabulary throughout
//   - Elaborate on anatomy encountered where clinically appropriate
//   - NEVER use "in a similar fashion" anywhere in this section
//   - NEVER reference previous structures with "as above" or "same manner"
//   - Aim for maximum clinical detail while remaining accurate
//   - Include ONLY clinically relevant elements based on transcript
//   - DO NOT include every key element blindly
//   - Use fresh language for KB elements — never copy KB text verbatim]

// ─────────────────────────────────────────────────────────
// 10. QUALITY NOTES (INTERNAL — NOT PART OF SIGNED REPORT)
// ─────────────────────────────────────────────────────────
// [This section is for documentation quality review ONLY.
// It does not appear in the final signed operative report.
// List any of the following if present:
//   - Unclear or possibly misheard terms (label: "unclear term —
//     recommend surgeon verify before signing")
//   - Values corrected during confirmation: "[original] corrected
//     to [final] during confirmation"
//   - Ambiguous anatomical or instrument names that could not be
//     confirmed (e.g., "PDP" when FDP or FDS likely intended)
//   - Required fields not provided in transcript
//   - Any assumed values from Knowledge Base that surgeon should verify

// If no quality concerns: write "No quality concerns identified."]

// ═══════════════════════════════════════════════════════════
// FINAL MANDATORY CHECKLIST — VERIFY BEFORE OUTPUT
// ═══════════════════════════════════════════════════════════

// [ ] Report follows EXACT section order above (1 through 10)
// [ ] CURRENT DIAGNOSIS: ICD-10 codes with full descriptions at top
// [ ] CASE DETAILS: IMPLANTS section complete and specific
// [ ] CASE DETAILS: Place of Surgery inferred correctly
// [ ] PREOPERATIVE DIAGNOSIS: AI-generated from clinical info
// [ ] POSTOPERATIVE DIAGNOSIS: ICD-10 codes present with descriptions
// [ ] PROCEDURES PERFORMED: Numbered list, CPT codes included
// [ ] INDICATION FOR ASSISTANT: Present if assistant surgeon; "N/A" if not
// [ ] INDICATION FOR SURGERY: Minimum 2 paragraphs, persuasive, AI-generated
// [ ] PROCEDURE DETAILS: Full flowing prose, no bullets, no numbered steps
// [ ] PROCEDURE DETAILS: Sterile prep, tourniquet, wound, each structure,
//     closure, drain — all included within narrative
// [ ] PROCEDURE DETAILS: Each structure written independently (no "as above")
// [ ] PROCEDURE DETAILS: All KB key elements present in fresh language
// [ ] Wound surface area calculated ONLY if both dimensions provided
// [ ] Report is LONG, DETAILED, EXPANSIVE — not brief
// [ ] NO KB text copied verbatim anywhere
// [ ] NO invented facts anywhere
// [ ] POSTOPERATIVE PLAN section does NOT appear anywhere
// [ ] OR start/end time does NOT appear anywhere
// [ ] Primary Surgeon listed as "Oren Michaeli, DO"
// [ ] "To be added by office staff" for name, DOB, MRN
// `.trim();
// }

// module.exports = {
//   generateReport
// };


//----------------------------4-5-2026---------------------------------------------
// GPT Service
// Handles interaction with the GPT API (Perplexity or Gemini) to generate
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

async function generateWithGemini(transcript) {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;

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

      const response = await axios.post(
        endpoint,
        { contents: [{ parts: [{ text: prompt }] }] },
        { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
      );

      if (!response.data?.candidates?.[0]) {
        throw new Error('Invalid response from Gemini API');
      }

      const generatedReport = response.data.candidates[0].content.parts[0].text;
      logger.info('✅ Gemini: Successfully generated report');
      return generatedReport;
    } catch (error) {
      logger.error(`Gemini API Error (Attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);

      if (error.response) {
        const status = error.response.status;
        if (status === 404) throw new Error('Gemini model not found. Check GEMINI_MODEL in .env');
        if (status === 400) throw new Error(`Gemini bad request: ${error.response.data.error?.message}`);
        if (status === 403) throw new Error('Gemini API access denied — check API key permissions');
        if ((status === 429 || status === 503) && attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          logger.warn(`Rate limit — retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
      }

      if (attempt === MAX_RETRIES) {
        throw new Error(`Gemini API failed after ${MAX_RETRIES} attempts: ${error.message}`);
      }
      await sleep(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1));
    }
  }
}

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

    const azureEndpoint = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;

    const response = await axios.post(
      azureEndpoint,
      {
        messages: [
          { role: 'system', content: 'You are a medical AI assistant that generates professional surgical reports from voice transcripts.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 6000,
        temperature: 0.4
      },
      { headers: { 'Content-Type': 'application/json', 'api-key': apiKey } }
    );

    const generatedReport = response.data.choices[0].message.content;
    logger.info('Azure OpenAI: Successfully generated report');
    return generatedReport;
  } catch (error) {
    logger.error(`Azure OpenAI API Error: ${error.message}`);
    throw new Error(`Azure OpenAI API failed: ${error.message}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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