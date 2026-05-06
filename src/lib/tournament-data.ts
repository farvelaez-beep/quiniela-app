// =====================================================
// DATOS DEL MUNDIAL 2026 (sorteo del 5 de diciembre 2025)
// =====================================================

export const GROUPS: Record<string, string[]> = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czech Republic'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Paraguay', 'Australia', 'Turkey'],
  E: ['Germany', 'Curaçao', 'Ivory Coast', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
};

export const TEAMS_ES: Record<string, string> = {
  'Mexico': 'México', 'South Africa': 'Sudáfrica', 'South Korea': 'Corea del Sur', 'Czech Republic': 'Rep. Checa',
  'Canada': 'Canadá', 'Bosnia and Herzegovina': 'Bosnia', 'Qatar': 'Catar', 'Switzerland': 'Suiza',
  'Brazil': 'Brasil', 'Morocco': 'Marruecos', 'Haiti': 'Haití', 'Scotland': 'Escocia',
  'United States': 'EE.UU.', 'Paraguay': 'Paraguay', 'Australia': 'Australia', 'Turkey': 'Turquía',
  'Germany': 'Alemania', 'Curaçao': 'Curazao', 'Ivory Coast': 'Costa de Marfil', 'Ecuador': 'Ecuador',
  'Netherlands': 'Países Bajos', 'Japan': 'Japón', 'Sweden': 'Suecia', 'Tunisia': 'Túnez',
  'Belgium': 'Bélgica', 'Egypt': 'Egipto', 'Iran': 'Irán', 'New Zealand': 'Nueva Zelanda',
  'Spain': 'España', 'Cape Verde': 'Cabo Verde', 'Saudi Arabia': 'Arabia Saudí', 'Uruguay': 'Uruguay',
  'France': 'Francia', 'Senegal': 'Senegal', 'Iraq': 'Irak', 'Norway': 'Noruega',
  'Argentina': 'Argentina', 'Algeria': 'Argelia', 'Austria': 'Austria', 'Jordan': 'Jordania',
  'Portugal': 'Portugal', 'DR Congo': 'RD Congo', 'Uzbekistan': 'Uzbekistán', 'Colombia': 'Colombia',
  'England': 'Inglaterra', 'Croatia': 'Croacia', 'Ghana': 'Ghana', 'Panama': 'Panamá',
};

export const FLAG: Record<string, string> = {
  'Mexico':'🇲🇽','South Africa':'🇿🇦','South Korea':'🇰🇷','Czech Republic':'🇨🇿',
  'Canada':'🇨🇦','Bosnia and Herzegovina':'🇧🇦','Qatar':'🇶🇦','Switzerland':'🇨🇭',
  'Brazil':'🇧🇷','Morocco':'🇲🇦','Haiti':'🇭🇹','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'United States':'🇺🇸','Paraguay':'🇵🇾','Australia':'🇦🇺','Turkey':'🇹🇷',
  'Germany':'🇩🇪','Curaçao':'🇨🇼','Ivory Coast':'🇨🇮','Ecuador':'🇪🇨',
  'Netherlands':'🇳🇱','Japan':'🇯🇵','Sweden':'🇸🇪','Tunisia':'🇹🇳',
  'Belgium':'🇧🇪','Egypt':'🇪🇬','Iran':'🇮🇷','New Zealand':'🇳🇿',
  'Spain':'🇪🇸','Cape Verde':'🇨🇻','Saudi Arabia':'🇸🇦','Uruguay':'🇺🇾',
  'France':'🇫🇷','Senegal':'🇸🇳','Iraq':'🇮🇶','Norway':'🇳🇴',
  'Argentina':'🇦🇷','Algeria':'🇩🇿','Austria':'🇦🇹','Jordan':'🇯🇴',
  'Portugal':'🇵🇹','DR Congo':'🇨🇩','Uzbekistan':'🇺🇿','Colombia':'🇨🇴',
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croatia':'🇭🇷','Ghana':'🇬🇭','Panama':'🇵🇦',
};

export const ALL_TEAMS = Object.values(GROUPS).flat();

export type Match = {
  id: string;
  group: string;
  home: string;
  away: string;
  matchday: number;
};

// Genera los 6 partidos de cada grupo de 4 equipos
function generateGroupMatches(g: string, t: string[]): Match[] {
  return [
    { id: `${g}-1`, group: g, home: t[0], away: t[1], matchday: 1 },
    { id: `${g}-2`, group: g, home: t[2], away: t[3], matchday: 1 },
    { id: `${g}-3`, group: g, home: t[0], away: t[2], matchday: 2 },
    { id: `${g}-4`, group: g, home: t[3], away: t[1], matchday: 2 },
    { id: `${g}-5`, group: g, home: t[3], away: t[0], matchday: 3 },
    { id: `${g}-6`, group: g, home: t[1], away: t[2], matchday: 3 },
  ];
}

export const ALL_MATCHES: Match[] = Object.entries(GROUPS).flatMap(([g, t]) =>
  generateGroupMatches(g, t)
);

export const TOP_SCORER_SUGGESTIONS = [
  'Lionel Messi', 'Kylian Mbappé', 'Erling Haaland', 'Harry Kane', 'Cristiano Ronaldo',
  'Lamine Yamal', 'Vinícius Jr.', 'Julián Álvarez', 'Jude Bellingham', 'Mohamed Salah',
  'Heung-min Son', 'Romelu Lukaku', 'Rodrygo', 'Kevin De Bruyne', 'Florian Wirtz',
];
