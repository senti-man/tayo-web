"use client";

import { useEffect, useRef, useState } from "react";
import { CampusPoi, searchCampusPois } from "@/lib/campus";
import { apiFetch } from "@/lib/api-client";

type Poi = CampusPoi;

export default function PoiAutocomplete({
  placeholder,
  value,
  onSelect,
}: {
  placeholder: string;
  value: Poi | null;
  onSelect: (poi: Poi) => void;
}) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [cityResults, setCityResults] = useState<Poi[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  const campusResults = searchCampusPois(query);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting derived state when input is cleared
      setCityResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const seq = ++requestSeq.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (seq === requestSeq.current) {
          setCityResults(data.results ?? []);
        }
      } catch {
        if (seq === requestSeq.current) setCityResults([]);
      } finally {
        if (seq === requestSeq.current) setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function select(poi: Poi) {
    onSelect(poi);
    setQuery(poi.name);
    setOpen(false);
  }

  const hasResults = campusResults.length > 0 || cityResults.length > 0;

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-rose-400"
      />
      {open && (hasResults || searching) && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {campusResults.length > 0 && (
            <>
              <li className="px-4 pt-2 pb-1 text-xs font-semibold text-slate-400">캠퍼스</li>
              {campusResults.map((poi) => (
                <li key={poi.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(poi)}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    {poi.name}
                  </button>
                </li>
              ))}
            </>
          )}
          {cityResults.length > 0 && (
            <>
              <li className="px-4 pt-2 pb-1 text-xs font-semibold text-slate-400">목포 시내</li>
              {cityResults.map((poi) => (
                <li key={poi.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(poi)}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    {poi.name}
                  </button>
                </li>
              ))}
            </>
          )}
          {searching && cityResults.length === 0 && (
            <li className="px-4 py-2 text-xs text-slate-400">목포 시내 검색 중...</li>
          )}
        </ul>
      )}
    </div>
  );
}
