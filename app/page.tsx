import ButlerConfigForm from "@/components/shared/ButlerConfigForm";
import Header from "@/components/shared/Header";
import Sidebar from "@/components/shared/Sidebar";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full bg-[var(--st-bg)] font-sans text-[var(--st-text)]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        {/* <main className="flex flex-1 items-start justify-center p-8">
          <ButlerConfigForm />
        </main> */}
      </div>
    </div>
  );
}
