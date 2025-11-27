import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, GroundingSource } from '../types';

let client: GoogleGenAI | null = null;

const getClient = () => {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return client;
};

export const searchPlace = async (query: string): Promise<{ lat: number; lng: number; name: string } | null> => {
  const ai = getClient();
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: 'user',
        parts: [{ text: `
          Find the geographic location for: "${query}" using Google Maps.
          Return ONLY a valid JSON object with these keys:
          - "lat": number (latitude)
          - "lng": number (longitude)
          - "name": string (the official name of the place found)
          
          Do not include markdown formatting or explanations. Just the JSON.
        ` }]
      }],
      config: {
        tools: [{ googleMaps: {} }],
        // Note: responseMimeType is not allowed with tools, so we parse manually
      }
    });

    let text = response.text || "{}";
    // Clean up markdown if present
    text = text.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    
    const data = JSON.parse(text);
    
    if (data.lat && data.lng) {
      return { lat: data.lat, lng: data.lng, name: data.name || query };
    }
    return null;

  } catch (error) {
    console.error("Search Error:", error);
    return null;
  }
};

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
            I am creating a map journal entry at coordinates: ${lat}, ${lng}.
            My personal note is: "${userNote}".
            
            Using Google Maps data:
            1. Identify the specific name of this location (Business, Park, Landmark, or Address).
            2. Provide a rich, interesting description of what is here, combining my note with real-world facts.
            
            Format the response as a simple JSON object with keys: 'name' (string) and 'details' (string).
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
    if (text.trim().startsWith("```")) {
      text = text.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let data = { name: "Unknown Location", details: "No data available." };
    
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON", e);
      data.details = text; 
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