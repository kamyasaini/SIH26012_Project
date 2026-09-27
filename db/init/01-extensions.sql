-- Enables the standard spatial extension set used for 3D cadastral geometry,
-- elevation rasters, and topology validation. Runs once on first container init.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS postgis_sfcgal;   -- 3D solids / volumetric ops (encroachment volume checks)
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS address_standardizer;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;
