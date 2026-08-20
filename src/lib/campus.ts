// Campus building list, approximated from the 타요 Figma mockup's map screen
// (목포대학교 공과대학 / 도림캠퍼스 일대). Coordinates are relative
// approximations for demo purposes, not surveyed GPS data.
export type CampusPoi = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export const CAMPUS_CENTER = { lat: 34.9135, lng: 126.4349 };

export const CAMPUS_POIS: CampusPoi[] = [
  { id: "eng4", name: "공과대학 4호관", lat: 34.9135, lng: 126.4349 },
  { id: "eng5", name: "공과대학 5호관", lat: 34.9164, lng: 126.4389 },
  { id: "sports", name: "스포츠센터", lat: 34.9166, lng: 126.4358 },
  { id: "coop", name: "대외협력관", lat: 34.9156, lng: 126.4358 },
  { id: "factory", name: "부속공장", lat: 34.9149, lng: 126.4384 },
  { id: "homesci", name: "생활과학관", lat: 34.9145, lng: 126.4358 },
  { id: "eng3", name: "공과대학 3호관", lat: 34.9141, lng: 126.4335 },
  { id: "profapt", name: "교수아파트", lat: 34.9144, lng: 126.4317 },
  { id: "engcol", name: "목포대학교 공과대학", lat: 34.913, lng: 126.4327 },
  { id: "eng1", name: "공과대학 1호관", lat: 34.9125, lng: 126.434 },
  { id: "profhall", name: "교수회관", lat: 34.9114, lng: 126.4318 },
  { id: "court", name: "농구장", lat: 34.9114, lng: 126.4335 },
  { id: "labhall", name: "공동실험실습관", lat: 34.9111, lng: 126.4308 },
  { id: "edu", name: "사범대학", lat: 34.9104, lng: 126.432 },
  { id: "humanities", name: "인문대학", lat: 34.9097, lng: 126.4313 },
  { id: "amenity", name: "생활편의관", lat: 34.9092, lng: 126.43 },
  { id: "sci1", name: "자연과학대학 1호관", lat: 34.9088, lng: 126.4345 },
  { id: "sci2", name: "자연과학대학 2호관", lat: 34.9088, lng: 126.4364 },
  { id: "dorm", name: "학생생활관", lat: 34.9088, lng: 126.438 },
  { id: "pharm", name: "약학대학", lat: 34.9083, lng: 126.4358 },
  { id: "garam", name: "가람관", lat: 34.9083, lng: 126.4388 },
  { id: "studenthall", name: "학생회관", lat: 34.9082, lng: 126.4322 },
  { id: "bank", name: "신한은행", lat: 34.9079, lng: 126.4303 },
  { id: "itcenter", name: "정보종합센터", lat: 34.9069, lng: 126.4314 },
  { id: "library", name: "도서관", lat: 34.9065, lng: 126.432 },
  { id: "socsci", name: "사회과학대학", lat: 34.905, lng: 126.4334 },
];

export function searchCampusPois(query: string, limit = 8): CampusPoi[] {
  const q = query.trim();
  if (!q) return CAMPUS_POIS.slice(0, limit);
  return CAMPUS_POIS.filter((poi) => poi.name.includes(q)).slice(0, limit);
}
