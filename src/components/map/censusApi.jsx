// src/components/map/censusApi.jsx

const CENSUS_API_KEY = "0a85b2c9a4ae36ec7479013358c9002da2149c34";

export const fetchCountyPopulation = async (stateFips, countyFips) => {
  try {
    // Use ACS 2022 for total population (B01003_001E)
    const url = `https://api.census.gov/data/2022/acs/acs5?get=B01003_001E&for=county:${countyFips}&in=state:${stateFips}&key=${CENSUS_API_KEY}`;
    console.log("Fetching population from:", url);
    const response = await fetch(url);
    if (!response.ok) {
      console.log("ACS response not OK:", response.status, response.statusText);
      throw new Error(`Census API error: ${response.status}`);
    }
    const data = await response.json();
    console.log("ACS data response:", data);
    // data[1][0] is the population number (data[0] is headers)
    return parseInt(data[1][0], 10) || null;
  } catch (err) {
    console.error("Population fetch failed:", err);
    return null;
  }
};

export const getCountyName = async (stateFips, countyFips) => {
  try {
    // Use ACS for name too (consistent)
    const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME&for=county:${countyFips}&in=state:${stateFips}&key=${CENSUS_API_KEY}`;
    console.log("Fetching name from:", url);
    const response = await fetch(url);
    if (!response.ok) {
      console.log("ACS name response not OK:", response.status);
      throw new Error(`Census API error: ${response.status}`);
    }
    const data = await response.json();
    console.log("ACS name response:", data);
    return data[1][0] || "Unknown County";
  } catch (err) {
    console.error("County name fetch failed:", err);
    return "Unknown County";
  }
};

export const fetchStandAloneHouses = async (stateFips, countyFips) => {
  try {
    // B25024_002E = 1-unit, detached houses (stand-alone/single-family homes)
    const url = `https://api.census.gov/data/2022/acs/acs5?get=B25024_002E&for=county:${countyFips}&in=state:${stateFips}&key=${CENSUS_API_KEY}`;
    console.log("Fetching stand-alone houses from:", url);
    const response = await fetch(url);
    if (!response.ok) {
      console.log("ACS houses response not OK:", response.status);
      throw new Error(`Census API error: ${response.status}`);
    }
    const data = await response.json();
    console.log("ACS stand-alone houses response:", data);
    // data[1][0] is the number
    return parseInt(data[1][0], 10) || 0;
  } catch (err) {
    console.error("Stand-alone houses fetch failed:", err);
    return 0;
  }
};