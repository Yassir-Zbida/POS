export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`p-3 sm:p-4 md:p-6 ${className ?? ""}`}>
      {children}
    </section>
  );
}
