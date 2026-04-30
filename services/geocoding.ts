export const searchPlace = async (
  query: string
): Promise<{ lat: number; lng: number; name: string } | null> => {
  const normalized = query.trim();
  if (!normalized) return null;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
        normalized
      )}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) return null;
    const results = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
    }>;
    const first = results[0];
    if (!first) return null;

    return {
      lat: Number(first.lat),
      lng: Number(first.lon),
      name: first.display_name || normalized,
    };
  } catch {
    return null;
  }
};
