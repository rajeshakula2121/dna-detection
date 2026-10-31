"""
Pharmacogenomics Engine for GenomicsAI
Curated guideline data based on CPIC (Clinical Pharmacogenetics Implementation Consortium)
and PharmGKB evidence levels. Evaluates drug-gene interactions and metabolizer phenotypes.
"""

from typing import List, Dict, Any, Optional

PGX_DISCLAIMER = (
    "Research and educational use only. Never initiate, modify, or discontinue any prescription "
    "or over-the-counter medication without consulting a licensed physician or clinical pharmacologist."
)

CURATED_DRUG_GENE_PAIRS: List[Dict[str, Any]] = [
    {
        "id": "pgx-clopidogrel-cyp2c19",
        "drug": "Clopidogrel",
        "therapeuticArea": "Cardiology / Antiplatelet",
        "gene": "CYP2C19",
        "alleles": "*2, *3 (Loss of Function), *17 (Gain of Function)",
        "phenotype": "Intermediate / Poor Metabolizer (*1/*2, *2/*2)",
        "implication": "Significantly diminished bioactivation of prodrug to active thiol metabolite; increased risk of major adverse cardiovascular events (MACE) and stent thrombosis.",
        "cpicRecommendation": "Avoid clopidogrel in acute coronary syndrome patients with CYP2C19 intermediate or poor metabolizer status; recommend alternative P2Y12 inhibitor (prasugrel or ticagrelor) unless contraindicated.",
        "evidenceLevel": "CPIC Level A / PharmGKB 1A",
        "guidelineCitation": "CPIC Guideline for CYP2C19 and Clopidogrel Therapy (Clin Pharmacol Ther. 2022)",
        "sourceUrl": "https://cpicpgx.org/guidelines/guideline-for-clopidogrel-and-cyp2c19/"
    },
    {
        "id": "pgx-warfarin-cyp2c9-vkorc1",
        "drug": "Warfarin",
        "therapeuticArea": "Cardiology / Anticoagulant",
        "gene": "CYP2C9 & VKORC1",
        "alleles": "CYP2C9*2 (c.430C>T), CYP2C9*3 (c.1075A>C), VKORC1 -1639G>A (rs9923231)",
        "phenotype": "High Sensitivity / Reduced Clearance",
        "implication": "Impaired (S)-warfarin hepatic clearance and increased target enzyme sensitivity; markedly elevated risk of excessive anticoagulation and major bleeding events.",
        "cpicRecommendation": "Utilize pharmacogenetic dosing algorithms (e.g. Gage or IWPC) incorporating CYP2C9 and VKORC1 genotypes; reduce starting dose by 30% to 50% for patients carrying variant alleles.",
        "evidenceLevel": "CPIC Level A / PharmGKB 1A",
        "guidelineCitation": "CPIC Guideline for Pharmacogenetics-Guided Warfarin Dosing (Clin Pharmacol Ther. 2017)",
        "sourceUrl": "https://cpicpgx.org/guidelines/guideline-for-warfarin-and-cyp2c9-and-vkorc1/"
    },
    {
        "id": "pgx-codeine-cyp2d6",
        "drug": "Codeine / Tramadol",
        "therapeuticArea": "Pain Management / Analgesic",
        "gene": "CYP2D6",
        "alleles": "*4, *5 (Non-functional), *1xN, *2xN (Gene Duplication / Ultra-rapid)",
        "phenotype": "Ultra-rapid Metabolizer (UM) OR Poor Metabolizer (PM)",
        "implication": "UM: Rapid conversion to morphine causing fatal respiratory depression. PM: Lack of analgesia due to failure of morphine generation.",
        "cpicRecommendation": "Avoid codeine or tramadol in CYP2D6 ultra-rapid metabolizers (due to risk of severe toxicity) and poor metabolizers (due to lack of efficacy). Use non-opioid analgesics or non-CYP2D6 opioids.",
        "evidenceLevel": "CPIC Level A / PharmGKB 1A",
        "guidelineCitation": "CPIC Guideline for CYP2D6, OPRM1 and Codeine Therapy (Clin Pharmacol Ther. 2021)",
        "sourceUrl": "https://cpicpgx.org/guidelines/guideline-for-codeine-and-cyp2d6/"
    },
    {
        "id": "pgx-fluorouracil-dpyd",
        "drug": "Fluorouracil (5-FU) / Capecitabine",
        "therapeuticArea": "Oncology / Chemotherapy",
        "gene": "DPYD",
        "alleles": "*2A (c.1905+1G>A), c.2846A>T, c.1679T>G (*13)",
        "phenotype": "DPD Deficiency (Intermediate / Poor Metabolizer)",
        "implication": "Impaired dihydropyrimidine dehydrogenase clearance leads to severe, potentially lethal systemic toxicity (myelosuppression, neurotoxicity, severe enteritis).",
        "cpicRecommendation": "Reduce initial fluoropyrimidine dose by 50% for DPYD Activity Score 1.0-1.5; select alternative chemotherapy regimen for complete DPD deficiency (Activity Score 0).",
        "evidenceLevel": "CPIC Level A / PharmGKB 1A",
        "guidelineCitation": "CPIC Guideline for Dihydropyrimidine Dehydrogenase Genotype and Fluoropyrimidine Dosing (2018 update)",
        "sourceUrl": "https://cpicpgx.org/guidelines/guideline-for-fluoropyrimidines-and-dpyd/"
    },
    {
        "id": "pgx-simvastatin-slco1b1",
        "drug": "Simvastatin",
        "therapeuticArea": "Cardiology / Lipid-Lowering",
        "gene": "SLCO1B1",
        "alleles": "*5 (c.521T>C, rs4149056)",
        "phenotype": "Decreased Function (Heterozygous or Homozygous *5)",
        "implication": "Reduced hepatic uptake of statin acid leading to elevated plasma concentrations and high risk of statin-associated myopathy and rhabdomyolysis.",
        "cpicRecommendation": "Prescribe a lower starting dose of simvastatin or select an alternative statin with lower myopathy risk (e.g. rosuvastatin or pravastatin) for individuals carrying the SLCO1B1 *5 allele.",
        "evidenceLevel": "CPIC Level A / PharmGKB 1A",
        "guidelineCitation": "CPIC Guideline for SLCO1B1, ABCG2, and CYP2C9 and Statin-Associated Musculoskeletal Symptoms (2022)",
        "sourceUrl": "https://cpicpgx.org/guidelines/guideline-for-statins-and-slco1b1-abcg2-and-cyp2c9/"
    },
    {
        "id": "pgx-abacavir-hlab",
        "drug": "Abacavir",
        "therapeuticArea": "Infectious Disease / Antiretroviral",
        "gene": "HLA-B",
        "alleles": "HLA-B*57:01",
        "phenotype": "HLA-B*57:01 Positive",
        "implication": "Immunologically mediated drug hypersensitivity reaction characterized by multi-organ involvement, fever, skin rash, gastrointestinal distress, and potential fatal anaphylactoid collapse upon re-challenge.",
        "cpicRecommendation": "Abacavir is strictly contraindicated in individuals positive for the HLA-B*57:01 allele. Mandatory screening is required prior to initiation of abacavir therapy.",
        "evidenceLevel": "CPIC Level A / PharmGKB 1A",
        "guidelineCitation": "CPIC Guideline for HLA-B Genotype and Abacavir Dosing (Clin Pharmacol Ther. 2014)",
        "sourceUrl": "https://cpicpgx.org/guidelines/guideline-for-abacavir-and-hla-b/"
    },
    {
        "id": "pgx-tamoxifen-cyp2d6",
        "drug": "Tamoxifen",
        "therapeuticArea": "Oncology / Endocrine Therapy",
        "gene": "CYP2D6",
        "alleles": "*4, *5 (Null alleles)",
        "phenotype": "Poor Metabolizer (*4/*4)",
        "implication": "Inadequate conversion to active metabolite endoxifen, leading to reduced recurrence-free survival in estrogen receptor-positive breast cancer patients.",
        "cpicRecommendation": "Consider alternative endocrine therapy (such as an aromatase inhibitor) in postmenopausal women, or higher tamoxifen dose (40 mg/day) if aromatase inhibitors are not tolerated.",
        "evidenceLevel": "CPIC Level A / PharmGKB 1A",
        "guidelineCitation": "CPIC Guideline for CYP2D6 and Tamoxifen Therapy (Clin Pharmacol Ther. 2018)",
        "sourceUrl": "https://cpicpgx.org/guidelines/guideline-for-tamoxifen-and-cyp2d6/"
    }
]


def analyze_pharmacogenomics(
    sample_id: Optional[str] = None,
    drug_query: Optional[str] = None,
    therapeutic_area: Optional[str] = None
) -> Dict[str, Any]:
    """
    Search curated CPIC and PharmGKB pharmacogenomic guidelines.
    """
    results = []
    d_q = drug_query.strip().lower() if drug_query else ""
    t_a = therapeutic_area.strip().lower() if therapeutic_area else ""

    for item in CURATED_DRUG_GENE_PAIRS:
        match_drug = not d_q or (d_q in item["drug"].lower() or d_q in item["gene"].lower())
        match_area = not t_a or (t_a in item["therapeuticArea"].lower())
        if match_drug and match_area:
            results.append(item)

    return {
        "disclaimer": PGX_DISCLAIMER,
        "sampleId": sample_id,
        "totalEvaluated": len(results),
        "guidelines": results
    }

