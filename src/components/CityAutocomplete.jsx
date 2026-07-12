import { useMemo, useState } from "react";
import InputField from "./InputField";
import { cityOptions } from "../data/cities";

function CityAutocomplete({ value, onChange, onBlur, error, touched }) {
  const [query, setQuery] = useState(value || "");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredCities = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    return cityOptions
      .filter((city) => city.toLowerCase().includes(trimmed))
      .slice(0, 8);
  }, [query]);

  const handleTyping = (event) => {
    const nextValue = event.target.value;
    setQuery(nextValue);
    onChange(nextValue);
    setShowSuggestions(true);
  };

  const handleBlur = () => {
    window.setTimeout(() => setShowSuggestions(false), 120);
    onBlur();
  };

  const handleSelect = (city) => {
    setQuery(city);
    onChange(city, { selected: true });
    setShowSuggestions(false);
  };

  const renderSuggestions = () => {
    if (query.trim() === "") {
      return <div className="suggestion-state">Start typing a city name.</div>;
    }
    if (filteredCities.length === 0) {
      return <div className="suggestion-state">No cities found.</div>;
    }
    return filteredCities.map((city) => (
      <button
        key={city}
        type="button"
        className="suggestion-item"
        onMouseDown={() => handleSelect(city)}
      >
        {city}
      </button>
    ));
  };

  return (
    <InputField label="City" htmlFor="city" error={touched ? error : ""}>
      <div className="autocomplete-box">
        <input
          id="city"
          type="text"
          autoComplete="off"
          value={value}
          onChange={handleTyping}
          onBlur={handleBlur}
          onFocus={() => setShowSuggestions(true)}
        />

        {showSuggestions ? (
          <div className="suggestions-dropdown">{renderSuggestions()}</div>
        ) : null}
      </div>
    </InputField>
  );
}

export default CityAutocomplete;
