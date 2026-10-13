export const LOCATIONS: Record<string, Record<string, string[]>> = {
  España: {
    Madrid: ["Madrid", "Parla", "Leganés", "Getafe", "Fuenlabrada", "Móstoles", "Alcalá de Henares"],
    Barcelona: ["Barcelona", "Badalona", "Sabadell", "Terrassa", "Hospitalet de Llobregat"],
    Valencia: ["Valencia", "Gandía", "Torrent", "Sagunto"],
    Sevilla: ["Sevilla", "Dos Hermanas", "Alcalá de Guadaíra"],
    Málaga: ["Málaga", "Marbella", "Fuengirola", "Torremolinos"],
    Alicante: ["Alicante", "Elche", "Benidorm", "Torrevieja"],
    Zaragoza: ["Zaragoza", "Calatayud"],
    Vizcaya: ["Bilbao", "Barakaldo", "Getxo"],
    Asturias: ["Oviedo", "Gijón", "Avilés"],
    "Islas Baleares": ["Palma", "Ibiza", "Manacor"],
    "Las Palmas": ["Las Palmas de Gran Canaria", "Telde"],
    "Santa Cruz de Tenerife": ["Santa Cruz de Tenerife", "La Laguna"],
  },
  Ecuador: {
    Pichincha: ["Quito", "Cayambe", "Rumiñahui"],
    Guayas: ["Guayaquil", "Durán", "Daule"],
    Azuay: ["Cuenca", "Gualaceo"],
    Manabí: ["Portoviejo", "Manta"],
    "El Oro": ["Machala", "Pasaje"],
    Loja: ["Loja"],
    Tungurahua: ["Ambato"],
    Imbabura: ["Ibarra", "Otavalo"],
  },
  México: {
    "Ciudad de México": ["Ciudad de México"],
    Jalisco: ["Guadalajara", "Zapopan", "Tlaquepaque"],
    "Nuevo León": ["Monterrey", "San Nicolás de los Garza"],
    Puebla: ["Puebla", "Tehuacán"],
    Yucatán: ["Mérida"],
  },
  Colombia: {
    "Bogotá D.C.": ["Bogotá"],
    Antioquia: ["Medellín", "Envigado"],
    "Valle del Cauca": ["Cali", "Palmira"],
    Atlántico: ["Barranquilla"],
    Santander: ["Bucaramanga"],
  },
  Argentina: {
    "Buenos Aires": ["Buenos Aires", "La Plata", "Mar del Plata"],
    Córdoba: ["Córdoba", "Villa Carlos Paz"],
    "Santa Fe": ["Rosario", "Santa Fe"],
    Mendoza: ["Mendoza"],
  },
  Chile: {
    "Región Metropolitana": ["Santiago", "Puente Alto", "Maipú"],
    Valparaíso: ["Valparaíso", "Viña del Mar"],
    Biobío: ["Concepción"],
  },
  Perú: {
    Lima: ["Lima", "Callao"],
    Arequipa: ["Arequipa"],
    Cusco: ["Cusco"],
    "La Libertad": ["Trujillo"],
  },
};

export const COUNTRIES = Object.keys(LOCATIONS);

export const DEFAULT_LOCATION = { country: "España", province: "Madrid", city: "Parla" };

export function provincesOf(country: string): string[] {
  return Object.keys(LOCATIONS[country] ?? {});
}

export function citiesOf(country: string, province: string): string[] {
  return LOCATIONS[country]?.[province] ?? [];
}
