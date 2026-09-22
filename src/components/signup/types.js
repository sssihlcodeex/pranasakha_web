export const CATEGORIES = [
  {
    slug: "doctors",
    label: "Doctors",
    desc: "All medical specialties — Cardiology, Orthopedics, Neurosurgery, and more.",
  },
  {
    slug: "nurses",
    label: "Nurses",
    desc: "Nurse specialists, critical care nurses, OT nurses, and other nursing roles.",
  },
  {
    slug: "physiotherapists",
    label: "Physiotherapists",
    desc: "Rehabilitation and physiotherapy specialists.",
  },
  {
    slug: "technicians",
    label: "Technicians",
    desc: "Lab, blood bank, radiology, and echocardiography technicians.",
  },
  {
    slug: "assistants",
    label: "Assistants",
    desc: "OP assistants and other clinical support roles.",
  },
  {
    slug: "others",
    label: "Others",
    desc: "Any other healthcare or allied Seva role.",
  },
];
export const CATEGORY_LABEL = {
  doctors: "Doctor",
  nurses: "Nurse",
  physiotherapists: "Physiotherapist",
  technicians: "Technician",
  assistants: "Assistant",
  others: "Other",
};
export const INSTITUTIONS = [
  "SSSIHMS, Prasanthigram",
  "SSSIHMS, Whitefield",
  "SSSGH, Prasanthi Nilayam",
  "SSSGH, Whitefield",
  "SSSMH — Mobile Hospital",
];
export const INSTITUTION_ADDRESSES = {
  "SSSIHMS, Prasanthigram":
    "Puttaparthi Main Road, Prasanthigram, Puttaparthi, Sri Sathya Sai District, Andhra Pradesh, India, PIN 515134",
  "SSSIHMS, Whitefield":
    "EPIP Area, Whitefield, Bengaluru, Karnataka 560066",
  "SSSGH, Prasanthi Nilayam":
    "Prasanthi Nilayam, Puttaparthi Main Rd, Yenumula Palli, Andhra Pradesh 515134",
  "SSSMH — Mobile Hospital":
    "Based out of Prasanthi Nilayam, Puttaparthi, Sri Sathya Sai District, Andhra Pradesh 515134",
  "SSSGH, Whitefield":
    "4, Sai Baba Hospital Road, KIADB Export Promotion Industrial Area (EPIP Area), Whitefield, Bengaluru, Karnataka 560066",
};
export const CATEGORY_SPECIALTIES = {
  doctors: [
    "Cardiology",
    "Cardiac Surgery",
    "Neurosurgery",
    "Urology",
    "Orthopedics",
    "Ophthalmology",
    "Anesthesiology",
    "General Medicine",
    "Other",
  ],
  nurses: [
    "Staff Nurse",
    "Nurse Specialist",
    "Critical Care Nurse",
    "OT Nurse",
    "ICU Nurse",
    "Community Health Nurse",
    "Other",
  ],
  physiotherapists: [
    "General Physiotherapist",
    "Orthopedic Physiotherapist",
    "Neuro Physiotherapist",
    "Cardiopulmonary Physiotherapist",
    "Sports Physiotherapist",
    "Other",
  ],
  technicians: [
    "Lab Technician",
    "Blood Bank Technician",
    "Radiology Technician",
    "Echocardiographer",
    "Dialysis Technician",
    "OT Technician",
    "Other",
  ],
  assistants: [
    "OP Assistant",
    "Nursing Assistant",
    "Pharmacy Assistant",
    "Ward Assistant",
    "Other",
  ],
  others: ["Other"],
};
export const CATEGORY_CLINICAL_SCOPE = {
  doctors: [
    "OPD",
    "OT / Surgery",
    "ICU / Wards",
    "CME Teaching",
    "Mobile Hospital Camps",
  ],
  nurses: [
    "Ward Duty",
    "ICU / Critical Care",
    "OT Assistance",
    "OPD Support",
    "Community Camps",
  ],
  physiotherapists: [
    "OPD Rehabilitation",
    "Inpatient Physiotherapy",
    "Sports Rehab",
    "Mobile Camps",
  ],
  technicians: [
    "Lab Services",
    "Radiology / Imaging",
    "Blood Bank",
    "Dialysis Unit",
    "OT Support",
  ],
  assistants: [
    "OPD Support",
    "Ward Support",
    "Pharmacy Support",
    "Administrative Support",
  ],
  others: ["To be discussed"],
};
export const GENDERS = ["Female", "Male", "Other", "Prefer not to say"];
export const NATIONALITIES = [
  "India",
  "United States",
  "United Kingdom",
  "Australia",
  "Canada",
  "Singapore",
  "United Arab Emirates",
  "South Africa",
  "Other",
];
export const COUNTRY_CODES = [
  "+91",
  "+1",
  "+44",
  "+61",
  "+65",
  "+971",
  "+27",
  "+49",
];
export const COUNTRY_CODE_ISO = {
  "+91": "in",
  "+1": "us",
  "+44": "gb",
  "+61": "au",
  "+65": "sg",
  "+971": "ae",
  "+27": "za",
  "+49": "de",
};
export const LANGUAGES = [
  "English",
  "Hindi",
  "Telugu",
  "Tamil",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Gujarati",
  "Bengali",
  "Spanish",
  "French",
];
export const UPLOADS = [
  {
    key: "degree",
    label: "Qualification / Degree Certificate",
    required: true,
  },
  { key: "board", label: "Board / Council Certification", required: true },
  { key: "license", label: "Current License / Registration", required: true },
  {
    key: "insurance",
    label: "Malpractice / Indemnity Insurance",
    required: false,
  },
  { key: "cv", label: "Curriculum Vitae", required: true },
];
export const DARSHAN_OPTIONS = ["Self", "Family", "Both", "None"];
export const STEPS = [
  "Identity & Contact",
  "Professional Credentials",
  "Service Preferences",
  "Logistics & Accommodation",
  "Consent & Review",
];
export function emptyDataFor(category) {
  return {
    category,
    fullName: "",
    dob: "",
    gender: "",
    nationality: "",
    passportNumber: "",
    passportCountry: "",
    passportExpiry: "",
    email: "",
    countryCode: "+91",
    mobile: "",
    address: "",
    hasNmc: "",
    councilNumber: "",
    councilAuthority: "",
    specialty: "",
    specialtyOther: "",
    subSpecialty: "",
    yearsExperience: "",
    affiliation: "",
    files: {},
    languages: [],
    saiCenterAffiliated: "",
    saiCenterName: "",
    normsAccepted: false,
    institutions: INSTITUTIONS,
    clinicalScope: [],
    clinicalScopeOther: "",
    preferredFrom: "",
    preferredTo: "",
    family: [],
    dietary: "",
    accessibility: "",
    airport: "",
    flightNumber: "",
    airline: "",
    darshan: "None",
    consentData: false,
    consentDeclaration: false,
    consentSeva: false,
  };
}
export const emptyData = emptyDataFor("doctors");
