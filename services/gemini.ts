
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, GroundingSource } from '../types';

let client: GoogleGenAI | null = null;

const getClient = () => {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return client;
};

// NOTE: Search functionality has been moved to services/search.ts using OpenStreetMap

export const identifyLocation = async (
  lat: number, 
  lng: number,
  userNote: string
): Promise<AnalysisResult> => {
  const ai = getClient();
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: 'user',
          parts: [{ text: `
            I am at coordinates: ${lat}, ${lng}.
            My note: "${userNote}".
            
            Identify this place and provide a short, tactical description relevant to operations.
            Return valid JSON only: { "name": "string", "details": "string" }
          ` }]
        }
      ],
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        },
      }
    });

    let text = response.text || "{}";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    let data = { name: "Unknown Location", details: "No data available." };
    
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON", e);
      data.details = response.text || "Analysis failed."; 
    }

    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.maps?.uri) {
           sources.push({ title: chunk.maps.title || "Google Maps", uri: chunk.maps.uri });
        } else if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    return { 
      locationName: data.name || "Marked Location", 
      details: data.details || "Analysis complete.", 
      sources 
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { 
      locationName: "Connection Error", 
      details: "Unable to verify location data at this time.", 
      sources: [] 
    };
  }
};
