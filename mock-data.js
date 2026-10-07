/**
 * BuiltFolio Mock Data Showcase
 * Adheres to BuiltFolio Data Model (Section 3 of README.md):
 * - User, Profile, Firm, Project, Credit, Asset, Enquiry, Civimetric integration
 */

window.BuiltFolioData = {
  // Flagship Showcase Project
  showcaseProject: {
    id: "proj_courtyard_pune",
    slug: "courtyard-house-pune",
    title: "Courtyard House, Bavdhan",
    type: "Residential",
    typeLabel: "Courtyard House",
    city: "Pune",
    state: "Maharashtra",
    year: 2024,
    area_value: 2400,
    area_unit: "SQFT",
    cost_band_inr: "₹1,40,00,000.00 – ₹1,55,00,000.00",
    status: "PUBLIC",
    verified: true,
    description: "A contemporary courtyard home built with local Deccan basalt stone and exposed RCC frame. Centered around a sunken courtyard atrium that drives passive micro-climate cooling during Pune summers.",
    highlights: [
      "Naturally ventilated passive thermal chimney design",
      "Perforated brick jali screen along southwest facade",
      "Rainwater harvesting integrated subterranean cistern",
      "Solar rooftop array with 5.2 kWp capacity"
    ],
    credits: [
      {
        profileId: "prof_ritu_desai",
        name: "Ar. Ritu Desai",
        role: "Principal Architect",
        firm: "Studio Desai",
        regBody: "Council of Architecture (COA)",
        regNo: "CA/2012/55490",
        scopeNote: "Concept, architectural design, interior coordination, site supervision",
        status: "CONFIRMED",
        verified: true,
        profileUrl: "Profile.dc.html"
      },
      {
        profileId: "prof_rajesh_kulkarni",
        name: "Er. Rajesh Kulkarni",
        role: "Structural Consultant",
        firm: "Kulkarni Structural Design",
        regBody: "Institution of Engineers (India)",
        regNo: "AM-188210",
        scopeNote: "RCC frame engineering, basalt stone wall integration, cantilever calculations",
        status: "CONFIRMED",
        verified: true,
        profileUrl: "People.dc.html"
      },
      {
        profileId: "prof_studio_vriksha",
        name: "Studio Vriksha",
        role: "Landscape Architect",
        firm: "Studio Vriksha",
        regBody: "ISOLA Registered",
        regNo: "ISOLA-2018-84",
        scopeNote: "Courtyard native flora selection, water pavilion landscape",
        status: "CONFIRMED",
        verified: true,
        profileUrl: "People.dc.html"
      },
      {
        profileId: "firm_pune_buildwell",
        name: "Pune Buildwell Infra",
        role: "General Contractor",
        firm: "Pune Buildwell Infra",
        regBody: "Class 1 Contractor",
        regNo: "MH-PUN-C1-094",
        scopeNote: "Civil works, fair-faced concrete casting, masonry execution",
        status: "CONFIRMED",
        verified: true,
        profileUrl: "People.dc.html"
      }
    ],
    assets: [
      {
        id: "ast_01",
        kind: "DRAWING",
        drawingType: "Ground Floor Plan",
        sheetNo: "A-101",
        scale: "1:100",
        revision: "R3",
        units: "m",
        accessLevel: "WATERMARKED",
        fileKey: "drawings/a101-ground-plan.pdf",
        sizeMb: 14.2
      },
      {
        id: "ast_02",
        kind: "DRAWING",
        drawingType: "RCC Column & Foundation Layout",
        sheetNo: "S-102",
        scale: "1:50",
        revision: "R2",
        units: "m",
        accessLevel: "WATERMARKED",
        fileKey: "drawings/s102-column-foundation.pdf",
        sizeMb: 18.5
      },
      {
        id: "ast_03",
        kind: "MODEL",
        drawingType: "Pavilion 3D Assembly",
        sheetNo: "M-01",
        scale: "1:1",
        revision: "R1",
        units: "m",
        accessLevel: "PUBLIC",
        fileKey: "models/courtyard-pavilion.gltf",
        sizeMb: 24.1
      },
      {
        id: "ast_04",
        kind: "DRAWING",
        drawingType: "CAD Working Drawings (DWG)",
        sheetNo: "SET-FULL",
        scale: "1:50",
        revision: "R3",
        units: "mm",
        accessLevel: "ON_REQUEST",
        fileKey: "cad/courtyard-working.dwg",
        sizeMb: 48.0
      }
    ],
    civimetric: {
      typeLabel: "Courtyard House",
      area: 2400,
      areaUnit: "SQFT",
      city: "Pune",
      formattedQuery: "Courtyard House 2400 sqft, Pune"
    }
  },

  // Second showcase project
  g2ResidentialNagpur: {
    id: "proj_g2_nagpur",
    slug: "g2-residential-nagpur",
    title: "G+2 Residential Building, Nagpur",
    type: "Residential",
    typeLabel: "G+2 Residential Building",
    city: "Nagpur",
    state: "Maharashtra",
    year: 2024,
    area_value: 1100,
    area_unit: "SQFT",
    cost_band_inr: "₹38,00,000.00 – ₹44,00,000.00",
    status: "PUBLIC",
    verified: true,
    credits: [
      { name: "Studio Anvaya", role: "Principal Architect", verified: true },
      { name: "Deshmukh Consultants", role: "Structural Engineer", verified: true },
      { name: "Vaidya Builders", role: "Contractor", verified: true }
    ],
    civimetric: {
      typeLabel: "Residential Building",
      area: 1100,
      areaUnit: "SQFT",
      city: "Nagpur",
      formattedQuery: "Residential Building 1100 sqft, Nagpur"
    }
  }
};
