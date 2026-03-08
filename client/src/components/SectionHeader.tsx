interface SectionHeaderProps {
  text: string;
}

export function SectionHeader({ text }: SectionHeaderProps) {
  return <h3 className="font-semibold text-lg mt-6 mb-2">{text.replace(/[:：]\s*$/, "")}</h3>;
}
