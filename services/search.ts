
// Using OpenStreetMap Nominatim API for search
// Free, Open Source, No API Key required

export const searchLocation = async (query: string): Promise<{ lat: number; lng: number; name: string } | null> => {
  if (!query) return null;

  try {
    // We explicitly set accept-language to ar to prefer Arabic results
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=ar`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'GeminiMapJournal/1.0' // Nominatim requires a user-agent
        }
    });

    if (!response.ok) throw new Error("Search failed");

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        name: data[0].display_name.split(',')[0] // Take the first part of the address as the name
      };
    }

    return null;
  } catch (error) {
    console.error("OSM Search Error:", error);
    return null;
  }
};
