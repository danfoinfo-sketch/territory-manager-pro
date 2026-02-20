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
    return parseInt(data[1][0], 10) || null;
  } catch (err) {
    console.error("Population fetch failed:", err);
    return null;
  }
};

export const getCountyName = async (stateFips, countyFips) => {
  try {
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
    return parseInt(data[1][0], 10) || 0;
  } catch (err) {
    console.error("Stand-alone houses fetch failed:", err);
    return 0;
  }
};

// ────────────────────────────────────────────────────────────────
// NEW: ZIP / ZCTA fetch (compatible with your existing pattern)
export const fetchZipPopulationAndHouses = async (zipCode) => {
  try {
    // ACS 2022 for ZCTA5:
    // B01003_001E = Total population
    // B25024_002E = 1-unit, detached (stand-alone houses approximation)
    const popUrl = `https://api.census.gov/data/2022/acs/acs5?get=B01003_001E&for=zip%20code%20tabulation%20area:${zipCode}&key=${CENSUS_API_KEY}`;
    const housesUrl = `https://api.census.gov/data/2022/acs/acs5?get=B25024_002E&for=zip%20code%20tabulation%20area:${zipCode}&key=${CENSUS_API_KEY}`;

    console.log("Fetching ZIP pop from:", popUrl);
    console.log("Fetching ZIP houses from:", housesUrl);

    const [popRes, housesRes] = await Promise.all([
      fetch(popUrl),
      fetch(housesUrl),
    ]);

    if (!popRes.ok || !housesRes.ok) {
      console.warn("ZIP Census response not OK:", popRes.status, housesRes.status);
      return { population: 0, standAloneHouses: 0 };
    }

    const popData = await popRes.json();
    const housesData = await housesRes.json();

    const population = popData[1] ? parseInt(popData[1][0], 10) : 0;
    const standAloneHouses = housesData[1] ? parseInt(housesData[1][0], 10) : 0;

    console.log(`ZIP ${zipCode}: Pop = ${population}, Stand-alone houses = ${standAloneHouses}`);

    return { population, standAloneHouses };
  } catch (err) {
    console.error("ZIP Census fetch failed:", err);
    return { population: 0, standAloneHouses: 0 };
  }
};