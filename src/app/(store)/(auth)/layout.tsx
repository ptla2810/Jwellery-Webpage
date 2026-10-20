export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-x flex justify-center py-14 md:py-20">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
