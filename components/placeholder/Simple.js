import Shell from "@/components/Shell";
import { Title } from "@/components/ui/Title";
import "@/components/ui/ui.css";
import "./placeholder.css";

// Simple "Coming Soon" placeholder page used for Reports and Settings
export default function Simple({ title }) {
  return (
    <Shell>
      <Title
        title={title}
        desc={`${title} workspace and insights.`}
      />

      <section className="card empty">
        <div>▤</div>
        <h2>{title} is coming soon</h2>
        <p>This workspace is ready for your next phase of development.</p>
      </section>
    </Shell>
  );
}
