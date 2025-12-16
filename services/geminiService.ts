import { GoogleGenAI } from "@google/genai";
import { PhysicsState, MissionLogEntry } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found in process.env");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getCapcomGuidance = async (
  physics: PhysicsState,
  program: string,
  lastVerb: string,
  lastNoun: string
): Promise<string> => {
  const client = getClient();
  if (!client) return "COMM ERROR: API KEY MISSING";

  const prompt = `
    You are CAPCOM (Capsule Communicator) for an Apollo Mission. The user is the Astronaut piloting the LM (Lunar Module).
    
    Current Telemetry:
    - Altitude: ${physics.altitude.toFixed(1)} meters
    - Vertical Velocity: ${physics.velocity.toFixed(1)} m/s
    - Fuel Remaining: ${physics.fuel.toFixed(1)}%
    - Thrust Level: ${physics.thrust}%
    
    AGC State:
    - Program: P${program}
    - Last Input: Verb ${lastVerb} Noun ${lastNoun}

    Provide a VERY SHORT, crisp, and vintage "space-talk" message advising the astronaut on what to do next to land safely. 
    If they are crashing, warn them. If they are doing well, encourage them.
    Suggest specific Verbs/Nouns if they are in the wrong program (e.g., "Switch to P63 for braking" or "Monitor Altitude with V16 N36").
    
    Keep it under 25 words. Use caps lock for effect if urgent.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "RADIO SILENCE...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "STATIC INTERFERENCE...";
  }
};

export const analyzeMissionResult = async (
  finalLog: MissionLogEntry[],
  success: boolean
): Promise<string> => {
  const client = getClient();
  if (!client) return "DATA RETRIEVAL FAILED.";

  const prompt = `
    Analyze this Apollo Lunar Landing mission attempt.
    Outcome: ${success ? "SUCCESSFUL LANDING" : "CRASH/ABORT"}.
    
    Mission Log:
    ${JSON.stringify(finalLog.slice(-5))}

    Write a 2-sentence summary of the pilot's performance in the style of a NASA post-mission report.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "REPORT GENERATION FAILED.";
  } catch (e) {
    return "SYSTEM ERROR.";
  }
};