// Volume discounts applied when buying ad credits in packs.
export const PACK_DISCOUNTS = [
  { minQuantity: 10, discount: 0.25, label: "Pack of 10 — save 25%" },
  { minQuantity: 5, discount: 0.15, label: "Pack of 5 — save 15%" },
] as const;

export function packDiscount(quantity: number): number {
  for (const pack of PACK_DISCOUNTS) {
    if (quantity >= pack.minQuantity) return pack.discount;
  }
  return 0;
}

export const JOB_CATEGORIES = [
  "Engineering",
  "AI & Data Science",
  "Design",
  "Product",
  "Marketing",
  "Sales",
  "Healthcare",
  "Finance",
  "Operations",
  "Customer Support",
  "Legal",
  "Education",
  "Trades & Services",
  "Other",
] as const;

// Canonical skills used by the heuristic CV parser and post-job suggestions.
export const KNOWN_SKILLS = [
  "Python", "TypeScript", "JavaScript", "React", "Next.js", "Node.js", "Go",
  "Rust", "Java", "Kotlin", "Swift", "C++", "C#", "SQL", "PostgreSQL",
  "Supabase", "MySQL", "MongoDB", "Redis", "GraphQL", "REST", "Docker",
  "Kubernetes", "Terraform", "AWS", "GCP", "Azure", "Vercel", "CI/CD", "Git",
  "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "LLM",
  "Prompt Engineering", "RAG", "PyTorch", "TensorFlow", "Data Engineering",
  "Data Analysis", "Pandas", "Spark", "Airflow", "dbt", "Tableau", "Power BI",
  "Figma", "UI Design", "UX Research", "Product Management", "Agile", "Scrum",
  "SEO", "Content Marketing", "Growth Marketing", "Copywriting", "Sales",
  "Account Management", "Customer Success", "Recruitment", "HR",
  "Project Management", "Accounting", "Financial Modelling", "Excel",
  "Nursing", "General Practice", "Patient Care", "Teaching", "Legal Research",
  "React Native", "Flutter", "iOS", "Android", "Security", "DevOps",
  "Solidity", "Unity", "Embedded Systems", "Linux", "Networking",
] as const;
